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
    .from("profiles")
    .select("*")
    .eq("id", auth.user.id)
    .single()

  if (error) return NextResponse.json({ success: false, error: error.message } satisfies ApiResponse, { status: 500 })
  return NextResponse.json({ success: true, data } satisfies ApiResponse)
}

export async function PUT(request: NextRequest) {
  const auth = await requireAuth()
  if (!auth) return NextResponse.json({ success: false, error: "Unauthorized" } satisfies ApiResponse, { status: 401 })

  const body = await request.json()

  const allowedFields: Record<string, any> = {}
  if (body.full_name !== undefined) allowedFields.full_name = body.full_name
  if (body.phone !== undefined) allowedFields.phone = body.phone
  if (body.address !== undefined) allowedFields.address = body.address
  if (body.city !== undefined) allowedFields.city = body.city
  if (body.avatar_url !== undefined) allowedFields.avatar_url = body.avatar_url

  if (Object.keys(allowedFields).length === 0) {
    return NextResponse.json({ success: false, error: "No valid fields to update" } satisfies ApiResponse, { status: 400 })
  }

  const maxLen: Record<string, number> = { full_name: 80, phone: 30, address: 500, city: 120 }
  for (const key of Object.keys(maxLen)) {
    if (allowedFields[key] !== undefined && typeof allowedFields[key] === "string" && allowedFields[key].length > maxLen[key]) {
      return NextResponse.json({ success: false, error: `${key} is too long` } satisfies ApiResponse, { status: 400 })
    }
  }

  if (allowedFields.avatar_url !== undefined) {
    const avatar = typeof allowedFields.avatar_url === "string" ? allowedFields.avatar_url.trim() : ""
    if (avatar && !/^https?:\/\//i.test(avatar)) {
      return NextResponse.json({ success: false, error: "avatar_url must be a valid http(s) URL" } satisfies ApiResponse, { status: 400 })
    }
    allowedFields.avatar_url = avatar
  }

  if (typeof allowedFields.full_name === "string" && allowedFields.full_name.trim()) {
    const name = allowedFields.full_name.trim()
    const escaped = name.replace(/[\\%_]/g, (m) => `\\${m}`)
    const { data: duplicate } = await auth.supabase
      .from("profiles")
      .select("id")
      .ilike("full_name", escaped)
      .neq("id", auth.user.id)
      .limit(1)
    if (duplicate && duplicate.length > 0) {
      return NextResponse.json(
        { success: false, error: "This name is already used by another account", code: "name_taken" } satisfies ApiResponse,
        { status: 400 }
      )
    }
    allowedFields.full_name = name
  }

  const { data, error } = await auth.supabase
    .from("profiles")
    .update(allowedFields)
    .eq("id", auth.user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ success: false, error: error.message } satisfies ApiResponse, { status: 500 })
  return NextResponse.json({ success: true, data } satisfies ApiResponse)
}
