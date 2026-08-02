import { NextResponse } from "next/server"
import { revalidateTag } from "next/cache"
import { createServerSupabase } from "@/lib/supabase/server"

async function uniqueSlug(supabase: any, base: string, excludeId?: string) {
  let slug = base
  let i = 2
  for (;;) {
    let query = supabase.from("products").select("id").eq("slug", slug)
    if (excludeId) query = query.neq("id", excludeId)
    const { data } = await query.maybeSingle()
    if (!data) return slug
    slug = `${base}-${i}`
    i += 1
  }
}

export async function GET() {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
    if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const { data, error } = await supabase
      .from("products")
      .select("*, category:categories!products_category_id_fkey(*), product_categories:product_categories(category_id)")
      .order("created_at", { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json((data || []).map((p: any) => ({
      ...p,
      category_ids: (p.product_categories || []).map((pc: any) => pc.category_id),
      product_categories: undefined,
    })))
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
    if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const { category: _category, category_ids: categoryIds, ...rest } = await req.json()
    const body: any = { ...rest }
    if (body.price != null) body.price = Math.round(Math.max(0, Number(body.price)) * 100) / 100
    if (body.compare_price != null) body.compare_price = Math.round(Math.max(0, Number(body.compare_price)) * 100) / 100
    const baseSlug = body.name_en?.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || `product-${Date.now()}`
    const slug = await uniqueSlug(supabase, baseSlug)

    if (Array.isArray(body.sizes)) {
      const sizeStock: Record<string, number> = { ...(body.size_stock || {}) }
      for (const s of body.sizes) {
        if (!(s in sizeStock)) sizeStock[s] = 0
      }
      body.size_stock = sizeStock
      body.stock = Object.values(sizeStock).reduce((a, b) => a + (Number(b) || 0), 0)
    }

    const ids = Array.isArray(categoryIds) ? categoryIds.filter(Boolean) : []
    if (ids.length > 0) body.category_id = ids[0]

    const { data, error } = await supabase
      .from("products")
      .insert({ ...body, slug })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (ids.length > 0) {
      const rows = ids.map((cid: string) => ({ product_id: data.id, category_id: cid }))
      await supabase.from("product_categories").insert(rows).select()
    }

    revalidateTag("home", "max")
    return NextResponse.json({ ...data, category_ids: ids })
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
