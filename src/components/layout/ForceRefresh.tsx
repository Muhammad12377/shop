"use client"

import { useEffect, useRef } from "react"
import { useLocale } from "next-intl"
import { usePathname } from "@/lib/i18n/navigation"

const LOCALES = ["en", "ar"]

function stripLocale(pathname: string): string {
  const seg = pathname.split("/")[1]
  if (LOCALES.includes(seg)) return pathname.slice(seg.length + 1) || "/"
  return pathname
}

function isRefreshTarget(pathname: string): boolean {
  const p = stripLocale(pathname)
  if (p === "/") return true
  if (p.startsWith("/product/")) return true
  if (p === "/cart") return true
  if (p === "/checkout") return true
  return false
}

export default function ForceRefresh() {
  const pathname = usePathname()
  const currentLocale = useLocale()
  const prevPath = useRef<string | null>(null)
  const prevLocale = useRef<string | null>(null)

  useEffect(() => {
    if (prevPath.current === null || prevLocale.current === null) {
      prevPath.current = pathname
      prevLocale.current = currentLocale
      return
    }

    const localeChanged = currentLocale !== prevLocale.current
    const pageChanged = pathname !== prevPath.current
    const shouldReload = localeChanged || (pageChanged && isRefreshTarget(pathname))

    prevPath.current = pathname
    prevLocale.current = currentLocale

    if (shouldReload) {
      window.location.reload()
    }
  }, [pathname, currentLocale])

  return null
}
