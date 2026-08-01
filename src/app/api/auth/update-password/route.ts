import { NextRequest, NextResponse } from "next/server"
import { createServerSupabase } from "@/lib/supabase/server"
import { verifyTurnstileToken, validatePassword } from "@/lib/auth"
import { rateLimit, getClientIp } from "@/lib/rate-limit"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    const password = typeof body?.password === "string" ? body.password : ""
    const confirmPassword = typeof body?.confirmPassword === "string" ? body.confirmPassword : ""
    const captchaToken = typeof body?.captchaToken === "string" ? body.captchaToken : null

    if (!password) {
      return NextResponse.json({ ok: false, error: "Missing password" }, { status: 400 })
    }

    const pwError = validatePassword(password)
    if (pwError) {
      return NextResponse.json({ ok: false, error: "Weak password", code: `password_${pwError}` }, { status: 400 })
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ ok: false, error: "Passwords do not match" }, { status: 400 })
    }

    const captcha = await verifyTurnstileToken(captchaToken)
    if (!captcha.ok) {
      return NextResponse.json({ ok: false, error: "captcha_failed", code: captcha.error }, { status: 400 })
    }

    const limited = rateLimit(getClientIp(req), "auth-update-password", 5, 60)
    if (!limited.allowed) {
      return NextResponse.json({ ok: false, error: "Too many attempts, try again later" }, { status: 429 })
    }

    const supabase = await createServerSupabase()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 })
  }
}
