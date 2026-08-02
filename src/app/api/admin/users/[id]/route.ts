import { NextResponse } from "next/server"
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { supabase } = await requireAdmin()
    const body = await req.json()

    if (body.role !== undefined && body.role !== "admin" && body.role !== "user") {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 })
    }
    if (body.blocked !== undefined && typeof body.blocked !== "boolean") {
      return NextResponse.json({ error: "Invalid blocked value" }, { status: 400 })
    }
    if (body.role === undefined && body.blocked === undefined) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
    }

    const { data, error } = await supabase.rpc("admin_set_profile_privileges", {
      target_user: id,
      new_role: body.role ?? null,
      new_blocked: body.blocked ?? null,
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const { data: updated, error: fetchError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .single()

    if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 })
    return NextResponse.json(updated)
  } catch (e) {
    if (e instanceof AdminAuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
