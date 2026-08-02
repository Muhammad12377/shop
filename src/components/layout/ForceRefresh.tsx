"use client"

import { useEffect, useRef } from "react"
import { usePathname } from "@/lib/i18n/navigation"

const LOCALES = ["en", "ar"]

function getLocale(pathname: string): string | null {
  const seg = pathname.split("/")[1]
  return LOCALES.includes(seg) ? seg : null
}

export default function ForceRefresh() {
  const pathname = usePathname()
  const currentLocale = getLocale(pathname)
  const prevLocale = useRef(currentLocale)

  useEffect(() => {
    if (prevLocale.current === null) {
      prevLocale.current = currentLocale
      return
    }
    if (currentLocale !== prevLocale.current) {
      prevLocale.current = currentLocale
      window.location.reload()
    }
  }, [currentLocale])

  return null
}