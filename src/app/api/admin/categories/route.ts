import { NextResponse } from "next/server"
import { revalidateTag } from "next/cache"
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth"

export async function GET() {
  try {
    const { supabase } = await requireAdmin()
    const { data, error } = await supabase.from("categories").select("*").order("sort_order", { ascending: true })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data || [])
  } catch (e) {
    if (e instanceof AdminAuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { supabase } = await requireAdmin()
    const body = await req.json()
    const { data, error } = await supabase.from("categories").insert(body).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    revalidateTag("home", "max")
    return NextResponse.json(data)
  } catch (e) {
    if (e instanceof AdminAuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
