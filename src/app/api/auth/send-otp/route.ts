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

    const captcha = await verifyTurnstileToken(captchaToken)
    if (!captcha.ok) {
      return NextResponse.json({ ok: false, error: "captcha_failed", code: captcha.error }, { status: 400 })
    }

    const limited = rateLimit(getClientIp(req), `auth-send-otp-${mode}`, 5, 60)
    if (!limited.allowed) {
      return NextResponse.json({ ok: false, error: "Too many requests, try again later" }, { status: 429 })
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
