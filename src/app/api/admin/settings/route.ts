import { NextResponse } from "next/server"
import { revalidateTag } from "next/cache"
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth"

export async function GET() {
  try {
    const { supabase } = await requireAdmin()
    const { data, error } = await supabase.from("settings").select("key, value")
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const settings: Record<string, any> = {}
    for (const row of data || []) settings[row.key] = row.value
    return NextResponse.json(settings)
  } catch (e) {
    if (e instanceof AdminAuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const { supabase } = await requireAdmin()
    const body = await req.json()
    const rows = Object.entries(body).map(([key, value]) => ({ key, value }))
    if (rows.length === 0) return NextResponse.json({ error: "Empty settings" }, { status: 400 })

    const { error } = await supabase.from("settings").upsert(rows, { onConflict: "key" })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    revalidateTag("home", "max")
    return NextResponse.json(body)
  } catch (e) {
    if (e instanceof AdminAuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
