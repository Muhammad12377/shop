import { NextResponse } from "next/server"
import { createServerSupabase } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
    if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const users = (data || []).map((u) => ({ ...u, is_me: u.id === user.id }))
    return NextResponse.json(users)
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
