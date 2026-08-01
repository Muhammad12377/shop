import { NextResponse, type NextRequest } from "next/server"
import { createServerSupabase } from "@/lib/supabase/server"
import { rateLimit, getClientIp } from "@/lib/rate-limit"

const ALLOWED_TYPES: Record<string, string[]> = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
  "image/avif": ["avif"],
  "image/gif": ["gif"],
  "video/mp4": ["mp4"],
  "video/webm": ["webm"],
  "video/quicktime": ["mov"],
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024
const MAX_VIDEO_SIZE = 50 * 1024 * 1024

function sniffFileType(bytes: Uint8Array, declaredExt: string): boolean {
  const ascii = (s: string, off: number) => {
    for (let i = 0; i < s.length; i++) {
      if (bytes[off + i] !== s.charCodeAt(i)) return false
    }
    return true
  }
  const ext = declaredExt.toLowerCase()
  if (ext === "jpg" || ext === "jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  if (ext === "png") {
    return (
      bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
      bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
    )
  }
  if (ext === "gif") return ascii("GIF8", 0)
  if (ext === "webp") return ascii("RIFF", 0) && ascii("WEBP", 8)
  if (ext === "mp4" || ext === "mov" || ext === "avif") {
    const size = (bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]
    return size >= 8 && ascii("ftyp", 4) && bytes[8] === 0
  }
  if (ext === "webm") return bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3
  return true
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req)
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
      return NextResponse.json(
        { error: "Only images (jpg, png, webp, avif, gif) or videos (mp4, webm, mov) are allowed" },
        { status: 415 }
      )
    }

    const isVideo = type.startsWith("video/")
    const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: isVideo ? "File too large, maximum video size is 50MB" : "File too large, maximum image size is 5MB" },
        { status: 413 }
      )
    }

    const head = new Uint8Array(await file.slice(0, 64).arrayBuffer())
    if (!sniffFileType(head, ext)) {
      return NextResponse.json(
        { error: "File content does not match its extension" },
        { status: 415 }
      )
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
