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
    .from("addresses")
    .select("*")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ success: false, error: error.message } satisfies ApiResponse, { status: 500 })
  return NextResponse.json({ success: true, data } satisfies ApiResponse)
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth()
  if (!auth) return NextResponse.json({ success: false, error: "Unauthorized" } satisfies ApiResponse, { status: 401 })

  const body = await request.json()

  if (!body.full_name || !body.phone || !body.address || !body.city) {
    return NextResponse.json({ success: false, error: "Missing required fields" } satisfies ApiResponse, { status: 400 })
  }

  if (body.is_default) {
    await auth.supabase.from("addresses").update({ is_default: false }).eq("user_id", auth.user.id)
  }

  const { data, error } = await auth.supabase
    .from("addresses")
    .insert({ user_id: auth.user.id, label: body.label || null, full_name: body.full_name, phone: body.phone, address: body.address, city: body.city, is_default: body.is_default ?? false })
    .select()
    .single()

  if (error) return NextResponse.json({ success: false, error: error.message } satisfies ApiResponse, { status: 500 })
  return NextResponse.json({ success: true, data } satisfies ApiResponse)
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAuth()
  if (!auth) return NextResponse.json({ success: false, error: "Unauthorized" } satisfies ApiResponse, { status: 401 })

  const body = await request.json()

  if (!body.id) {
    return NextResponse.json({ success: false, error: "Missing id" } satisfies ApiResponse, { status: 400 })
  }

  const { error } = await auth.supabase
    .from("addresses")
    .delete()
    .eq("id", body.id)
    .eq("user_id", auth.user.id)

  if (error) return NextResponse.json({ success: false, error: error.message } satisfies ApiResponse, { status: 500 })
  return NextResponse.json({ success: true, data: null } satisfies ApiResponse)
}
