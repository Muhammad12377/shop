import { NextRequest, NextResponse } from "next/server"
import { createServerSupabase } from "@/lib/supabase/server"
import { notifyAdmin } from "@/lib/telegram"
import type { ApiResponse } from "@/types"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ success: false, error: "Unauthorized" } satisfies ApiResponse, { status: 401 })

    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select("id, status, user_id")
      .eq("id", id)
      .single()

    if (fetchError || !order) {
      return NextResponse.json({ success: false, error: "Order not found" } satisfies ApiResponse, { status: 404 })
    }

    if (order.user_id !== user.id) {
      return NextResponse.json({ success: false, error: "Forbidden" } satisfies ApiResponse, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const reason = typeof body.reason === "string" ? body.reason.trim() : ""

    if (order.status !== "pending") {
      return NextResponse.json({ success: false, error: "Only pending orders can be cancelled" } satisfies ApiResponse, { status: 400 })
    }

    const { error: updateError } = await supabase
      .from("orders")
      .update({
        status: "cancelled",
        cancelled_by: "customer",
        cancel_reason: reason || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)

    if (updateError) return NextResponse.json({ success: false, error: updateError.message } satisfies ApiResponse, { status: 500 })

    await supabase.from("order_status_history").insert({
      order_id: id,
      status: "cancelled",
      note: reason || "Cancelled by customer",
      created_by: user.id,
    })

    await notifyAdmin({ type: "order_cancelled", id, cancelled_by: "customer", reason: reason || null })

    return NextResponse.json({ success: true } satisfies ApiResponse)
  } catch {
    return NextResponse.json({ success: false, error: "Internal error" } satisfies ApiResponse, { status: 500 })
  }
}
