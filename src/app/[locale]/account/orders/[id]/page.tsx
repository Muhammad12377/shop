"use client"

import { useState, useEffect } from "react"
import { useTranslations, useLocale } from "next-intl"
import Image from "next/image"
import { useParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Link } from "@/lib/i18n/navigation"
import { ArrowLeft, Package } from "lucide-react"
import { colorLabel } from "@/lib/colors"

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  shipped: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
}

const statusSteps = ["pending", "confirmed", "shipped", "delivered"]

export default function OrderDetailPage() {
  const t = useTranslations("orders")
  const params = useParams<{ locale: string; id: string }>()
  const [order, setOrder] = useState<any>(null)
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const locale = useLocale()
  const isRtl = locale === "ar"

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from("orders")
      .select("*")
      .eq("id", params.id)
      .single()
      .then(({ data, error: err }) => {
        if (err) { setError(err.message); setLoading(false); return }
        setOrder(data)
        supabase
          .from("order_status_history")
          .select("*")
          .eq("order_id", params.id)
          .order("created_at", { ascending: true })
          .then(({ data: hist }) => {
            setHistory(hist || [])
            setLoading(false)
          })
      })
  }, [params.id])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" />
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="text-center py-20">
        <p className="text-red-500">{error || "Order not found"}</p>
        <Link href="/account/orders" className="text-accent text-sm hover:underline mt-2 inline-block">
          {isRtl ? "العودة للطلبات" : "Back to orders"}
        </Link>
      </div>
    )
  }

  const currentStepIndex = statusSteps.indexOf(order.status)

  return (
    <div className="space-y-6">
      <Link
        href="/account/orders"
        className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-accent transition-colors"
      >
        <ArrowLeft className={`w-4 h-4 ${isRtl ? "rotate-180" : ""}`} />
        {isRtl ? "العودة للطلبات" : "Back to orders"}
      </Link>

      <div className="bg-white rounded-2xl border border-zinc-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold">{t("detail_title")}</h2>
            <p className="text-sm text-zinc-500 mt-1">
              {t("order_id")}: #{order.id.slice(0, 8)}
            </p>
            <p className="text-sm text-zinc-500">
              {t("date")}: {new Date(order.created_at).toLocaleDateString(isRtl ? "ar" : "en-US")}
            </p>
          </div>
          <span className={`px-4 py-1.5 rounded-full text-sm font-medium ${statusColors[order.status]}`}>
            {t(order.status)}
          </span>
        </div>

        <div className="border-t border-zinc-100 pt-6">
          <h3 className="font-medium mb-4">{t("status_history")}</h3>
          <div className="space-y-4">
            {history.length > 0 ? history.map((h: any, i: number) => (
              <div key={h.id} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={`w-3 h-3 rounded-full ${statusColors[h.status]?.split(" ")[0] || "bg-zinc-300"}`} />
                  {i < history.length - 1 && <div className="w-px flex-1 bg-zinc-200 my-1" />}
                </div>
                <div>
                  <p className="text-sm font-medium capitalize">{t(h.status)}</p>
                  <p className="text-xs text-zinc-400">
                    {new Date(h.created_at).toLocaleString(isRtl ? "ar" : "en-US")}
                  </p>
                  {h.note && <p className="text-sm text-zinc-500 mt-1">{h.note}</p>}
                </div>
              </div>
            )) : (
              <div className="flex gap-4">
                {statusSteps.map((step, i) => (
                  <div key={step} className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${i <= currentStepIndex ? "bg-accent" : "bg-zinc-200"}`} />
                    <span className={`text-xs ${i <= currentStepIndex ? "text-accent font-medium" : "text-zinc-400"}`}>
                      {t(step)}
                    </span>
                    {i < statusSteps.length - 1 && <div className="w-6 h-px bg-zinc-200" />}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-100 p-6">
        <h3 className="font-medium mb-4">{t("items")}</h3>
        <div className="space-y-3">
          {order.items?.map((item: any) => (
            <div key={item.id} className="flex items-center gap-4 py-3 border-b border-zinc-50 last:border-0">
              <div className="w-14 h-14 rounded-xl bg-zinc-100 shrink-0 flex items-center justify-center relative overflow-hidden">
                {item.image ? (
                  <Image src={item.image} alt={item.product_name || ""} fill sizes="56px" className="object-cover" />
                ) : (
                  <Package className="w-5 h-5 text-zinc-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.product_name}</p>
                <p className="text-xs text-zinc-400">
                  {item.size && `${item.size} / `}{item.color && `${colorLabel(item.color)} / `}x{item.quantity}
                </p>
              </div>
              <p className="text-sm font-medium">${(item.price * item.quantity).toFixed(2)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-100 p-6">
        <h3 className="font-medium mb-4">{isRtl ? "ملخص الطلب" : "Order Summary"}</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-zinc-500">{t("subtotal")}</span>
            <span>${order.subtotal?.toFixed(2) || "0.00"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">{t("shipping")}</span>
            <span>{order.shipping_fee > 0 ? `$${order.shipping_fee.toFixed(2)}` : "Free"}</span>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>{t("discount")}</span>
              <span>-${order.discount.toFixed(2)}</span>
            </div>
          )}
          <div className="border-t border-zinc-100 pt-2 flex justify-between font-semibold">
            <span>{t("total")}</span>
            <span className="text-accent">${order.total?.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-100 p-6">
        <h3 className="font-medium mb-4">{t("shipping_address")}</h3>
        <div className="text-sm space-y-1 text-zinc-600">
          <p className="font-medium text-zinc-800">{order.full_name}</p>
          <p>{order.phone}</p>
          <p>{order.address}</p>
          <p>{order.city}</p>
        </div>
        {order.notes && (
          <div className="mt-4">
            <p className="text-sm font-medium mb-1">{t("order_notes")}</p>
            <p className="text-sm text-zinc-500">{order.notes}</p>
          </div>
        )}
      </div>
    </div>
  )
}
