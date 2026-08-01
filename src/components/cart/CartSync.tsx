"use client"

import { useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useCartStore } from "@/stores/cart"

export default function CartSync() {
  useEffect(() => {
    const supabase = createClient()
    const hydrate = useCartStore.getState().hydrate

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") {
        hydrate()
      }
      if (event === "SIGNED_OUT") {
        useCartStore.setState({ items: [] })
      }
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  return null
}
