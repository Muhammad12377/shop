import { NextRequest } from "next/server"
import nodemailer from "nodemailer"
import crypto from "crypto"

function getSecretKey(): Buffer {
  const raw = process.env.AUTH_HOOK_SECRET || ""
  let b64 = raw.startsWith("v1,") ? raw.slice(3) : raw
  if (b64.startsWith("whsec_")) b64 = b64.slice(6)
  return Buffer.from(b64, "base64")
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ba.length !== bb.length) return false
  return crypto.timingSafeEqual(ba, bb)
}

function verifySignature(payload: string, headers: Headers): boolean {
  const secret = getSecretKey()
  if (secret.length === 0) return true

  const id = headers.get("webhook-id")
  const ts = headers.get("webhook-timestamp")
  const signatureHeader = headers.get("webhook-signature")
  if (!id || !ts || !signatureHeader) return false

  const now = Math.floor(Date.now() / 1000)
  const t = parseInt(ts, 10)
  if (isNaN(t) || Math.abs(now - t) > 300) return false

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${id}.${ts}.${payload}`)
    .digest("base64")

  const signatures = signatureHeader.match(/v1,[A-Za-z0-9+/=]+/g) || []
  return signatures.some((s) => safeEqual(s.slice(3), expected))
}

const TYPE_LABEL: Record<string, string> = {
  magiclink: "sign in",
  signup: "confirm your account",
  recovery: "reset your password",
  invite: "accept your invitation",
  email_change: "confirm your new email",
  email: "continue",
}

export async function POST(req: NextRequest) {
  const payloadText = await req.text()

  if (!verifySignature(payloadText, req.headers)) {
    return Response.json({ error: "unauthorized" }, { status: 401 })
  }

  let payload: any
  try {
    payload = JSON.parse(payloadText)
  } catch {
    return Response.json({ error: "bad_json" }, { status: 400 })
  }

  const emailData = payload.email_data || {}
  const email = payload.email || payload.user?.email || payload.user?.primary_email
  const token = typeof emailData.token === "string" ? emailData.token : ""
  const tokenHash = typeof emailData.token_hash === "string" ? emailData.token_hash : ""
  const redirectTo = typeof emailData.redirect_to === "string" ? emailData.redirect_to : ""
  const siteUrl = typeof emailData.site_url === "string" ? emailData.site_url : "https://shop-two-steel.vercel.app"
  const actionType = typeof emailData.email_action_type === "string" ? emailData.email_action_type : "magiclink"
  const isNumericCode = /^\d{6,8}$/.test(token)

  if (!email) {
    return Response.json({ error: "no_email" }, { status: 400 })
  }
  if (!process.env.GMAIL_SMTP_USER || !process.env.GMAIL_SMTP_PASS) {
    return Response.json({ error: "smtp_not_configured" }, { status: 500 })
  }

  const link =
    tokenHash && tokenHash.length > 0
      ? `${siteUrl}/auth/v1/verify?token=${encodeURIComponent(tokenHash)}&type=${encodeURIComponent(actionType)}&redirect_to=${encodeURIComponent(redirectTo || siteUrl)}`
      : ""

  const label = TYPE_LABEL[actionType] || "continue"
  const subject = isNumericCode
    ? `Your Sneakers Club code: ${token}`
    : `Sneakers Club - ${label}`

  const html = isNumericCode
    ? `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#18181b;margin:0 0 12px">Your Sneakers Club verification code</h2>
        <p style="color:#52525b;margin:0 0 16px">Use this code to ${label}:</p>
        <p style="font-size:30px;font-weight:bold;letter-spacing:8px;color:#f97316;margin:0 0 20px">${token}</p>
        <p style="color:#a1a1aa;font-size:12px;margin:0">This code expires shortly and can only be used once.</p>
      </div>`
    : `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#18181b;margin:0 0 12px">Sneakers Club - ${label}</h2>
        <p style="color:#52525b;margin:0 0 20px">Click the button below to continue:</p>
        ${link ? `<p><a href="${link}" style="display:inline-block;padding:12px 24px;background:#f97316;color:#ffffff;text-decoration:none;border-radius:8px">Continue</a></p>` : "<p>Please try again.</p>"}
      </div>`

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.GMAIL_SMTP_USER,
      pass: process.env.GMAIL_SMTP_PASS,
    },
  })

  try {
    await transporter.sendMail({
      from: `Sneakers Club <${process.env.GMAIL_SMTP_USER}>`,
      to: email,
      subject,
      html,
    })
  } catch (err: any) {
    console.error("email hook send failed:", err.message)
    return Response.json({ error: "send_failed" }, { status: 500 })
  }

  return Response.json({ ok: true })
}
