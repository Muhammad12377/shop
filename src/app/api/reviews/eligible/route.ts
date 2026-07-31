import { NextRequest, NextResponse } from "next/server"
import { createServerSupabase } from "@/lib/supabase/server"

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabase()
    const product_id = new URL(req.url).searchParams.get("product_id")
    if (!product_id) return NextResponse.json({ success: false, error: "Missing product_id" }, { status: 400 })

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ success: true, loggedIn: false, canReview: false, alreadyReviewed: false, delivered: false })
    }

    const { data: existing } = await supabase
      .from("reviews")
      .select("id")
      .eq("user_id", user.id)
      .eq("product_id", product_id)
      .maybeSingle()

    const { data: deliveredOrders } = await supabase
      .from("orders")
      .select("items")
      .eq("user_id", user.id)
      .eq("status", "delivered")

    let delivered = false
    for (const o of deliveredOrders || []) {
      for (const it of o.items || []) {
        if (it?.product_id === product_id) {
          delivered = true
          break
        }
      }
      if (delivered) break
    }

    return NextResponse.json({
      success: true,
      loggedIn: true,
      canReview: delivered && !existing,
      alreadyReviewed: !!existing,
      delivered,
    })
  } catch {
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 })
  }
}
