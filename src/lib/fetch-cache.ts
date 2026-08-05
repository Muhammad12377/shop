type CacheEntry = {
  data: unknown
  expiresAt: number
}

const store = new Map<string, CacheEntry>()
const inflight = new Map<string, Promise<unknown>>()

const DEFAULT_TTL = 5 * 60 * 1000

export function fetchCached<T>(url: string, ttlMs = DEFAULT_TTL): Promise<T> {
  const now = Date.now()
  const hit = store.get(url)
  if (hit && hit.expiresAt > now) return Promise.resolve(hit.data as T)

  const pending = inflight.get(url)
  if (pending) return pending as Promise<T>

  const p = fetch(url)
    .then(async (r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const data: unknown = await r.json()
      store.set(url, { data, expiresAt: Date.now() + ttlMs })
      return data as T
    })
    .catch((err) => {
      store.delete(url)
      throw err
    })
    .finally(() => {
      inflight.delete(url)
    })

  inflight.set(url, p)
  return p
}
