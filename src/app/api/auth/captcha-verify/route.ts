import { NextRequest } from "next/server"

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const token = typeof body?.token === "string" ? body.token : null

  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) {
    return Response.json({ success: false, error: "not_configured" }, { status: 503 })
  }
  if (!token) {
    return Response.json({ success: false, error: "missing_token" }, { status: 400 })
  }

  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret, response: token }),
  })
  const data = await res.json()

  return Response.json({ success: !!data.success, error: data["error-codes"]?.[0] ?? null })
}
