import { NextRequest, NextResponse } from "next/server"
import { createServerSupabase } from "@/lib/supabase/server"
import type { ApiResponse } from "@/types"

async function requireAuth() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return { supabase, user }
}

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabase()

  const { searchParams } = new URL(request.url)
  const product_id = searchParams.get("product_id")

  if (!product_id) {
    return NextResponse.json({ success: false, error: "Missing product_id" } satisfies ApiResponse, { status: 400 })
  }

  const { data, error } = await supabase
    .from("reviews")
    .select("*, user:profiles(full_name, avatar_url)")
    .eq("product_id", product_id)
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ success: false, error: error.message } satisfies ApiResponse, { status: 500 })
  return NextResponse.json({ success: true, data } satisfies ApiResponse)
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth()
  if (!auth) return NextResponse.json({ success: false, error: "Unauthorized" } satisfies ApiResponse, { status: 401 })

  const body = await request.json()

  if (!body.product_id || !body.rating) {
    return NextResponse.json({ success: false, error: "Missing product_id or rating" } satisfies ApiResponse, { status: 400 })
  }

  const { data: existing } = await auth.supabase
    .from("reviews")
    .select("id")
    .eq("user_id", auth.user.id)
    .eq("product_id", body.product_id)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ success: false, error: "You have already reviewed this product" } satisfies ApiResponse, { status: 409 })
  }

  const { data, error } = await auth.supabase
    .from("reviews")
    .insert({ user_id: auth.user.id, product_id: body.product_id, rating: body.rating, comment: body.comment || null })
    .select("*, user:profiles(full_name, avatar_url)")
    .single()

  if (error) return NextResponse.json({ success: false, error: error.message } satisfies ApiResponse, { status: 500 })
  return NextResponse.json({ success: true, data } satisfies ApiResponse)
}
