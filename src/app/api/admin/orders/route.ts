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

    let query = supabase.from("orders").select("*, items:order_items(*)").order("created_at", { ascending: false })

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

    return NextResponse.json(results)
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
