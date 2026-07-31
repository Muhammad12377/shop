import { NextResponse } from "next/server"
import { createServerSupabase } from "@/lib/supabase/server"

async function requireAdmin() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "admin") return null
  return supabase
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await requireAdmin()
    if (!supabase) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const body = await req.json()
    const update: Record<string, any> = {}
    if (body.name_en !== undefined) update.name_en = body.name_en
    if (body.name_ar !== undefined) update.name_ar = body.name_ar
    if (body.price !== undefined) update.price = Number(body.price)
    if (body.active !== undefined) update.active = body.active

    const { data, error } = await supabase
      .from("shipping_countries")
      .update(update)
      .eq("id", id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await requireAdmin()
    if (!supabase) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const { error } = await supabase.from("shipping_countries").delete().eq("id", id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
