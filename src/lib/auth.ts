const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"

export async function verifyTurnstileToken(
  token: string | null | undefined
): Promise<{ ok: boolean; error?: string }> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) return { ok: false, error: "not_configured" }
  if (!token) return { ok: false, error: "missing_token" }

  const res = await fetch(TURNSTILE_VERIFY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret, response: token }),
  })
  const data = await res.json()

  return { ok: !!data.success, error: data["error-codes"]?.[0] ?? null }
}

export type PasswordError = "space" | "too_short" | "letters" | "numbers" | null

export function validatePassword(password: string): PasswordError {
  if (/\s/.test(password)) return "space"
  if (password.length < 8) return "too_short"
  if (!/[A-Za-z]/.test(password)) return "letters"
  if (!/\d/.test(password)) return "numbers"
  return null
}
