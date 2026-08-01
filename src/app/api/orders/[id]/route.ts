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

    const { data: profile } = await supabase.from("profiles").select("blocked").eq("id", user.id).single()
    if (profile?.blocked) {
      await supabase.auth.signOut()
      return NextResponse.json({ success: false, error: "Your account is blocked" } satisfies ApiResponse, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const reason = typeof body.reason === "string" ? body.reason.trim() : ""

    const { data, error } = await supabase.rpc("cancel_order", {
      p_order_id: id,
      p_reason: reason || null,
    })

    if (error) {
      const status = /Unauthorized|Forbidden|not found|Only pending/i.test(error.message) ? 400 : 500
      return NextResponse.json({ success: false, error: error.message } satisfies ApiResponse, { status })
    }

    if (data !== true) {
      return NextResponse.json({ success: false, error: "Cancellation failed" } satisfies ApiResponse, { status: 400 })
    }

    await notifyAdmin({ type: "order_cancelled", id, cancelled_by: "customer", reason: reason || null })

    return NextResponse.json({ success: true } satisfies ApiResponse)
  } catch {
    return NextResponse.json({ success: false, error: "Internal error" } satisfies ApiResponse, { status: 500 })
  }
}
