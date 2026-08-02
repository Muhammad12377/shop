import { NextResponse } from "next/server"
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth"

export async function POST(req: Request) {
  try {
    const { supabase } = await requireAdmin()

    const body = await req.json()
    if (!body.country_id) return NextResponse.json({ error: "country_id is required" }, { status: 400 })

    const { data, error } = await supabase
      .from("shipping_zones")
      .insert({
        country_id: body.country_id,
        name_en: body.name_en,
        name_ar: body.name_ar,
        price: Number(body.price) || 0,
        active: body.active ?? true,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (e) {
    if (e instanceof AdminAuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}