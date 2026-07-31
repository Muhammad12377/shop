const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const CHAT_ID = process.env.TELEGRAM_CHAT_ID

const STATUS_AR: Record<string, string> = {
  pending: "قيد الانتظار",
  confirmed: "مؤكد",
  shipped: "تم الشحن",
  delivered: "تم التسليم",
  cancelled: "ملغي",
}

function escapeHtml(s: string | null | undefined): string {
  return (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

export type TelegramEvent =
  | {
      type: "new_order"
      id: string
      full_name?: string | null
      phone?: string | null
      total?: number
      items?: any[]
      address?: string | null
      city?: string | null
      shipping_country?: string | null
      shipping_zone?: string | null
      notes?: string | null
    }
  | { type: "order_status"; id: string; status: string }
  | { type: "order_cancelled"; id: string }
  | { type: "new_user"; email: string; name?: string | null }
  | { type: "new_review"; product: string; rating: number; comment?: string | null; user?: string | null }
  | { type: "low_stock"; product: string; stock: number }

export function formatTelegramMessage(ev: TelegramEvent): string {
  switch (ev.type) {
    case "new_order": {
      const items = (ev.items || [])
        .map((i) => `${escapeHtml(i?.product_name || i?.name_ar || i?.name_en || i?.product_id)}${i?.size ? ` (${escapeHtml(i.size)})` : ""} ×${i?.quantity ?? 1}`)
        .join("، ")
      const total = typeof ev.total === "number" ? ev.total.toLocaleString("en-US") : ""
      const lines = [
        "🛒 <b>طلب جديد!</b>",
        `🆔 #${ev.id}`,
        ev.full_name ? `👤 ${escapeHtml(ev.full_name)}` : null,
        ev.phone ? `📞 ${escapeHtml(ev.phone)}` : null,
        total ? `💰 <b>${total} ل.س</b>` : null,
        ev.shipping_country ? `🌍 ${escapeHtml(ev.shipping_country)}${ev.shipping_zone ? " / " + escapeHtml(ev.shipping_zone) : ""}` : null,
        ev.city ? `🏙 ${escapeHtml(ev.city)}` : null,
        ev.address ? `📍 ${escapeHtml(ev.address)}` : null,
        ev.notes ? `📝 ${escapeHtml(ev.notes)}` : null,
        ...(items ? ["", `📦 ${items}`] : []),
      ]
      return lines.filter(Boolean).join("\n")
    }
    case "order_status":
      return `📦 تحديث حالة الطلب #${ev.id}\nالحالة الجديدة: <b>${STATUS_AR[ev.status] || escapeHtml(ev.status)}</b>`
    case "order_cancelled":
      return `❌ ألغى العميل الطلب #${ev.id}`
    case "new_user":
      return `👤 <b>مستخدم جديد</b>\n${ev.name ? `الاسم: ${escapeHtml(ev.name)}\n` : ""}البريد: ${escapeHtml(ev.email)}`
    case "new_review":
      return `⭐ <b>مراجعة جديدة</b>\nالمنتج: ${escapeHtml(ev.product)}\nالتقييم: ${"⭐".repeat(Math.min(5, Math.max(1, ev.rating)))}\n${ev.user ? `بواسطة: ${escapeHtml(ev.user)}\n` : ""}${ev.comment ? `التعليق: ${escapeHtml(ev.comment)}` : ""}`
    case "low_stock":
      return `⚠️ <b>تنبيه مخزون منخفض</b>\n${escapeHtml(ev.product)}\nالمتبقي: ${ev.stock}`
  }
}

export async function sendTelegram(message: string): Promise<void> {
  if (!BOT_TOKEN || !CHAT_ID) return
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: CHAT_ID, text: message, parse_mode: "HTML" }),
    })
  } catch (err) {
    console.error("telegram send failed:", err)
  }
}

export async function notifyAdmin(ev: TelegramEvent): Promise<void> {
  await sendTelegram(formatTelegramMessage(ev))
}
