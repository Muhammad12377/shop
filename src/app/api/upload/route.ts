import { NextResponse } from "next/server"
import { createServerSupabase } from "@/lib/supabase/server"
import { rateLimit } from "@/lib/rate-limit"

const ALLOWED_TYPES: Record<string, string[]> = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
  "image/avif": ["avif"],
  "image/gif": ["gif"],
}

const MAX_SIZE = 5 * 1024 * 1024

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
    const limited = rateLimit(ip, "upload", 20, 60)
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

    const type = file.type.toLowerCase()
    const ext = file.name.split(".").pop()?.toLowerCase() || ""
    if (!ALLOWED_TYPES[type] || !ALLOWED_TYPES[type].includes(ext)) {
      return NextResponse.json({ error: "Only image files are allowed (jpg, png, webp, avif, gif)" }, { status: 415 })
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File too large, maximum size is 5MB" }, { status: 413 })
    }

    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

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
