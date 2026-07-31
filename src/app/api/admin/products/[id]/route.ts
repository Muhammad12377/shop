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

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
    if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const { category: _category, ...body } = await req.json()
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
    revalidateTag("home", "max")
    revalidateTag("products", "max")
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
    if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const { error } = await supabase.from("products").delete().eq("id", id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    revalidateTag("home", "max")
    revalidateTag("products", "max")
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
