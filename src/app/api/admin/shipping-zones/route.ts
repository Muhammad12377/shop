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

export async function POST(req: Request) {
  try {
    const supabase = await requireAdmin()
    if (!supabase) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

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
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
