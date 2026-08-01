const buckets = new Map<string, { count: number; resetAt: number }>()

export function getClientIp(req: Request): string {
  if ("ip" in req && typeof (req as { ip?: string }).ip === "string" && (req as { ip?: string }).ip) {
    return (req as { ip?: string }).ip as string
  }
  const fwd = req.headers.get("x-forwarded-for") || ""
  return fwd.split(",")[0]?.trim() || "unknown"
}

function cleanup() {
  const now = Date.now()
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key)
  }
}

export function rateLimit(
  identifier: string,
  scope: string,
  maxRequests: number,
  windowSeconds: number
): { allowed: boolean; remaining: number; retryAfter: number } {
  cleanup()

  const key = `${scope}:${identifier}`
  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowSeconds * 1000 })
    return { allowed: true, remaining: maxRequests - 1, retryAfter: 0 }
  }

  bucket.count += 1
  if (bucket.count > maxRequests) {
    const retryAfter = Math.ceil((bucket.resetAt - now) / 1000)
    return { allowed: false, remaining: 0, retryAfter }
  }

  return { allowed: true, remaining: maxRequests - bucket.count, retryAfter: 0 }
}
