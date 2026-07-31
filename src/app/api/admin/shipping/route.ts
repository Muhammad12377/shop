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

export async function GET() {
  try {
    const supabase = await requireAdmin()
    if (!supabase) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const { data: countries, error: cErr } = await supabase
      .from("shipping_countries")
      .select("*")
      .order("created_at", { ascending: true })

    if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 })

    if (countries && countries.length > 0) {
      const ids = countries.map((c) => c.id)
      const { data: zones, error: zErr } = await supabase
        .from("shipping_zones")
        .select("*")
        .in("country_id", ids)
        .order("created_at", { ascending: true })
      if (zErr) return NextResponse.json({ error: zErr.message }, { status: 500 })

      const zonesByCountry: Record<string, any[]> = {}
      for (const z of zones || []) {
        ;(zonesByCountry[z.country_id] ||= []).push(z)
      }
      for (const c of countries) c.zones = zonesByCountry[c.id] || []
    }

    return NextResponse.json(countries || [])
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await requireAdmin()
    if (!supabase) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const body = await req.json()
    const { data, error } = await supabase
      .from("shipping_countries")
      .insert({
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
