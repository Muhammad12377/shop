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
    if (!check.ok) {
      return NextResponse.json({ error: check.error ?? "Invalid file type" }, { status: 415 })
    }
    if (!check.isVideo) {
      return NextResponse.json(
        { error: "Direct upload is reserved for videos" },
        { status: 400 }
      )
    }
    if (size <= 0 || size > maxSizeFor(check.isVideo)) {
      return NextResponse.json({ error: sizeErrorFor(check.isVideo, size) }, { status: 413 })
    }

    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${check.ext}`
    const expiresIn = Math.max(120, Math.min(3600, Math.ceil(size / (256 * 1024)) + 120))

    const storageBase = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1`
    const res = await fetch(`${storageBase}/object/upload/sign/products/${fileName}`, {
      method: "POST",
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ expiresIn, upsert: false }),
      cache: "no-store",
    })

    const signData = await res.json().catch(() => null)
    if (!res.ok || !signData?.url) {
      return NextResponse.json(
        { error: signData?.message ?? "Failed to create upload URL" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      signedUrl: `${storageBase}${signData.url}`,
      path: fileName,
      contentType: check.type,
    })
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
