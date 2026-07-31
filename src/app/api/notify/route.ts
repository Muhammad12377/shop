import { NextRequest, NextResponse } from "next/server"
import { createServerSupabase } from "@/lib/supabase/server"
import { notifyAdmin } from "@/lib/telegram"

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const body = await req.json()

    if (body?.type === "new_order" && body.order_id) {
      const { data: order } = await supabase
        .from("orders")
        .select("id, total, full_name, phone, address, city, shipping_country, shipping_zone, notes, items, user_id")
        .eq("id", body.order_id)
        .maybeSingle()

      if (order && order.user_id === user.id) {
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
      }
      return NextResponse.json({ success: true })
    }

    if (body?.type === "new_user" && body.email) {
      await notifyAdmin({ type: "new_user", email: body.email, name: body.name || null })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ success: false, error: "Unsupported event" }, { status: 400 })
  } catch {
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 })
  }
}
