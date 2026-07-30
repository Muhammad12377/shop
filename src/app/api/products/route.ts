import { NextRequest, NextResponse } from "next/server"
import { createServerSupabase } from "@/lib/supabase/server"
import type { ApiResponse } from "@/types"

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabase()

  const { searchParams } = new URL(request.url)
  const category = searchParams.get("category")
  const search = searchParams.get("search")
  const sort = searchParams.get("sort") || "newest"
  const featured = searchParams.get("featured")

  let query = supabase
    .from("products")
    .select("*, category:categories(*)")
    .eq("active", true)

  if (category) {
    query = query.eq("category.slug", category)
  }

  if (search) {
    query = query.or(`name_en.ilike.%${search}%,name_ar.ilike.%${search}%`)
  }

  if (featured === "true") {
    query = query.eq("featured", true)
  }

  if (sort === "price-asc") query = query.order("price", { ascending: true })
  else if (sort === "price-desc") query = query.order("price", { ascending: false })
  else query = query.order("created_at", { ascending: false })

  const { data, error } = await query

  if (error) return NextResponse.json({ success: false, error: error.message } satisfies ApiResponse, { status: 500 })
  return NextResponse.json({ success: true, data } satisfies ApiResponse)
}
