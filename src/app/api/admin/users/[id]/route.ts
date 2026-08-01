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
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
