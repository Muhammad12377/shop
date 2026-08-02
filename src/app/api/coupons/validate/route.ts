import { NextRequest, NextResponse } from "next/server"
import { createServerSupabase } from "@/lib/supabase/server"
import { rateLimit, getClientIp } from "@/lib/rate-limit"
import type { ApiResponse } from "@/types"

const COUPON_ERRORS: Record<string, string> = {
  missing_code: "Missing code or total",
  not_found: "Coupon not found",
  inactive: "Coupon is inactive",
  expired: "Coupon has expired",
  limit: "Coupon usage limit reached",
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const limited = await rateLimit(ip, "coupons", 30, 60)
  if (!limited.allowed) {
    return NextResponse.json({ success: false, error: "Too many requests, try again later" } satisfies ApiResponse, { status: 429 })
  }

  const supabase = await createServerSupabase()
  const body = await request.json()

  if (!body.code || body.total == null) {
    return NextResponse.json({ success: false, error: "Missing code or total" } satisfies ApiResponse, { status: 400 })
  }

  const { data, error } = await supabase.rpc("validate_coupon", {
    p_code: String(body.code),
    p_subtotal: Number(body.total),
  })

  if (error) {
    return NextResponse.json({ success: false, error: "Coupon validation failed" } satisfies ApiResponse, { status: 500 })
  }

  if (!data?.success) {
    const code = String(data?.error || "not_found")
    const message = COUPON_ERRORS[code] || "Coupon not found"
    const isMinOrder = code === "min_order"
    return NextResponse.json(
      {
        success: false,
        error: isMinOrder ? `Minimum order amount is ${data?.min_order}` : message,
        code,
      } satisfies ApiResponse,
      { status: 400 }
    )
  }

  return NextResponse.json({
    success: true,
    data: {
      code: data.code,
      discount_type: data.discount_type,
      discount_value: Number(data.discount_value),
      min_order: Number(data.min_order),
      discount_amount: Number(data.discount_amount),
    },
  } satisfies ApiResponse)
}