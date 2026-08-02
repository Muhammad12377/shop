import { NextRequest, NextResponse } from "next/server"
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth"
import type { ApiResponse } from "@/types"

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase } = await requireAdmin()
    const { id } = await params
    const { error } = await supabase.from("media").delete().eq("id", id)

    if (error) return NextResponse.json({ success: false, error: error.message } satisfies ApiResponse, { status: 500 })
    return NextResponse.json({ success: true, data: null } satisfies ApiResponse)
  } catch (e) {
    if (e instanceof AdminAuthError) return NextResponse.json({ success: false, error: e.message } satisfies ApiResponse, { status: e.status })
    return NextResponse.json({ success: false, error: "Internal error" } satisfies ApiResponse, { status: 500 })
  }
}