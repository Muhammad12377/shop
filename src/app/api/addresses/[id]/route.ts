import { NextRequest, NextResponse } from "next/server"
import { createServerSupabase } from "@/lib/supabase/server"
import type { ApiResponse } from "@/types"

async function requireAuth() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return { supabase, user }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth()
  if (!auth) return NextResponse.json({ success: false, error: "Unauthorized" } satisfies ApiResponse, { status: 401 })

  const { id } = await params
  const body = await request.json()

  const allowedFields: Record<string, any> = {}
  if (body.label !== undefined) allowedFields.label = body.label
  if (body.full_name !== undefined) allowedFields.full_name = body.full_name
  if (body.phone !== undefined) allowedFields.phone = body.phone
  if (body.address !== undefined) allowedFields.address = body.address
  if (body.city !== undefined) allowedFields.city = body.city
  if (body.is_default !== undefined) allowedFields.is_default = Boolean(body.is_default)

  if (Object.keys(allowedFields).length === 0) {
    return NextResponse.json({ success: false, error: "No valid fields to update" } satisfies ApiResponse, { status: 400 })
  }

  const { data, error } = await auth.supabase
    .from("addresses")
    .update(allowedFields)
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ success: false, error: error.message } satisfies ApiResponse, { status: 500 })
  return NextResponse.json({ success: true, data } satisfies ApiResponse)
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth()
  if (!auth) return NextResponse.json({ success: false, error: "Unauthorized" } satisfies ApiResponse, { status: 401 })

  const { id } = await params

  await auth.supabase.from("addresses").update({ is_default: false }).eq("user_id", auth.user.id)

  const { data, error } = await auth.supabase
    .from("addresses")
    .update({ is_default: true })
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ success: false, error: error.message } satisfies ApiResponse, { status: 500 })
  return NextResponse.json({ success: true, data } satisfies ApiResponse)
}
