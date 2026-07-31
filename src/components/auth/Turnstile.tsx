"use client"

import { useEffect, useRef, useState } from "react"

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement | string, options: Record<string, unknown>) => string
      reset: (widgetId: string) => void
      remove: (widgetId: string) => void
    }
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

let scriptPromise: Promise<void> | null = null

function loadTurnstileScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve()
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script")
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error("Failed to load Turnstile script"))
    document.head.appendChild(script)
  })
  return scriptPromise
}

interface TurnstileProps {
  onToken: (token: string | null) => void
  resetKey?: number
  className?: string
}

export default function Turnstile({ onToken, resetKey = 0, className }: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const onTokenRef = useRef(onToken)
  onTokenRef.current = onToken
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")
  const [reload, setReload] = useState(0)

  useEffect(() => {
    if (!SITE_KEY) return
    setStatus("loading")
    let cancelled = false

    loadTurnstileScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return
        setStatus("ready")
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: SITE_KEY,
          callback: (token: string) => onTokenRef.current(token),
          "expired-callback": () => onTokenRef.current(null),
          "error-callback": () => onTokenRef.current(null),
        })
      })
      .catch(() => {
        if (!cancelled) setStatus("error")
      })

    return () => {
      cancelled = true
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current)
        widgetIdRef.current = null
      }
    }
  }, [reload])

  useEffect(() => {
    if (resetKey > 0 && widgetIdRef.current && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current)
    }
  }, [resetKey])

  if (!SITE_KEY) return null

  return (
    <div>
      {status === "loading" && (
        <div className="py-2.5 text-center text-xs text-zinc-400 animate-pulse">
          جارٍ تحميل التحقق الأمني...
        </div>
      )}
      {status === "error" && (
        <div className="py-2.5 text-center text-xs text-red-500">
          تعذر تحميل التحقق الأمني.
          <button
            type="button"
            onClick={() => {
              scriptPromise = null
              setReload((r) => r + 1)
            }}
            className="ml-2 text-accent font-medium hover:underline"
          >
            إعادة المحاولة
          </button>
        </div>
      )}
      <div ref={containerRef} className={className} />
    </div>
  )
}
