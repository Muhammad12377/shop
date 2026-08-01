"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Home, Menu, X } from "lucide-react"

export default function AdminHeader({
  locale,
  mobileOpen,
  onToggleMenu,
}: {
  locale: string
  mobileOpen: boolean
  onToggleMenu: () => void
}) {
  const [storeName, setStoreName] = useState("Sneakers Take Off")
  const isRtl = locale === "ar"

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from("settings")
      .select("key, value")
      .then(({ data }) => {
        const settings: Record<string, any> = {}
        for (const row of data || []) settings[row.key] = row.value
        if (settings.store_name) setStoreName(settings.store_name)
      })
  }, [])

  return (
    <header className="h-16 bg-white border-b border-zinc-200 flex items-center justify-between px-3 sm:px-6 sticky top-0 z-30">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          onClick={onToggleMenu}
          className="lg:hidden p-2 -ms-1 rounded-lg text-zinc-600 hover:bg-zinc-100 transition-colors cursor-pointer"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
        <h1 className="text-base sm:text-lg font-semibold text-zinc-800 truncate">{storeName}</h1>
      </div>
      <Link
        href={`/${locale}`}
        className="flex items-center gap-2 text-sm text-zinc-500 hover:text-[#f97316] transition-colors cursor-pointer shrink-0"
      >
        <Home className="w-4 h-4" />
        <span className="hidden sm:inline">{isRtl ? "الرئيسية" : "Home"}</span>
      </Link>
    </header>
  )
}
