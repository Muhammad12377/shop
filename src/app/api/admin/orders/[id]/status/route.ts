import { NextResponse } from "next/server"
import { createServerSupabase } from "@/lib/supabase/server"

async function applyStock(supabase: any, items: any[], sign: 1 | -1) {
  for (const item of items || []) {
    if (!item?.product_id) continue
    const { data: product } = await supabase
      .from("products")
      .select("stock, size_stock")
      .eq("id", item.product_id)
      .single()
    if (!product) continue

    const sizeStock = { ...(product.size_stock || {}) }
    let newStock = Number(product.stock) || 0
    const delta = sign * Number(item.quantity)

    if (item.size && sizeStock[item.size] != null) {
      sizeStock[item.size] = Math.max(0, Number(sizeStock[item.size]) + delta)
      newStock = Object.values(sizeStock).reduce((a: number, b: any) => a + (Number(b) || 0), 0)
    } else {
      newStock = Math.max(0, Number(product.stock) + delta)
    }

    await supabase
      .from("products")
      .update({ size_stock: sizeStock, stock: newStock })
      .eq("id", item.product_id)
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
    if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const { status, note } = await req.json()
    if (!status) return NextResponse.json({ error: "Status is required" }, { status: 400 })

    const { data: order } = await supabase
      .from("orders")
      .select("status, items")
      .eq("id", id)
      .single()

    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 })

    const prev = order.status

    const { error: updateError } = await supabase
      .from("orders")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

    if (status === "confirmed" && prev !== "confirmed") {
      await applyStock(supabase, order.items, -1)
    }

    if (status === "cancelled" && prev === "confirmed") {
      await applyStock(supabase, order.items, 1)
    }

    if (note) {
      await supabase.from("order_status_history").insert({
        order_id: id,
        status,
        note,
        created_by: user.id,
      })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
