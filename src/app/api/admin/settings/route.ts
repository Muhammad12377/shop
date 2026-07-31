import { NextResponse } from "next/server"
import { revalidateTag } from "next/cache"
import { createServerSupabase } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
    if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const { data, error } = await supabase.from("settings").select("key, value")
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const settings: Record<string, any> = {}
    for (const row of data || []) settings[row.key] = row.value
    return NextResponse.json(settings)
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
    if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const body = await req.json()
    const rows = Object.entries(body).map(([key, value]) => ({ key, value }))
    if (rows.length === 0) return NextResponse.json({ error: "Empty settings" }, { status: 400 })

    const { error } = await supabase.from("settings").upsert(rows, { onConflict: "key" })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    revalidateTag("home", "max")
    return NextResponse.json(body)
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
