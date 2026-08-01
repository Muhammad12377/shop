import { NextResponse } from "next/server"
import { createServerSupabase } from "@/lib/supabase/server"
import { fetchVerifiedAuthUsers } from "@/lib/admin-users"

export async function GET() {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
    if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const { providersByEmail } = await fetchVerifiedAuthUsers()

    const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const users = (data || [])
      .filter((u) => providersByEmail.get((u.email || "").toLowerCase()) !== "unverified")
      .map((u) => {
        const provider = providersByEmail.get((u.email || "").toLowerCase()) || "unverified"
        return { ...u, is_me: u.id === user.id, verified: true, provider }
      })

    return NextResponse.json(users)
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
