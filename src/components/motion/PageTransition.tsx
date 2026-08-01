"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { usePathname } from "next/navigation"

export default function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const prevPath = useRef(pathname)
  const [fadeKey, setFadeKey] = useState(0)

  useEffect(() => {
    if (prevPath.current !== pathname) {
      prevPath.current = pathname
      setFadeKey((k) => k + 1)
      window.scrollTo({ top: 0, behavior: "instant" })
    }
  }, [pathname])

  return (
    <div key={fadeKey} className="animate-page-in min-h-screen flex flex-col">
      {children}
    </div>
  )
}
