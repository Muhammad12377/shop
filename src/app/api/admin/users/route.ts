import { NextResponse } from "next/server"
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth"
import { fetchVerifiedAuthUsers } from "@/lib/admin-users"

export async function GET() {
  try {
    const { supabase, userId } = await requireAdmin()

    const { providersByEmail } = await fetchVerifiedAuthUsers()

    const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const users = (data || [])
      .filter((u) => providersByEmail.get((u.email || "").toLowerCase()) !== "unverified")
      .map((u) => {
        const provider = providersByEmail.get((u.email || "").toLowerCase()) || "unverified"
        return { ...u, is_me: u.id === userId, verified: true, provider }
      })

    return NextResponse.json(users)
  } catch (e) {
    if (e instanceof AdminAuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
