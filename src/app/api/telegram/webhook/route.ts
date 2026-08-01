import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { formatMoney } from "@/lib/telegram"

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const CHAT_ID = process.env.TELEGRAM_CHAT_ID

let cachedCurrency: string | null = null

async function getCurrency(): Promise<string> {
  if (cachedCurrency) return cachedCurrency
  try {
    const supabase = createAdminClient()
    const { data } = await supabase.from("settings").select("value").eq("key", "currency").maybeSingle()
    cachedCurrency = (data?.value as string) || "USD"
  } catch {
    cachedCurrency = "USD"
  }
  return cachedCurrency
}

const STATUS_AR: Record<string, string> = {
  pending: "قيد الانتظار",
  confirmed: "مؤكد",
  shipped: "تم الشحن",
  delivered: "تم التسليم",
  cancelled: "ملغي",
  fake: "كاذب",
}

function escapeHtml(s: string | null | undefined): string {
  return (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

async function reply(text: string): Promise<void> {
  if (!BOT_TOKEN || !CHAT_ID) return
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: "HTML", disable_web_page_preview: true }),
    })
  } catch (err) {
    console.error("telegram reply failed:", err)
  }
}

const HELP = `<b>أوامر البوت</b>
/pending - الطلبات المعلقة
/stock - الكمية الإجمالية للمخزون
/stats - إحصائيات عامة
/help - قائمة الأوامر

يمكنك أيضًا كتابة السؤال مباشرة مثل: كم عدد الطلبات المعلقة؟`

async function cmdPending(): Promise<string> {
  const supabase = createAdminClient()
  const currency = await getCurrency()
  const { data, error } = await supabase
    .from("orders")
    .select("id, total, full_name, created_at, items")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(20)
  if (error) return `خطأ في جلب الطلبات: ${escapeHtml(error.message)}`
  const count = data?.length || 0
  if (count === 0) return "✅ لا توجد طلبات معلقة"
  const total = (data || []).reduce((a, o) => a + Number(o.total), 0)
  const lines = [
    `📋 <b>الطلبات المعلقة: ${count}</b>`,
    `💰 إجمالي القيمة: ${formatMoney(total, currency)}`,
    "",
  ]
  for (const o of data || []) {
    const items = (o.items || []).length
    lines.push(
      `🆔 <a href="https://shop-two-steel.vercel.app/en/admin/orders">#${o.id.slice(0, 8)}</a> - ${escapeHtml(o.full_name)} - ${formatMoney(o.total, currency)} - ${items} منتج - ${new Date(o.created_at).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}`
    )
  }
  return lines.join("\n")
}

async function cmdStock(): Promise<string> {
  const supabase = createAdminClient()
  const { data, error } = await supabase.from("products").select("stock, size_stock")
  if (error) return `خطأ في جلب المخزون: ${escapeHtml(error.message)}`
  const products = data || []
  let totalUnits = 0
  let active = 0
  for (const p of products) {
    const ss = p.size_stock as Record<string, number> | null
    if (ss && Object.keys(ss).length > 0) {
      totalUnits += Object.values(ss).reduce((a: number, b: any) => a + (Number(b) || 0), 0)
    } else {
      totalUnits += Number(p.stock) || 0
    }
    if (Number(p.stock) > 0 || (ss && Object.values(ss).some((v: any) => Number(v) > 0))) active++
  }
  return `📦 <b>الكمية الإجمالية للمخزون</b>\nإجمالي القطع: <b>${totalUnits}</b>\nمنتجات متوفرة: ${active} من ${products.length}`
}

async function cmdStats(): Promise<string> {
  const supabase = createAdminClient()
  const currency = await getCurrency()
  const { data: orders, error } = await supabase.from("orders").select("id, status, total, created_at")
  if (error) return `خطأ في جلب الإحصائيات: ${escapeHtml(error.message)}`
  const list = orders || []
  const countBy = (s: string) => list.filter((o) => o.status === s).length
  const revenue = list
    .filter((o) => ["confirmed", "shipped", "delivered"].includes(o.status))
    .reduce((a, o) => a + Number(o.total), 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayCount = list.filter((o) => new Date(o.created_at) >= today).length

  return [
    "📊 <b>إحصائيات المتجر</b>",
    `إجمالي الطلبات: ${list.length}`,
    `طلبات اليوم: ${todayCount}`,
    `معلقة: ${countBy("pending")} | مؤكدة: ${countBy("confirmed")}`,
    `تم الشحن: ${countBy("shipped")} | تم التسليم: ${countBy("delivered")}`,
    `ملغية: ${countBy("cancelled")} | كاذبة: ${countBy("fake")}`,
    `💰 الإيرادات (مؤكد+شحن+تسليم): ${formatMoney(revenue, currency)}`,
  ].join("\n")
}

function matchCommand(text: string): string | null {
  const t = text.trim().toLowerCase()
  if (/^\/start|^\/help/.test(t) || t.includes("مساعدة") || t.includes("الأوامر")) return "help"
  if (/^\/pending|طلبات.*معلق|معلق.*طلبات|الطلبات المعلقة/.test(t)) return "pending"
  if (/^\/stock|كمية|المخزون|إجمالي.*كمية|الكمية الإجمالية/.test(t)) return "stock"
  if (/^\/stats|إحصائيات|إحصاءات/.test(t)) return "stats"
  return null
}

export async function POST(req: NextRequest) {
  try {
    const secret = req.headers.get("x-telegram-bot-api-secret-token")
    const expected = process.env.TELEGRAM_WEBHOOK_SECRET
    if (!expected || secret !== expected) {
      return NextResponse.json({ ok: false }, { status: 403 })
    }

    const update = await req.json().catch(() => null)
    const message = update?.message || update?.edited_message || update?.channel_post
    if (!message || !message.text || typeof message.text !== "string") {
      return NextResponse.json({ ok: true })
    }

    const chatId = message.chat?.id?.toString()
    if (!CHAT_ID || chatId !== CHAT_ID) {
      return NextResponse.json({ ok: true })
    }

    const cmd = matchCommand(message.text)
    let response = ""
    if (cmd === "pending") response = await cmdPending()
    else if (cmd === "stock") response = await cmdStock()
    else if (cmd === "stats") response = await cmdStats()
    else response = HELP

    await reply(response)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true })
  }
}
