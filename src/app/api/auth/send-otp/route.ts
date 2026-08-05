import { NextRequest, NextResponse } from "next/server"
import { createServerSupabase } from "@/lib/supabase/server"
import { verifyTurnstileToken } from "@/lib/auth"
import { rateLimit, getClientIp } from "@/lib/rate-limit"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : ""
    const mode = body?.mode === "register" || body?.mode === "forgot" ? body.mode : null
    const name = typeof body?.name === "string" ? body.name.trim() : ""
    const captchaToken = typeof body?.captchaToken === "string" ? body.captchaToken : null

    if (!email || !mode) {
      return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 })
    }

    if (!email.endsWith("@gmail.com")) {
      return NextResponse.json(
        { ok: false, error: "Only @gmail.com emails are allowed", code: "email_domain" },
        { status: 400 }
      )
    }

    if (name.length > 80) {
      return NextResponse.json({ ok: false, error: "Name is too long" }, { status: 400 })
    }

    const captcha = await verifyTurnstileToken(captchaToken)
    if (!captcha.ok) {
      return NextResponse.json({ ok: false, error: "captcha_failed", code: captcha.error }, { status: 400 })
    }

    const ip = getClientIp(req)
    const ipLimited = await rateLimit(ip, `auth-send-otp-${mode}`, 5, 60)
    if (!ipLimited.allowed) {
      return NextResponse.json({ ok: false, error: "Too many requests, try again later" }, { status: 429 })
    }

    const emailLimited = await rateLimit(email, "auth-send-otp-email", 5, 300)
    if (!emailLimited.allowed) {
      return NextResponse.json({ ok: false, error: "Too many requests, try again later" }, { status: 429 })
    }

    if (mode === "register") {
      if (!name) {
        return NextResponse.json({ ok: false, error: "Name is required" }, { status: 400 })
      }
      const supabaseCheck = await createServerSupabase()
      const escaped = name.replace(/[\\%_]/g, (m: string) => `\\${m}`)
      const { data: duplicate } = await supabaseCheck
        .from("profiles")
        .select("id")
        .ilike("full_name", escaped)
        .limit(1)
      if (duplicate && duplicate.length > 0) {
        return NextResponse.json(
          { ok: false, error: "This name is already used by another account", code: "name_taken" },
          { status: 400 }
        )
      }
    }

    const supabase = await createServerSupabase()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: mode === "register",
        data: mode === "register" && name ? { full_name: name } : undefined,
      },
    })
    if (error) {
      return NextResponse.json({ ok: false, error: error.message, code: error.code ?? undefined }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 })
  }
}
