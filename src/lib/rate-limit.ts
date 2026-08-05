import { createClient } from "@supabase/supabase-js"

const client = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

export function getClientIp(req: Request): string {
  if ("ip" in req && typeof (req as { ip?: string }).ip === "string" && (req as { ip?: string }).ip) {
    return (req as { ip?: string }).ip as string
  }
  const fwd = req.headers.get("x-forwarded-for") || ""
  return fwd.split(",")[0]?.trim() || "unknown"
}

export async function rateLimit(
  identifier: string,
  scope: string,
  maxRequests: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; retryAfter: number }> {
  const key = `${scope}:${identifier}`

  const { data, error } = await client.rpc("consume_rate_limit", {
    p_key: key,
    p_window: windowSeconds,
    p_max: maxRequests,
  })

  if (error) {
    return { allowed: false, remaining: 0, retryAfter: windowSeconds }
  }

  const count = Number(data ?? 0)
  if (count > maxRequests) {
    return { allowed: false, remaining: 0, retryAfter: windowSeconds }
  }
  return { allowed: true, remaining: Math.max(0, maxRequests - count), retryAfter: 0 }
}