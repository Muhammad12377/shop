import { NextRequest, NextResponse } from "next/server"
import { createServerSupabase } from "@/lib/supabase/server"
import { rateLimit } from "@/lib/rate-limit"
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

  const body = await request.json()

  if (!body.items || !body.items.length || !body.full_name || !body.phone || !body.address || !body.city) {
    return NextResponse.json({ success: false, error: "Missing required fields: items, full_name, phone, address, city" } satisfies ApiResponse, { status: 400 })
  }

  const { data: settings } = await auth.supabase.from("settings").select("key, value")
  const settingsMap: Record<string, string> = {}
  for (const s of settings || []) settingsMap[s.key] = s.value
  const shipping_fee = Number(settingsMap.shipping_fee) || 0
  const free_shipping_min = Number(settingsMap.free_shipping_min) || 0

  const subtotal = body.items.reduce((sum: number, item: any) => sum + Number(item.price) * Number(item.quantity), 0)

  let shipping_country: string | null = null
  let shipping_zone: string | null = null
  let zone_price: number | null = null
  let country_price: number | null = null

  if (body.country_id) {
    const { data: country } = await auth.supabase
      .from("shipping_countries")
      .select("price, name_en, name_ar")
      .eq("id", body.country_id)
      .eq("active", true)
      .single()
    if (country) {
      country_price = Number(country.price)
      shipping_country = country.name_en
    }
    if (body.zone_id) {
      const { data: zone } = await auth.supabase
        .from("shipping_zones")
        .select("price, name_en, name_ar")
        .eq("id", body.zone_id)
        .eq("active", true)
        .single()
      if (zone) {
        zone_price = Number(zone.price)
        shipping_zone = zone.name_en
      }
    }
  }

  let discount = 0
  let coupon_code: string | null = null

  if (body.coupon_code) {
    const { data: coupon } = await auth.supabase
      .from("coupons")
      .select("*")
      .eq("code", body.coupon_code.toUpperCase())
      .single()

    if (coupon && coupon.active && (!coupon.expires_at || new Date(coupon.expires_at) > new Date()) && (!coupon.max_uses || coupon.used_count < coupon.max_uses) && subtotal >= coupon.min_order) {
      coupon_code = coupon.code
      if (coupon.discount_type === "percentage") {
        discount = (subtotal * Number(coupon.discount_value)) / 100
      } else {
        discount = Number(coupon.discount_value)
      }

      await auth.supabase
        .from("coupons")
        .update({ used_count: coupon.used_count + 1 })
        .eq("id", coupon.id)
    }
  }

  const baseFee = zone_price ?? country_price ?? shipping_fee
  const effective_shipping = subtotal >= free_shipping_min ? 0 : baseFee
  const total = Math.max(0, subtotal - discount) + effective_shipping

  const { data: order, error } = await auth.supabase
    .from("orders")
    .insert({
      user_id: auth.user.id,
      status: "pending",
      subtotal,
      shipping_fee: effective_shipping,
      discount,
      coupon_code,
      total,
      full_name: body.full_name,
      phone: body.phone,
      address: body.address,
      city: body.city,
      shipping_country,
      shipping_zone,
      country_id: body.country_id || null,
      zone_id: body.zone_id || null,
      notes: body.notes || null,
      items: body.items,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ success: false, error: error.message } satisfies ApiResponse, { status: 500 })

  await auth.supabase.from("order_status_history").insert({
    order_id: order.id,
    status: "pending",
    created_by: auth.user.id,
  })

  await auth.supabase.from("cart_items").delete().eq("user_id", auth.user.id)

  return NextResponse.json({ success: true, data: order } satisfies ApiResponse)
}
