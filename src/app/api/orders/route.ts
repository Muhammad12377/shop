import { NextRequest, NextResponse } from "next/server"
import { createServerSupabase } from "@/lib/supabase/server"
import { rateLimit } from "@/lib/rate-limit"
import { notifyAdmin } from "@/lib/telegram"
import type { ApiResponse } from "@/types"

async function requireAuth() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return { supabase, user }
}

export async function GET() {
  const auth = await requireAuth()
  if (!auth) return NextResponse.json({ success: false, error: "Unauthorized" } satisfies ApiResponse, { status: 401 })

  const { data, error } = await auth.supabase
    .from("orders")
    .select("*")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ success: false, error: error.message } satisfies ApiResponse, { status: 500 })
  return NextResponse.json({ success: true, data } satisfies ApiResponse)
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
  const limited = rateLimit(ip, "orders", 5, 60)
  if (!limited.allowed) {
    return NextResponse.json({ success: false, error: "Too many orders, please try again later" } satisfies ApiResponse, { status: 429 })
  }

  const auth = await requireAuth()
  if (!auth) return NextResponse.json({ success: false, error: "Unauthorized" } satisfies ApiResponse, { status: 401 })

  const { data: profile } = await auth.supabase
    .from("profiles")
    .select("blocked")
    .eq("id", auth.user.id)
    .single()
  if (profile?.blocked) {
    return NextResponse.json({ success: false, error: "Your account is blocked" } satisfies ApiResponse, { status: 403 })
  }

  const body = await request.json()

  if (!Array.isArray(body?.items) || body.items.length === 0) {
    return NextResponse.json({ success: false, error: "Missing required fields: items" } satisfies ApiResponse, { status: 400 })
  }

  const sanitizedItems = body.items.map((i: any) => ({
    product_id: i.product_id,
    size: i.size ?? null,
    color: i.color ?? null,
    quantity: Number(i.quantity),
  }))

  const { data: order, error } = await auth.supabase.rpc("create_order", {
    p_full_name: String(body.full_name ?? ""),
    p_phone: String(body.phone ?? ""),
    p_address: String(body.address ?? ""),
    p_city: String(body.city ?? ""),
    p_items: sanitizedItems,
    p_coupon_code: body.coupon_code ? String(body.coupon_code) : null,
    p_country_id: body.country_id || null,
    p_zone_id: body.zone_id || null,
    p_notes: body.notes ? String(body.notes) : null,
  })

  if (error) {
    const status = /blocked|Unauthorized|Forbidden|not found|stock|available|Invalid quantity|Missing required/i.test(error.message) ? 400 : 500
    return NextResponse.json({ success: false, error: error.message } satisfies ApiResponse, { status })
  }

  await notifyAdmin({
    type: "new_order",
    id: order.id,
    full_name: order.full_name,
    phone: order.phone,
    total: order.total,
    items: order.items,
    address: order.address,
    city: order.city,
    shipping_country: order.shipping_country,
    shipping_zone: order.shipping_zone,
    notes: order.notes,
  })

  return NextResponse.json({ success: true, data: order } satisfies ApiResponse)
}
