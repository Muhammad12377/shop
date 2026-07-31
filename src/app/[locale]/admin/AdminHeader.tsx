"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { LogOut, Menu, X } from "lucide-react"
import { useRouter } from "next/navigation"

export default function AdminHeader({
  locale,
  mobileOpen,
  onToggleMenu,
}: {
  locale: string
  mobileOpen: boolean
  onToggleMenu: () => void
}) {
  const router = useRouter()
  const [storeName, setStoreName] = useState("Sneakers Club")
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

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push(`/${locale}`)
  }

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
      <button
        onClick={handleLogout}
        className="flex items-center gap-2 text-sm text-zinc-500 hover:text-red-600 transition-colors cursor-pointer shrink-0"
      >
        <LogOut className="w-4 h-4" />
        <span className="hidden sm:inline">{isRtl ? "تسجيل خروج" : "Logout"}</span>
      </button>
    </header>
  )
}
