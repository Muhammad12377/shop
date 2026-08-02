"use client"

import { useEffect, useRef } from "react"
import { usePathname } from "@/lib/i18n/navigation"

export default function ForceRefresh() {
  const pathname = usePathname()
  const first = useRef(true)

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    window.location.reload()
  }, [pathname])

  return null
}
