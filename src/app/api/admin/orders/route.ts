import { NextResponse } from "next/server"
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth"

export async function GET(req: Request) {
  try {
    const { supabase } = await requireAdmin()
    const url = new URL(req.url)
    const status = url.searchParams.get("status")
    const search = url.searchParams.get("search")
    const from = url.searchParams.get("from")
    const to = url.searchParams.get("to")

    let query = supabase.from("orders").select("*").order("created_at", { ascending: false })

    if (status && status !== "all") {
      query = query.eq("status", status)
    }

    if (from) {
      query = query.gte("created_at", `${from}T00:00:00`)
    }
    if (to) {
      query = query.lte("created_at", `${to}T23:59:59.999`)
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
  } catch (e) {
    if (e instanceof AdminAuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
