import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const client = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
)

export async function GET() {
  const { data, error } = await client
    .from("categories")
    .select("*")
    .eq("active", true)
    .order("sort_order")
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [], {
    headers: {
      "Cache-Control": "public, max-age=300, s-maxage=600, stale-while-revalidate=86400",
    },
  })
}
