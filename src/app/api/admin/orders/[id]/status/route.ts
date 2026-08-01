import { NextResponse } from "next/server"
import { createServerSupabase } from "@/lib/supabase/server"
import { notifyAdmin } from "@/lib/telegram"

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

async function applyCoupon(supabase: any, couponCode: string | null, delta: 1 | -1) {
  if (!couponCode) return
  const { data: coupon } = await supabase
    .from("coupons")
    .select("used_count")
    .eq("code", couponCode)
    .maybeSingle()
  if (!coupon) return
  await supabase
    .from("coupons")
    .update({ used_count: Math.max(0, (Number(coupon.used_count) || 0) + delta) })
    .eq("code", couponCode)
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
      .select("status, items, user_id, coupon_code")
      .eq("id", id)
      .single()

    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 })

    const prev = order.status
    const stocked: Record<string, boolean> = { confirmed: true, shipped: true, delivered: true }
    const movedOut = stocked[prev] === true
    const movedInto = stocked[status] === true

    const updateData: Record<string, any> = { status, updated_at: new Date().toISOString() }
    if (status === "cancelled") {
      updateData.cancelled_by = "admin"
      if (typeof note === "string" && note.trim()) updateData.cancel_reason = note.trim()
    }

    const { error: updateError } = await supabase
      .from("orders")
      .update(updateData)
      .eq("id", id)

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

    if (movedInto && !movedOut) {
      await applyStock(supabase, order.items, -1)
      await applyCoupon(supabase, order.coupon_code, 1)
      const seen = new Set<string>()
      for (const item of order.items || []) {
        if (!item?.product_id || seen.has(item.product_id)) continue
        seen.add(item.product_id)
        const { data: p } = await supabase
          .from("products")
          .select("stock, name_ar, name_en")
          .eq("id", item.product_id)
          .single()
        if (p && Number(p.stock) <= 5) {
          await notifyAdmin({
            type: "low_stock",
            product: p.name_ar || p.name_en || item.product_id,
            stock: Number(p.stock),
          })
        }
      }
    }

    if (movedOut && !movedInto) {
      await applyStock(supabase, order.items, 1)
      await applyCoupon(supabase, order.coupon_code, -1)
    }

    if (note) {
      await supabase.from("order_status_history").insert({
        order_id: id,
        status,
        note,
        created_by: user.id,
      })
    }

    if (status === "fake") {
      const { count } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("user_id", order.user_id)
        .eq("status", "fake")

      if (count && count >= 5) {
        await supabase.from("profiles").update({ blocked: true }).eq("id", order.user_id)
        const { data: bannedProfile } = await supabase
          .from("profiles")
          .select("email")
          .eq("id", order.user_id)
          .single()
        await notifyAdmin({
          type: "user_banned",
          email: bannedProfile?.email || order.user_id,
          orders: count,
        })
      }
    }

    await notifyAdmin({ type: "order_status", id, status })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
