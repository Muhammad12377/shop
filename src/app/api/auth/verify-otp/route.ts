import { NextRequest, NextResponse } from "next/server"
import { createServerSupabase } from "@/lib/supabase/server"
import { verifyTurnstileToken, validatePassword } from "@/lib/auth"
import { rateLimit, getClientIp } from "@/lib/rate-limit"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : ""
    const code = typeof body?.code === "string" ? body.code.trim() : ""
    const origin = body?.origin === "register" || body?.origin === "forgot" ? body.origin : null
    const name = typeof body?.name === "string" ? body.name.trim() : ""
    const password = typeof body?.password === "string" ? body.password : ""
    const otpSentAt = typeof body?.otpSentAt === "string" ? body.otpSentAt : ""
    const captchaToken = typeof body?.captchaToken === "string" ? body.captchaToken : null

    if (!email || !code || !origin) {
      return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 })
    }

    const captcha = await verifyTurnstileToken(captchaToken)
    if (!captcha.ok) {
      return NextResponse.json({ ok: false, error: "captcha_failed", code: captcha.error }, { status: 400 })
    }

    const limited = rateLimit(getClientIp(req), "auth-verify-otp", 10, 60)
    if (!limited.allowed) {
      return NextResponse.json({ ok: false, error: "Too many attempts, try again later" }, { status: 429 })
    }

    if (origin === "register" && password) {
      const pwError = validatePassword(password)
      if (pwError) {
        return NextResponse.json({ ok: false, error: "Weak password", code: `password_${pwError}` }, { status: 400 })
      }
    }

    const supabase = await createServerSupabase()
    const { data, error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" })
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
    }

    let created = false
    if (origin === "register" && data?.user) {
      created =
        !!otpSentAt &&
        !!data.user.created_at &&
        new Date(data.user.created_at).getTime() >= new Date(otpSentAt).getTime()

      if (created) {
        if (password) {
          const { error: updateErr } = await supabase.auth.updateUser({ password })
          if (updateErr) {
            return NextResponse.json({ ok: false, error: updateErr.message }, { status: 400 })
          }
        }
        if (name) {
          await supabase.auth.updateUser({ data: { full_name: name } })
        }
      }
    }

    return NextResponse.json({ ok: true, created })
  } catch {
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 })
  }
}
