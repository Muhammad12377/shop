import { NextResponse, type NextRequest } from "next/server"
import { createServerSupabase } from "@/lib/supabase/server"
import { rateLimit, getClientIp } from "@/lib/rate-limit"
import { validateUploadType, maxSizeFor, sizeErrorFor, sniffFileType } from "@/lib/uploads"

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    const limited = await rateLimit(ip, "upload", 20, 60)
    if (!limited.allowed) {
      return NextResponse.json({ error: "Too many requests, try again later" }, { status: 429 })
    }

    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
    if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const formData = await req.formData()
    const file = formData.get("file") as File
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })

    const check = validateUploadType(file.type, file.name)
    if (!check.ok || check.ext === undefined || check.isVideo === undefined) {
      return NextResponse.json({ error: check.error ?? "Invalid file type" }, { status: 415 })
    }

    if (file.size > maxSizeFor(check.isVideo)) {
      return NextResponse.json({ error: sizeErrorFor(check.isVideo) }, { status: 413 })
    }

    const head = new Uint8Array(await file.slice(0, 64).arrayBuffer())
    if (!sniffFileType(head, check.ext)) {
      return NextResponse.json(
        { error: "File content does not match its extension" },
        { status: 415 }
      )
    }

    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${check.ext}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("products")
      .upload(fileName, file, { cacheControl: "3600", upsert: false })

    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

    const { data: urlData } = supabase.storage.from("products").getPublicUrl(uploadData.path)

    const { data: mediaRecord, error: dbError } = await supabase
      .from("media")
      .insert({ url: urlData.publicUrl, alt: file.name })
      .select()
      .single()

    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

    return NextResponse.json(mediaRecord)
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
