import { NextResponse } from "next/server"
import { createServerSupabase } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createServerSupabase()
    const { data: countries, error: cErr } = await supabase
      .from("shipping_countries")
      .select("*")
      .eq("active", true)
      .order("name_en")

    if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 })

    if (countries && countries.length > 0) {
      const ids = countries.map((c) => c.id)
      const { data: zones, error: zErr } = await supabase
        .from("shipping_zones")
        .select("*")
        .in("country_id", ids)
        .eq("active", true)
        .order("name_en")
      if (zErr) return NextResponse.json({ error: zErr.message }, { status: 500 })

      const zonesByCountry: Record<string, any[]> = {}
      for (const z of zones || []) {
        ;(zonesByCountry[z.country_id] ||= []).push(z)
      }
      for (const c of countries) c.zones = zonesByCountry[c.id] || []
    }

    return NextResponse.json(countries || [], {
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=600, stale-while-revalidate=86400",
      },
    })
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
