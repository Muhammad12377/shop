import { NextRequest, NextResponse } from "next/server"
import { createServerSupabase } from "@/lib/supabase/server"
import { rateLimit, getClientIp } from "@/lib/rate-limit"
import type { ApiResponse } from "@/types"

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const limited = rateLimit(ip, "coupons", 30, 60)
  if (!limited.allowed) {
    return NextResponse.json({ success: false, error: "Too many requests, try again later" } satisfies ApiResponse, { status: 429 })
  }

  const supabase = await createServerSupabase()
  const body = await request.json()

  if (!body.code || body.total == null) {
    return NextResponse.json({ success: false, error: "Missing code or total" } satisfies ApiResponse, { status: 400 })
  }

  const { data: coupon, error } = await supabase
    .from("coupons")
    .select("*")
    .eq("code", body.code.toUpperCase())
    .single()

  if (error || !coupon) {
    return NextResponse.json({ success: false, error: "Coupon not found" } satisfies ApiResponse, { status: 404 })
  }

  if (!coupon.active) {
    return NextResponse.json({ success: false, error: "Coupon is inactive" } satisfies ApiResponse, { status: 400 })
  }

  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    return NextResponse.json({ success: false, error: "Coupon has expired" } satisfies ApiResponse, { status: 400 })
  }

  if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
    return NextResponse.json({ success: false, error: "Coupon usage limit reached" } satisfies ApiResponse, { status: 400 })
  }

  if (Number(body.total) < Number(coupon.min_order)) {
    return NextResponse.json({ success: false, error: `Minimum order amount is ${coupon.min_order}` } satisfies ApiResponse, { status: 400 })
  }

  let discount_amount = 0
  if (coupon.discount_type === "percentage") {
    discount_amount = (Number(body.total) * Number(coupon.discount_value)) / 100
  } else {
    discount_amount = Number(coupon.discount_value)
  }

  return NextResponse.json({
    success: true,
    data: {
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: Number(coupon.discount_value),
      min_order: Number(coupon.min_order),
      discount_amount: Math.min(discount_amount, Number(body.total)),
    },
  } satisfies ApiResponse)
}
