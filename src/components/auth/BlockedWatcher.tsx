"use client"

import { useEffect } from "react"
import { useLocale } from "next-intl"
import { createClient } from "@/lib/supabase/client"
import toast from "react-hot-toast"

export default function BlockedWatcher() {
  const locale = useLocale()
  const isRtl = locale === "ar"

  useEffect(() => {
    const supabase = createClient()
    let channel: ReturnType<typeof supabase.channel> | null = null
    let pollTimer: ReturnType<typeof setInterval> | null = null
    let kicked = false

    const kick = async () => {
      if (kicked) return
      kicked = true
      try {
        await supabase.auth.signOut()
      } catch {}
      toast.error(
        isRtl
          ? "تم حظر حسابك. تواصل مع الإدارة للمزيد من المعلومات."
          : "Your account has been blocked. Contact support for more information.",
        { duration: 4000 }
      )
      setTimeout(() => {
        window.location.href = `/${locale}/auth?blocked=1`
      }, 1500)
    }

    const start = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from("profiles")
        .select("blocked")
        .eq("id", user.id)
        .single()
      if (profile?.blocked) {
        kick()
        return
      }

      channel = supabase
        .channel(`blocked-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "profiles",
            filter: `id=eq.${user.id}`,
          },
          (payload) => {
            const row = payload.new as any
            if (row?.blocked) kick()
          }
        )
        .subscribe()

      pollTimer = setInterval(async () => {
        try {
          const res = await fetch("/api/auth/blocked-check")
          const data = await res.json()
          if (data.loggedIn && data.blocked) kick()
        } catch {}
      }, 20000)
    }

    start()

    return () => {
      if (channel) supabase.removeChannel(channel)
      if (pollTimer) clearInterval(pollTimer)
    }
  }, [locale, isRtl])

  return null
}
