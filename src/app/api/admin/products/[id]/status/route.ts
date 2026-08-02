import { NextResponse } from "next/server"
import { revalidateTag } from "next/cache"
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { supabase } = await requireAdmin()

    const { active } = await req.json()
    const { data, error } = await supabase
      .from("products")
      .update({ active, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    revalidateTag("home", "max")
    revalidateTag("products", "max")
    return NextResponse.json(data)
  } catch (e) {
    if (e instanceof AdminAuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
