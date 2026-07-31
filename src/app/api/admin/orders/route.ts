import { NextResponse } from "next/server"
import { createServerSupabase } from "@/lib/supabase/server"

export async function GET(req: Request) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
    if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const url = new URL(req.url)
    const status = url.searchParams.get("status")
    const search = url.searchParams.get("search")

    let query = supabase.from("orders").select("*").order("created_at", { ascending: false })

    if (status && status !== "all") {
      query = query.eq("status", status)
    }

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    let results = data || []
    if (search) {
      const s = search.toLowerCase()
      results = results.filter(
        (o) => o.id?.toLowerCase().includes(s) || o.full_name?.toLowerCase().includes(s)
      )
    }

    const userIds = [...new Set(results.map((o) => o.user_id).filter(Boolean))]
    const emails: Record<string, string> = {}
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email")
        .in("id", userIds)
      for (const p of profiles || []) emails[p.id] = p.email
    }
    results = results.map((o) => ({ ...o, user_email: emails[o.user_id] || null }))

    return NextResponse.json(results)
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
