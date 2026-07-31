"use client"

import { useState } from "react"
import { useTranslations, useLocale } from "next-intl"
import { Link } from "@/lib/i18n/navigation"
import { useCartStore } from "@/stores/cart"
import Header from "@/components/layout/Header"
import { ShoppingCart, Trash2, Plus, Minus, ArrowLeft, Ticket, X } from "lucide-react"
import { colorLabel } from "@/lib/colors"

export default function CartPage() {
  const t = useTranslations("cart")
  const { items, removeItem, updateQuantity, total } = useCartStore()
  const [couponCode, setCouponCode] = useState("")
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null)
  const locale = useLocale()
  const isRtl = locale === "ar"

  const subtotal = total()
  const shipping = subtotal >= 100 ? 0 : 5
  const grandTotal = appliedCoupon ? subtotal + shipping - (subtotal * 0.1) : subtotal + shipping

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
              <div className="w-20 h-20 rounded-xl bg-zinc-100 shrink-0 overflow-hidden">
                {item.image ? (
                  <img src={item.image} alt="" className="w-full h-full object-cover" />
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
                  className="p-1.5 rounded-full hover:bg-zinc-100 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
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
          <div className="flex items-center gap-2 mb-4">
            <Ticket className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium">{t("coupon_code")}</span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              placeholder={isRtl ? "أدخل كود الخصم" : "Enter coupon code"}
              className="flex-1 px-3 py-2 rounded-xl border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-accent text-sm"
              disabled={!!appliedCoupon}
            />
            {appliedCoupon ? (
              <button
                onClick={() => { setAppliedCoupon(null); setCouponCode("") }}
                className="px-4 py-2 rounded-xl border border-red-200 text-red-500 text-sm hover:bg-red-50 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => {
                  if (couponCode.trim()) {
                    setAppliedCoupon(couponCode.trim())
                  }
                }}
                disabled={!couponCode.trim()}
                className="px-6 py-2 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent-light transition-colors disabled:opacity-50"
              >
                {t("apply_coupon")}
              </button>
            )}
          </div>
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
                {shipping === 0 ? (
                  <span className="text-green-600">{t("free_shipping")}</span>
                ) : (
                  `$${shipping.toFixed(2)}`
                )}
              </span>
            </div>
            {appliedCoupon && (
              <div className="flex justify-between text-green-600">
                <span>{t("discount")} (10%)</span>
                <span>-${(subtotal * 0.1).toFixed(2)}</span>
              </div>
            )}
            {shipping > 0 && (
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
