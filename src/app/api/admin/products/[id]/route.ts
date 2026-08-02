import { NextResponse } from "next/server"
import { revalidateTag } from "next/cache"
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth"

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

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { supabase } = await requireAdmin()

    const { category: _category, category_ids: categoryIds, ...rest } = await req.json()
    const body: any = { ...rest }
    if (body.price != null) body.price = Math.round(Math.max(0, Number(body.price)) * 100) / 100
    if (body.compare_price != null) body.compare_price = Math.round(Math.max(0, Number(body.compare_price)) * 100) / 100
    const updateData: Record<string, any> = { ...body, updated_at: new Date().toISOString() }
    if (body.name_en) {
      const baseSlug = body.name_en.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
      updateData.slug = await uniqueSlug(supabase, baseSlug || `product-${id}`, id)
    }
    if (Array.isArray(body.sizes)) {
      const sizeStock: Record<string, number> = { ...(body.size_stock || {}) }
      for (const s of body.sizes) {
        if (!(s in sizeStock)) sizeStock[s] = 0
      }
      updateData.size_stock = sizeStock
      updateData.stock = Object.values(sizeStock).reduce((a, b) => a + (Number(b) || 0), 0)
    }

    const { data, error } = await supabase.from("products").update(updateData).eq("id", id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (Array.isArray(categoryIds)) {
      const ids = categoryIds.filter((c: any) => c)
      await supabase.from("product_categories").delete().eq("product_id", id)
      if (ids.length > 0) {
        await supabase.from("product_categories").insert(ids.map((cid: string) => ({ product_id: id, category_id: cid })))
      }
      await supabase.from("products").update({ category_id: ids[0] || null }).eq("id", id)
    }

    revalidateTag("home", "max")
    revalidateTag("products", "max")
    return NextResponse.json(data)
  } catch (e) {
    if (e instanceof AdminAuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { supabase } = await requireAdmin()
    const { error } = await supabase.from("product_categories").delete().eq("product_id", id)
    if (!error) {
      const { error: delErr } = await supabase.from("products").delete().eq("id", id)
      if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })
    } else {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    revalidateTag("home", "max")
    revalidateTag("products", "max")
    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof AdminAuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
