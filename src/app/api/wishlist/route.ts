import { NextRequest, NextResponse } from "next/server"
import { createServerSupabase } from "@/lib/supabase/server"
import type { ApiResponse } from "@/types"

async function requireAuth() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return { supabase, user }
}

export async function GET() {
  const auth = await requireAuth()
  if (!auth) return NextResponse.json({ success: false, error: "Unauthorized" } satisfies ApiResponse, { status: 401 })

  const { data, error } = await auth.supabase
    .from("wishlist")
    .select("*, product:products(*)")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ success: false, error: error.message } satisfies ApiResponse, { status: 500 })
  return NextResponse.json({ success: true, data } satisfies ApiResponse)
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth()
  if (!auth) return NextResponse.json({ success: false, error: "Unauthorized" } satisfies ApiResponse, { status: 401 })

  const body = await request.json()

  if (!body.product_id) {
    return NextResponse.json({ success: false, error: "Missing product_id" } satisfies ApiResponse, { status: 400 })
  }

  const { data: existing } = await auth.supabase
    .from("wishlist")
    .select("*, product:products(*)")
    .eq("user_id", auth.user.id)
    .eq("product_id", body.product_id)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ success: true, data: existing } satisfies ApiResponse)
  }

  const { data, error } = await auth.supabase
    .from("wishlist")
    .insert({ user_id: auth.user.id, product_id: body.product_id })
    .select("*, product:products(*)")
    .single()

  if (error) {
    const code = (error as any)?.code
    if (code === "23505") {
      const { data: re } = await auth.supabase
        .from("wishlist")
        .select("*, product:products(*)")
        .eq("user_id", auth.user.id)
        .eq("product_id", body.product_id)
        .maybeSingle()
      if (re) return NextResponse.json({ success: true, data: re } satisfies ApiResponse)
    }
    return NextResponse.json({ success: false, error: "Failed to add to wishlist" } satisfies ApiResponse, { status: 500 })
  }
  return NextResponse.json({ success: true, data } satisfies ApiResponse)
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAuth()
  if (!auth) return NextResponse.json({ success: false, error: "Unauthorized" } satisfies ApiResponse, { status: 401 })

  const body = await request.json()

  if (!body.product_id) {
    return NextResponse.json({ success: false, error: "Missing product_id" } satisfies ApiResponse, { status: 400 })
  }

  const { error } = await auth.supabase
    .from("wishlist")
    .delete()
    .eq("user_id", auth.user.id)
    .eq("product_id", body.product_id)

  if (error) return NextResponse.json({ success: false, error: error.message } satisfies ApiResponse, { status: 500 })
  return NextResponse.json({ success: true, data: null } satisfies ApiResponse)
}
