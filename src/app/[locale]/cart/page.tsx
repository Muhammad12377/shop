"use client"

import { useState, useEffect } from "react"
import { useTranslations, useLocale } from "next-intl"
import Image from "next/image"
import { Link } from "@/lib/i18n/navigation"
import { useCartStore } from "@/stores/cart"
import Header from "@/components/layout/Header"
import { createClient } from "@/lib/supabase/client"
import { ShoppingCart, Trash2, Plus, Minus, ArrowLeft, Truck } from "lucide-react"
import { colorLabel } from "@/lib/colors"

export default function CartPage() {
  const t = useTranslations("cart")
  const { items, removeItem, updateQuantity, total } = useCartStore()
  const [settings, setSettings] = useState<any>(null)
  const locale = useLocale()
  const isRtl = locale === "ar"

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data } = await createClient().from("settings").select("key, value")
        if (cancelled) return
        const s: Record<string, any> = {}
        for (const row of data || []) s[row.key] = row.value
        setSettings(s)
      } catch {}
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const subtotal = total()
  const freeMin = Number(settings?.free_shipping_min) || 0
  const freeShip = freeMin > 0 && subtotal >= freeMin
  const remaining = Math.max(0, freeMin - subtotal)
  const progress = freeMin > 0 ? Math.min(100, (subtotal / freeMin) * 100) : 0

  const freeShippingNote = isRtl
    ? `أضف ${remaining.toFixed(2)}$ لتحصل على شحن مجاني`
    : `Add $${remaining.toFixed(2)} more for free shipping`

  const ShippingProgress = (
    <div>
      <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1.5">
        <Truck className={`w-3.5 h-3.5 ${isRtl ? "rotate-180" : ""} text-accent shrink-0`} />
        {freeShip ? (
          <span className="text-green-600 font-medium">
            {isRtl ? "مبروك! حصلت على شحن مجاني" : "Congratulations! You get free shipping"}
          </span>
        ) : (
          <span>{freeShippingNote}</span>
        )}
      </div>
      <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${freeShip ? "bg-green-500" : "bg-accent"}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )

  if (items.length === 0) {
    return (
      <>
        <Header />
        <div className="flex-1 flex items-center justify-center py-20 px-4">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-zinc-100 mb-6">
              <ShoppingCart className="w-8 h-8 text-zinc-400" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold mb-2">{t("empty")}</h2>
            <p className="text-zinc-500 mb-8">
              {isRtl ? "أضف بعض المنتجات إلى سلتك" : "Add some products to your cart"}
            </p>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 bg-accent text-white px-8 py-3 rounded-full font-medium hover:bg-accent-light transition-colors"
            >
              <ArrowLeft className={`w-4 h-4 ${isRtl ? "rotate-180" : ""}`} />
              {t("continue_shopping")}
            </Link>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Header />
      <div className="max-w-6xl mx-auto px-4 py-8 pb-32 lg:pb-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl sm:text-2xl font-bold">{t("title")}</h1>
          <span className="text-sm text-zinc-500">
            {items.reduce((a, b) => a + b.quantity, 0)} {isRtl ? "منتج" : "items"}
          </span>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2 space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex gap-3 sm:gap-4 bg-white rounded-2xl border border-zinc-100 p-3 sm:p-4"
              >
                <Link
                  href={`/product/${item.product_id}`}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-zinc-100 shrink-0 overflow-hidden relative"
                >
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={isRtl ? item.name_ar : item.name_en}
                      fill
                      sizes="96px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-zinc-200 to-zinc-300" />
                  )}
                </Link>
                <div className="flex-1 min-w-0 flex flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        href={`/product/${item.product_id}`}
                        className="font-medium text-sm sm:text-base truncate block hover:text-accent transition-colors"
                      >
                        {isRtl ? item.name_ar : item.name_en}
                      </Link>
                      <p className="text-xs sm:text-sm text-zinc-500 truncate">
                        {item.size && item.size}
                        {item.size && item.color ? " / " : ""}
                        {item.color && colorLabel(item.color, isRtl ? "ar" : "en")}
                      </p>
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-2 rounded-full hover:bg-red-50 text-red-400 hover:text-red-500 transition-colors shrink-0"
                      aria-label="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="mt-auto flex items-center justify-between pt-2">
                    <div className="flex items-center gap-0.5 border border-zinc-200 rounded-full p-0.5">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="p-1.5 sm:p-2 rounded-full hover:bg-zinc-100 transition-colors"
                        aria-label="Decrease"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-7 sm:w-8 text-center text-sm font-medium">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        disabled={item.stock != null && item.quantity >= item.stock}
                        className="p-1.5 sm:p-2 rounded-full hover:bg-zinc-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        aria-label="Increase"
                        title={
                          item.stock != null && item.quantity >= item.stock
                            ? isRtl ? "وصلت للحد الأقصى للمخزون" : "Maximum stock reached"
                            : undefined
                        }
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-accent font-bold text-sm sm:text-base">
                        ${(item.price * item.quantity).toFixed(2)}
                      </p>
                      <p className="text-[11px] sm:text-xs text-zinc-400">
                        ${item.price.toFixed(2)} {isRtl ? "للقطعة" : "/ item"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden lg:block">
            <div className="bg-white rounded-2xl border border-zinc-100 p-6 sticky top-24">
              {freeMin > 0 && ShippingProgress}
              <div className="space-y-2 text-sm mt-4">
                <div className="flex justify-between">
                  <span className="text-zinc-500">{t("subtotal")}</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">{t("shipping")}</span>
                  <span>
                    {freeShip ? (
                      <span className="text-green-600">{t("free_shipping")}</span>
                    ) : (
                      <span className="text-amber-600 text-xs font-medium">
                        {isRtl ? "حسب الدولة (في إتمام الطلب)" : "By country (at checkout)"}
                      </span>
                    )}
                  </span>
                </div>
                <div className="border-t border-zinc-100 pt-3 flex justify-between items-center">
                  <span className="text-lg font-semibold">{t("total")}</span>
                  <span className="text-2xl font-bold text-accent">${subtotal.toFixed(2)}</span>
                </div>
              </div>
              <Link
                href="/checkout"
                className="block w-full text-center bg-accent text-white py-3 rounded-full font-medium hover:bg-accent-light transition-colors mt-6"
              >
                {t("checkout")}
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-zinc-200 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        {freeMin > 0 && ShippingProgress}
        <div className="flex items-center justify-between gap-3 mt-2">
          <div className="shrink-0">
            <p className="text-xs text-zinc-500">{t("total")}</p>
            <p className="text-xl font-bold text-accent">${subtotal.toFixed(2)}</p>
          </div>
          <Link
            href="/checkout"
            className="flex-1 text-center bg-accent text-white py-3.5 px-6 rounded-full font-medium hover:bg-accent-light transition-colors active:scale-[0.98]"
          >
            {t("checkout")}
          </Link>
        </div>
      </div>
    </>
  )
}
