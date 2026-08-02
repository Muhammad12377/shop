import { NextResponse } from "next/server"
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth"

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { supabase } = await requireAdmin()

    const body = await req.json()
    const update: Record<string, any> = {}
    if (body.name_en !== undefined) update.name_en = body.name_en
    if (body.name_ar !== undefined) update.name_ar = body.name_ar
    if (body.price !== undefined) update.price = Number(body.price)
    if (body.active !== undefined) update.active = body.active

    const { data, error } = await supabase
      .from("shipping_zones")
      .update(update)
      .eq("id", id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (e) {
    if (e instanceof AdminAuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { supabase } = await requireAdmin()

    const { error } = await supabase.from("shipping_zones").delete().eq("id", id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof AdminAuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}