import { NextResponse } from "next/server"
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth"

const COUPON_FIELDS = ["code", "discount_type", "discount_value", "min_order", "max_uses", "expires_at", "active"] as const

function pickCouponFields(body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const f of COUPON_FIELDS) {
    if (body[f] !== undefined) out[f] = body[f]
  }
  if (out.expires_at === "") out.expires_at = null
  return out
}

export async function GET() {
  try {
    const { supabase } = await requireAdmin()

    const { data, error } = await supabase.from("coupons").select("*").order("created_at", { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data || [])
  } catch (e) {
    if (e instanceof AdminAuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { supabase } = await requireAdmin()

    const body = await req.json()
    if (!body?.code) {
      return NextResponse.json({ error: "code is required" }, { status: 400 })
    }
    const { data, error } = await supabase.from("coupons").insert(pickCouponFields(body)).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (e) {
    if (e instanceof AdminAuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
