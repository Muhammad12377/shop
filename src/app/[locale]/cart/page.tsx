"use client"

import { useTranslations } from "next-intl"
import { Link } from "@/lib/i18n/navigation"
import { useCartStore } from "@/stores/cart"
import Header from "@/components/layout/Header"
import { ShoppingCart, Trash2, Plus, Minus, ArrowLeft } from "lucide-react"

export default function CartPage() {
  const t = useTranslations("cart")
  const { items, removeItem, updateQuantity, total } = useCartStore()
  const isRtl = document.dir === "rtl"

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
              <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-zinc-200 to-zinc-300 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h3 className="font-medium truncate">
                  {isRtl ? item.name_ar : item.name_en}
                </h3>
                <p className="text-sm text-zinc-500">
                  {item.size} / {item.color}
                </p>
                <p className="text-accent font-bold mt-1">${item.price}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  className="p-1 rounded-full hover:bg-zinc-100 transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                <button
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  className="p-1 rounded-full hover:bg-zinc-100 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={() => removeItem(item.id)}
                className="p-2 rounded-full hover:bg-red-50 text-red-400 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="mt-8 bg-white rounded-2xl border border-zinc-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <span className="text-lg font-semibold">{t("total")}</span>
            <span className="text-2xl font-bold text-accent">${total().toFixed(2)}</span>
          </div>
          <Link
            href="/checkout"
            className="block w-full text-center bg-accent text-white py-3 rounded-full font-medium hover:bg-accent-light transition-colors"
          >
            {t("checkout")}
          </Link>
        </div>
      </div>
    </>
  )
}
