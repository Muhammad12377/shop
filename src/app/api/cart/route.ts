import { NextRequest, NextResponse } from "next/server"
import { createServerSupabase } from "@/lib/supabase/server"
import type { ApiResponse } from "@/types"

async function requireAuth() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return { supabase, user }
}

function toClientItem(row: any) {
  const product = row.product
  return {
    id: row.id,
    product_id: row.product_id,
    name_en: product?.name_en || "",
    name_ar: product?.name_ar || "",
    price: product ? Number(product.price) : 0,
    image: product?.images?.[0] || "",
    size: row.size,
    color: row.color,
    quantity: row.quantity,
    stock: Number(product?.size_stock?.[row.size] ?? product?.stock ?? 0),
    slug: product?.slug || "",
  }
}

export async function GET() {
  const auth = await requireAuth()
  if (!auth) return NextResponse.json({ success: false, error: "Unauthorized" } satisfies ApiResponse, { status: 401 })

  const { data, error } = await auth.supabase
    .from("cart_items")
    .select("*, product:products(*)")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: true })

  if (error) return NextResponse.json({ success: false, error: error.message } satisfies ApiResponse, { status: 500 })
  return NextResponse.json({ success: true, data: (data || []).map(toClientItem) } satisfies ApiResponse)
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth()
  if (!auth) return NextResponse.json({ success: false, error: "Unauthorized" } satisfies ApiResponse, { status: 401 })

  const body = await request.json()
  if (!Array.isArray(body?.items)) {
    return NextResponse.json({ success: false, error: "Invalid items" } satisfies ApiResponse, { status: 400 })
  }

  const clean: { product_id: string; size: string | null; color: string | null; quantity: number }[] = []
  for (const it of body.items) {
    if (!it?.product_id) continue
    const quantity = Math.max(1, Math.min(99, Number(it.quantity) || 1))
    clean.push({
      product_id: it.product_id,
      size: it.size ?? null,
      color: it.color ?? null,
      quantity,
    })
  }

  const productIds = [...new Set(clean.map((i) => i.product_id))]
  const { data: products } = await auth.supabase
    .from("products")
    .select("id, stock, size_stock")
    .in("id", productIds)

  const stockMap: Record<string, any> = {}
  for (const p of products || []) stockMap[p.id] = p

  const rows = clean.map((item) => {
    const product = stockMap[item.product_id]
    const maxQty = Number(product?.size_stock?.[item.size ?? ""] ?? product?.stock ?? 0)
    return {
      user_id: auth.user.id,
      product_id: item.product_id,
      size: item.size,
      color: item.color,
      quantity: maxQty > 0 ? Math.min(item.quantity, maxQty) : item.quantity,
    }
  })

  const { error: delError } = await auth.supabase.from("cart_items").delete().eq("user_id", auth.user.id)
  if (delError) return NextResponse.json({ success: false, error: delError.message } satisfies ApiResponse, { status: 500 })

  if (rows.length > 0) {
    const { error: insError } = await auth.supabase.from("cart_items").insert(rows)
    if (insError) return NextResponse.json({ success: false, error: insError.message } satisfies ApiResponse, { status: 500 })
  }

  const { data, error } = await auth.supabase
    .from("cart_items")
    .select("*, product:products(*)")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: true })

  if (error) return NextResponse.json({ success: false, error: error.message } satisfies ApiResponse, { status: 500 })
  return NextResponse.json({ success: true, data: (data || []).map(toClientItem) } satisfies ApiResponse)
}
