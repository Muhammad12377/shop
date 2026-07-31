"use client"

import { useState, useEffect } from "react"
import { useTranslations, useLocale } from "next-intl"
import Image from "next/image"
import { Link } from "@/lib/i18n/navigation"
import { useCartStore } from "@/stores/cart"
import Header from "@/components/layout/Header"
import { createClient } from "@/lib/supabase/client"
import { ShoppingCart, Trash2, Plus, Minus, ArrowLeft } from "lucide-react"
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
  const freeShip = settings && subtotal >= (Number(settings.free_shipping_min) || 100)
  const grandTotal = subtotal

  if (items.length === 0) {
    return (
      <>
        <Header />
        <div className="flex-1 flex items-center justify-center py-20 px-4">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-zinc-100 mb-6">
              <ShoppingCart className="w-8 h-8 text-zinc-400" />
            </div>
            <h2 className="text-2xl font-bold mb-2">{t("empty")}</h2>
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
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-8">{t("title")}</h1>

        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-4 bg-white rounded-2xl border border-zinc-100 p-4"
            >
              <div className="w-20 h-20 rounded-xl bg-zinc-100 shrink-0 overflow-hidden relative">
                {item.image ? (
                  <Image src={item.image} alt={isRtl ? item.name_ar : item.name_en} fill sizes="80px" className="object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-zinc-200 to-zinc-300" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <Link
                  href={`/product/${item.product_id}`}
                  className="font-medium truncate block hover:text-accent transition-colors"
                >
                  {isRtl ? item.name_ar : item.name_en}
                </Link>
                <p className="text-sm text-zinc-500">
                  {item.size && `${item.size}`}{item.size && item.color && " / "}{item.color && `${colorLabel(item.color)}`}
                </p>
                <p className="text-accent font-bold mt-1">${item.price.toFixed(2)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  className="p-1.5 rounded-full hover:bg-zinc-100 transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                <button
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  disabled={item.stock != null && item.quantity >= item.stock}
                  className="p-1.5 rounded-full hover:bg-zinc-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  title={
                    item.stock != null && item.quantity >= item.stock
                      ? isRtl ? "وصلت للحد الأقصى للمخزون" : "Maximum stock reached"
                      : undefined
                  }
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {item.stock != null && item.quantity >= item.stock && (
                <p className="text-xs text-zinc-400">
                  {isRtl ? `الحد الأقصى: ${item.stock}` : `Max: ${item.stock}`}
                </p>
              )}
              <p className="text-sm font-medium w-20 text-right">
                ${(item.price * item.quantity).toFixed(2)}
              </p>
              <button
                onClick={() => removeItem(item.id)}
                className="p-2 rounded-full hover:bg-red-50 text-red-400 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="mt-6 bg-white rounded-2xl border border-zinc-100 p-6">
          <div className="space-y-2 text-sm">
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
            {freeShip && settings && (
              <p className="text-xs text-zinc-400">{t("free_shipping_note")}</p>
            )}
            <div className="border-t border-zinc-100 pt-3 flex justify-between items-center">
              <span className="text-lg font-semibold">{t("total")}</span>
              <span className="text-2xl font-bold text-accent">${grandTotal.toFixed(2)}</span>
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
    </>
  )
}
