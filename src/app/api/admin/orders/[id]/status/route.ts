import { NextResponse } from "next/server"
import { createServerSupabase } from "@/lib/supabase/server"

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

    const { error: updateError } = await supabase
      .from("orders")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

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
