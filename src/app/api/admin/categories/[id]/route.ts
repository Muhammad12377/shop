import { NextResponse } from "next/server"
import { revalidateTag } from "next/cache"
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth"

const CATEGORY_FIELDS = ["name_en", "name_ar", "slug", "image_url", "parent_id", "active", "sort_order"] as const

function pickCategoryFields(body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const f of CATEGORY_FIELDS) {
    if (body[f] !== undefined) out[f] = body[f]
  }
  return out
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { supabase } = await requireAdmin()
    const body = await req.json()
    const { data, error } = await supabase.from("categories").update(pickCategoryFields(body)).eq("id", id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    revalidateTag("home", "max")
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
    const { error } = await supabase.from("categories").delete().eq("id", id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    revalidateTag("home", "max")
    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof AdminAuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
