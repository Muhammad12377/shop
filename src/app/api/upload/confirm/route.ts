import { NextResponse, type NextRequest } from "next/server"
import { createServerSupabase } from "@/lib/supabase/server"
import { rateLimit, getClientIp } from "@/lib/rate-limit"
import { EXT_TYPES } from "@/lib/uploads"

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    const limited = await rateLimit(ip, "upload-confirm", 20, 60)
    if (!limited.allowed) {
      return NextResponse.json({ error: "Too many requests, try again later" }, { status: 429 })
    }

    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
    if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const body = await req.json().catch(() => null)
    const path = typeof body?.path === "string" ? body.path : ""
    const alt = typeof body?.alt === "string" ? body.alt : ""
    if (!path || path.includes("..") || path.startsWith("/")) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 })
    }

    const { data: urlData } = supabase.storage.from("products").getPublicUrl(path)

    const ext = path.split(".").pop()?.toLowerCase() || ""
    const known = EXT_TYPES[ext]
    if (known) {
      const storageBase = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1`
      try {
        const metaRes = await fetch(
          `${storageBase}/object/update/products/${path}`,
          {
            method: "POST",
            headers: {
              apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
              Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              updates: {
                contentType: known.type,
                cacheControl: "3600",
              },
            }),
            cache: "no-store",
          }
        )
        if (!metaRes.ok) console.warn(`[upload] failed to set content type: ${metaRes.status}`)
      } catch (err) {
        console.warn("[upload] content-type update failed", err)
      }
    }

    const { data: mediaRecord, error: dbError } = await supabase
      .from("media")
      .insert({ url: urlData.publicUrl, alt })
      .select()
      .single()

    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

    return NextResponse.json(mediaRecord)
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
