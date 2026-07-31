import { NextRequest } from "next/server"
import nodemailer from "nodemailer"

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-supabase-webhook-secret")
  if (process.env.AUTH_HOOK_SECRET && secret !== process.env.AUTH_HOOK_SECRET) {
    return Response.json({ error: "unauthorized" }, { status: 401 })
  }

  let payload: any
  try {
    payload = await req.json()
  } catch {
    return Response.json({ error: "bad_json" }, { status: 400 })
  }

  const email = typeof payload.email === "string" ? payload.email : payload.user?.email
  const token = typeof payload.token === "string" ? payload.token : ""
  const body = typeof payload.template?.body === "string" ? payload.template.body : ""
  const subject = typeof payload.template?.subject === "string" ? payload.template.subject : "Sneakers Club"
  const isNumericCode = /^\d{6,8}$/.test(token)

  if (!email) {
    return Response.json({ error: "no_email" }, { status: 400 })
  }
  if (!process.env.GMAIL_SMTP_USER || !process.env.GMAIL_SMTP_PASS) {
    return Response.json({ error: "smtp_not_configured" }, { status: 500 })
  }

  const renderedBody = body
    .replace(/\{\{ \.Token \}\}/g, token)
    .replace(/\{\{ \.ConfirmationURL \}\}/g, "")
    .replace(/\{\{ \.SiteURL \}\}/g, "")
    .replace(/\{\{ \.Email \}\}/g, email)

  const html = isNumericCode
    ? `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#18181b;margin:0 0 12px">Your Sneakers Club verification code</h2>
        <p style="color:#52525b;margin:0 0 16px">Use this code to continue:</p>
        <p style="font-size:30px;font-weight:bold;letter-spacing:8px;color:#f97316;margin:0 0 20px">${token}</p>
        <p style="color:#a1a1aa;font-size:12px;margin:0">This code expires shortly and can only be used once.</p>
      </div>`
    : renderedBody || `<p>Follow the link in this email to continue.</p>`

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
      subject: isNumericCode ? `Your Sneakers Club code: ${token}` : subject,
      html,
    })
  } catch (err: any) {
    console.error("email hook send failed:", err.message)
    return Response.json({ error: "send_failed" }, { status: 500 })
  }

  return Response.json({ ok: true })
}
