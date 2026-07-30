"use client"

import { useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { Link } from "@/lib/i18n/navigation"
import Header from "@/components/layout/Header"
import { CheckCircle, Package, ShoppingBag } from "lucide-react"

export default function OrderConfirmedPage() {
  const t = useTranslations("checkout")
  const searchParams = useSearchParams()
  const orderId = searchParams.get("id")
  const isRtl = document.dir === "rtl"

  return (
    <>
      <Header />
      <div className="flex-1 flex items-center justify-center py-20 px-4">
        <div className="text-center max-w-md">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-green-100 mb-8">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold mb-3">{t("order_confirmed")}</h1>
          <p className="text-zinc-500 mb-4">{t("order_confirmed_desc")}</p>
          {orderId && (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-100 rounded-full text-sm font-medium mb-8">
              <Package className="w-4 h-4 text-accent" />
              {isRtl ? "رقم الطلب" : "Order #"}: {orderId.slice(0, 8)}
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/account/orders"
              className="inline-flex items-center justify-center gap-2 bg-accent text-white px-8 py-3 rounded-full font-medium hover:bg-accent-light transition-colors"
            >
              <Package className="w-4 h-4" />
              {isRtl ? "عرض طلباتي" : "View My Orders"}
            </Link>
            <Link
              href="/products"
              className="inline-flex items-center justify-center gap-2 border border-zinc-200 px-8 py-3 rounded-full font-medium hover:bg-zinc-50 transition-colors"
            >
              <ShoppingBag className="w-4 h-4" />
              {t("back_to_shop")}
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
