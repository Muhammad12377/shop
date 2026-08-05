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

  let matchedIds: string[] | null = null
  if (category) {
    const { data: cats } = await supabase.from("categories").select("id, slug, parent_id").eq("active", true)
    const cat = (cats || []).find((c: any) => c.slug === category)
    if (cat) {
      const ids = [cat.id]
      const stack = [cat.id]
      while (stack.length) {
        const cur = stack.pop()!
        for (const c of cats || []) {
          if (c.parent_id === cur && !ids.includes(c.id)) {
            ids.push(c.id)
            stack.push(c.id)
          }
        }
      }
      const { data: catRows } = await supabase
        .from("product_categories")
        .select("product_id")
        .in("category_id", ids)
      matchedIds = Array.from(new Set((catRows || []).map((r: any) => r.product_id)))
    }
  }

  let query = supabase
    .from("products")
    .select("*, category:categories!products_category_id_fkey(*)")
    .eq("active", true)

  if (matchedIds) {
    if (matchedIds.length === 0) return NextResponse.json({ success: true, data: [] } satisfies ApiResponse)
    query = query.in("id", matchedIds)
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

  const response = NextResponse.json({ success: true, data } satisfies ApiResponse, {
    headers: {
      "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=31536000",
    },
  })
  return response
}
