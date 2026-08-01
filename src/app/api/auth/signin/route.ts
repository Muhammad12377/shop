import { NextRequest, NextResponse } from "next/server"
import { createServerSupabase } from "@/lib/supabase/server"
import { verifyTurnstileToken } from "@/lib/auth"
import { rateLimit, getClientIp } from "@/lib/rate-limit"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : ""
    const password = typeof body?.password === "string" ? body.password : ""
    const captchaToken = typeof body?.captchaToken === "string" ? body.captchaToken : null

    if (!email || !password) {
      return NextResponse.json({ ok: false, error: "Missing email or password" }, { status: 400 })
    }

    if (!email.endsWith("@gmail.com")) {
      return NextResponse.json(
        { ok: false, error: "Only @gmail.com emails are allowed", code: "email_domain" },
        { status: 400 }
      )
    }

    const captcha = await verifyTurnstileToken(captchaToken)
    if (!captcha.ok) {
      return NextResponse.json({ ok: false, error: "captcha_failed", code: captcha.error }, { status: 400 })
    }

    const limited = rateLimit(getClientIp(req), "auth-signin", 10, 60)
    if (!limited.allowed) {
      return NextResponse.json({ ok: false, error: "Too many attempts, try again later" }, { status: 429 })
    }

    const supabase = await createServerSupabase()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 401 })
    }

    if (data.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("blocked")
        .eq("id", data.user.id)
        .single()
      if (profile?.blocked) {
        await supabase.auth.signOut()
        return NextResponse.json({ ok: false, blocked: true, error: "Your account has been blocked" }, { status: 403 })
      }
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 })
  }
}
