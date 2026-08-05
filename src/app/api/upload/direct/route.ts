import { NextResponse, type NextRequest } from "next/server"
import { createServerSupabase } from "@/lib/supabase/server"
import { rateLimit, getClientIp } from "@/lib/rate-limit"
import { validateUploadType, maxSizeFor, sizeErrorFor } from "@/lib/uploads"

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    const limited = await rateLimit(ip, "upload-direct", 20, 60)
    if (!limited.allowed) {
      return NextResponse.json({ error: "Too many requests, try again later" }, { status: 429 })
    }

    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
    if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const body = await req.json().catch(() => null)
    const name = typeof body?.name === "string" ? body.name : ""
    const size = typeof body?.size === "number" ? body.size : 0
    const type = typeof body?.type === "string" ? body.type : ""

    const check = validateUploadType(type, name)
    if (!check.ok || check.ext === undefined || check.isVideo === undefined) {
      return NextResponse.json({ error: check.error ?? "Invalid file type" }, { status: 415 })
    }

    if (size <= 0 || size > maxSizeFor(check.isVideo)) {
      return NextResponse.json({ error: sizeErrorFor(check.isVideo) }, { status: 413 })
    }

    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${check.ext}`
    const { data, error } = await supabase.storage
      .from("products")
      .createSignedUploadUrl(fileName)

    if (error || !data?.signedUrl) {
      return NextResponse.json(
        { error: error?.message ?? "Failed to create upload URL" },
        { status: 500 }
      )
    }

    return NextResponse.json({ signedUrl: data.signedUrl, path: data.path })
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
