"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { UserProfile } from "@/types"

export function useUser() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user: authUser } }) => {
      if (authUser) {
        supabase
          .from("profiles")
          .select("*")
          .eq("id", authUser.id)
          .single()
          .then(({ data }) => {
            setUser(data)
            setLoading(false)
          })
      } else {
        setLoading(false)
      }
    })
  }, [])

  return { user, loading }
}

export function useAdmin() {
  const { user, loading } = useUser()
  return { isAdmin: user?.role === "admin", loading, user }
}
