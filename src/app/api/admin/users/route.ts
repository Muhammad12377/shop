import { NextResponse } from "next/server"
import { createServerSupabase } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
    if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const admin = createAdminClient()

    const { data: authUsers, error: authError } = await admin.auth.admin.listUsers({ perPage: 1000 })
    if (authError) return NextResponse.json({ error: authError.message }, { status: 500 })

    const verifiedEmails = new Set(
      (authUsers?.users || [])
        .filter((u) => u.email_confirmed_at)
        .map((u) => u.email?.toLowerCase())
        .filter(Boolean)
    )

    const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const users = (data || [])
      .filter((u) => verifiedEmails.has((u.email || "").toLowerCase()))
      .map((u) => ({ ...u, is_me: u.id === user.id, verified: true }))

    return NextResponse.json(users)
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
