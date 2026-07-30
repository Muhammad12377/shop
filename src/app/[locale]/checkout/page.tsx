"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "@/lib/i18n/navigation"
import { useCartStore } from "@/stores/cart"
import { createClient } from "@/lib/supabase/client"
import toast from "react-hot-toast"
import Header from "@/components/layout/Header"
import { CreditCard, MapPin, Phone, User, FileText } from "lucide-react"

export default function CheckoutPage() {
  const t = useTranslations("checkout")
  const ct = useTranslations("cart")
  const router = useRouter()
  const { items, total, clearCart } = useCartStore()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    address: "",
    city: "",
    notes: "",
  })
  const isRtl = document.dir === "rtl"

  if (items.length === 0) {
    router.push("/cart")
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error("Please login first")
        router.push("/auth")
        return
      }

      const orderItems = items.map((item) => ({
        product_id: item.product_id,
        product_name: isRtl ? item.name_ar : item.name_en,
        price: item.price,
        quantity: item.quantity,
        size: item.size,
        color: item.color,
      }))

      const { error } = await supabase.from("orders").insert({
        user_id: user.id,
        status: "pending",
        total: total(),
        full_name: form.full_name,
        phone: form.phone,
        address: form.address,
        city: form.city,
        notes: form.notes,
        items: orderItems,
      })

      if (error) throw error

      clearCart()
      toast.success("Order placed successfully!")
      router.push("/orders")
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <>
      <Header />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-8">{t("title")}</h1>

        <div className="grid md:grid-cols-5 gap-8">
          <form onSubmit={handleSubmit} className="md:col-span-3 space-y-6">
            <div className="bg-white rounded-2xl border border-zinc-100 p-6">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-accent" />
                {t("shipping_info")}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">{t("full_name")}</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input
                      type="text"
                      value={form.full_name}
                      onChange={(e) => updateField("full_name", e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-accent text-sm"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t("phone")}</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => updateField("phone", e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-accent text-sm"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t("address")}</label>
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) => updateField("address", e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-accent text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t("city")}</label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => updateField("city", e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-accent text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t("notes")}</label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-3 w-4 h-4 text-zinc-400" />
                    <textarea
                      value={form.notes}
                      onChange={(e) => updateField("notes", e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-accent text-sm min-h-[80px]"
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-full bg-accent text-white font-medium hover:bg-accent-light transition-colors disabled:opacity-50"
            >
              {loading ? "Loading..." : t("place_order")}
            </button>
          </form>

          <div className="md:col-span-2">
            <div className="bg-white rounded-2xl border border-zinc-100 p-6 sticky top-24">
              <h2 className="font-semibold mb-4">{t("order_summary")}</h2>
              <div className="space-y-3 mb-4">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <div className="w-12 h-12 rounded-lg bg-zinc-100 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {isRtl ? item.name_ar : item.name_en}
                      </p>
                      <p className="text-xs text-zinc-400">{item.size} / {item.color} x{item.quantity}</p>
                      <p className="text-sm font-medium">${(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-zinc-100 pt-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-semibold">{ct("total")}</span>
                  <span className="text-xl font-bold text-accent">${total().toFixed(2)}</span>
                </div>
                <div className="flex items-start gap-3 p-3 bg-green-50 rounded-xl">
                  <CreditCard className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-green-800">{t("cod")}</p>
                    <p className="text-xs text-green-600">{t("cod_desc")}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
