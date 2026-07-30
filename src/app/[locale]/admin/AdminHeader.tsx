"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { LogOut } from "lucide-react"
import { useRouter } from "next/navigation"

export default function AdminHeader({ locale }: { locale: string }) {
  const router = useRouter()
  const [storeName, setStoreName] = useState("Sneakers Club")
  const isRtl = locale === "ar"

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from("settings")
      .select("store_name")
      .single()
      .then(({ data }) => {
        if (data?.store_name) setStoreName(data.store_name)
      })
      .then(() => {})
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push(`/${locale}`)
  }

  return (
    <header className="h-16 bg-white border-b border-zinc-200 flex items-center justify-between px-6 sticky top-0 z-20">
      <h1 className="text-lg font-semibold text-zinc-800">{storeName}</h1>
      <button
        onClick={handleLogout}
        className="flex items-center gap-2 text-sm text-zinc-500 hover:text-red-600 transition-colors"
      >
        <LogOut className="w-4 h-4" />
        {isRtl ? "تسجيل خروج" : "Logout"}
      </button>
    </header>
  )
}
