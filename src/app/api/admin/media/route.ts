import { NextResponse } from "next/server"
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth"

export async function GET() {
  try {
    const { supabase } = await requireAdmin()
    const { data, error } = await supabase.from("media").select("*").order("created_at", { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data || [])
  } catch (e) {
    if (e instanceof AdminAuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { supabase } = await requireAdmin()
    const { id, url } = await req.json()
    if (url) {
      const path = url.split("/").pop()
      if (path) await supabase.storage.from("products").remove([path])
    }
    if (id) {
      const { error } = await supabase.from("media").delete().eq("id", id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof AdminAuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
