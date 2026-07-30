"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "@/lib/i18n/navigation"
import { createClient } from "@/lib/supabase/client"
import { Link } from "@/lib/i18n/navigation"
import { Package, ChevronRight } from "lucide-react"

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  shipped: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
}

export default function OrdersPage() {
  const t = useTranslations("orders")
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isRtl = document.dir === "rtl"
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setLoading(false); setError("Not logged in"); return }
      supabase
        .from("orders")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .then(({ data, error: err }) => {
          if (err) setError(err.message)
          else setOrders(data || [])
          setLoading(false)
        })
    })
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-red-500">{error}</p>
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-zinc-100 mb-6">
          <Package className="w-8 h-8 text-zinc-400" />
        </div>
        <h2 className="text-xl font-bold mb-2">{t("empty")}</h2>
        <Link
          href="/products"
          className="inline-flex items-center gap-2 mt-4 text-accent font-medium text-sm hover:underline"
        >
          {isRtl ? "تسوق الآن" : "Shop now"}
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {orders.map((order: any) => (
        <Link
          key={order.id}
          href={`/account/orders/${order.id}`}
          className="block bg-white rounded-2xl border border-zinc-100 p-6 hover:border-accent/30 transition-all group"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-zinc-500">
                {t("order_id")}: #{order.id.slice(0, 8)}
              </p>
              <p className="text-sm text-zinc-500">
                {t("date")}: {new Date(order.created_at).toLocaleDateString(isRtl ? "ar" : "en-US")}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[order.status] || "bg-zinc-100 text-zinc-800"}`}>
                {t(order.status)}
              </span>
              <ChevronRight className={`w-4 h-4 text-zinc-300 group-hover:text-accent transition-colors ${isRtl ? "rotate-180" : ""}`} />
            </div>
          </div>
          <div className="border-t border-zinc-100 pt-4 flex items-center justify-between">
            <p className="text-sm text-zinc-500">
              {order.items?.length || 0} {isRtl ? "منتج" : "items"}
            </p>
            <p className="text-lg font-bold text-accent">${order.total?.toFixed(2)}</p>
          </div>
        </Link>
      ))}
    </div>
  )
}
