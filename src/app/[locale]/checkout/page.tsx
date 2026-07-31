"use client"

import { useState, useEffect } from "react"
import { useTranslations, useLocale } from "next-intl"
import Image from "next/image"
import { useRouter } from "@/lib/i18n/navigation"
import { useCartStore } from "@/stores/cart"
import { createClient } from "@/lib/supabase/client"
import toast from "react-hot-toast"
import Header from "@/components/layout/Header"
import { CreditCard, MapPin, Phone, User, FileText, Ticket, Plus, X } from "lucide-react"
import { colorLabel } from "@/lib/colors"
import { PHONE_CODES, splitPhone } from "@/lib/phone-codes"
import type { Address, Coupon } from "@/types"

export default function CheckoutPage() {
  const t = useTranslations("checkout")
  const ct = useTranslations("cart")
  const router = useRouter()
  const { items, total, clearCart } = useCartStore()
  const [loading, setLoading] = useState(false)
  const [addresses, setAddresses] = useState<Address[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<string>("")
  const [showNewAddress, setShowNewAddress] = useState(false)
  const [couponCode, setCouponCode] = useState("")
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null)
  const [discount, setDiscount] = useState(0)
  const [validatingCoupon, setValidatingCoupon] = useState(false)
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    address: "",
    city: "",
    notes: "",
  })
  const [phoneCode, setPhoneCode] = useState("+963")
  const [settings, setSettings] = useState<any>(null)
  const [shippingCountries, setShippingCountries] = useState<any[]>([])
  const [selectedCountryId, setSelectedCountryId] = useState("")
  const [selectedZoneId, setSelectedZoneId] = useState("")
  const locale = useLocale()
  const isRtl = locale === "ar"

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase
          .from("addresses")
          .select("*")
          .eq("user_id", user.id)
          .order("is_default", { ascending: false })
          .then(({ data }) => {
            if (data && data.length > 0) {
              setAddresses(data)
              const defaultAddr = data.find((a) => a.is_default) || data[0]
              setSelectedAddressId(defaultAddr.id)
              const phone = splitPhone(defaultAddr.phone)
              setPhoneCode(phone.code)
              setForm({
                full_name: defaultAddr.full_name,
                phone: phone.number,
                address: defaultAddr.address,
                city: defaultAddr.city,
                notes: "",
              })
            }
          })
      }
    })
    supabase
      .from("settings")
      .select("key, value")
      .then(({ data }) => {
        const s: Record<string, any> = {}
        for (const row of data || []) s[row.key] = row.value
        setSettings(s)
      })
    fetch("/api/shipping")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setShippingCountries(data)
          if (data.length === 1) {
            setSelectedCountryId(data[0].id)
            if (data[0].zones?.length === 1) setSelectedZoneId(data[0].zones[0].id)
          }
        }
      })
      .catch(() => {})
  }, [])

  if (items.length === 0) {
    router.push("/cart")
    return null
  }

  const subtotal = total()
  const selectedCountry = shippingCountries.find((c) => c.id === selectedCountryId)
  const selectedZone = selectedCountry?.zones?.find((z: any) => z.id === selectedZoneId)
  const hasZones = (selectedCountry?.zones?.length || 0) > 0
  const freeShip = settings && subtotal >= (settings.free_shipping_min || 100)
  const needZone = hasZones && !selectedZoneId
  const baseShipping = selectedZone
    ? Number(selectedZone.price)
    : selectedCountry && !needZone
      ? Number(selectedCountry.price)
      : null
  const shippingFee = freeShip ? 0 : baseShipping
  const grandTotal = subtotal + (shippingFee ?? 0) - discount

  const selectAddress = (addr: Address) => {
    setSelectedAddressId(addr.id)
    const phone = splitPhone(addr.phone)
    setPhoneCode(phone.code)
    setForm({
      full_name: addr.full_name,
      phone: phone.number,
      address: addr.address,
      city: addr.city,
      notes: form.notes,
    })
  }

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return
    setValidatingCoupon(true)
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode.trim(), total: subtotal }),
      })
      const result = await res.json()
      if (!result.success) {
        toast.error(result.error || ct("invalid_coupon"))
        setValidatingCoupon(false)
        return
      }
      setAppliedCoupon(result.data)
      if (result.data.discount_amount != null) {
        setDiscount(Number(result.data.discount_amount))
      } else if (result.data.discount_type === "percentage") {
        setDiscount((subtotal * result.data.discount_value) / 100)
      } else {
        setDiscount(result.data.discount_value)
      }
      toast.success(ct("coupon_applied"))
    } catch {
      toast.error(ct("invalid_coupon"))
    }
    setValidatingCoupon(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error(t("login_required"))
        router.push("/auth")
        return
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("blocked")
        .eq("id", user.id)
        .single()
      if (profile?.blocked) {
        toast.error(isRtl ? "تم حظر حسابك ولا يمكنك إتمام الطلبات" : "Your account is blocked and cannot place orders")
        return
      }

      if (!selectedCountryId) {
        toast.error(isRtl ? "يرجى اختيار الدولة" : "Please select a country")
        return
      }
      if (hasZones && !selectedZoneId) {
        toast.error(isRtl ? "يرجى اختيار المحافظة" : "Please select a governorate")
        return
      }

      if (!form.phone.trim()) {
        toast.error(isRtl ? "يرجى إدخال رقم الهاتف" : "Please enter your phone number")
        return
      }

      const orderItems = items.map((item) => ({
        product_id: item.product_id,
        product_name: isRtl ? item.name_ar : item.name_en,
        price: item.price,
        quantity: item.quantity,
        size: item.size,
        color: item.color,
        image: item.image,
      }))

      const productIds = [...new Set(orderItems.map((i) => i.product_id))]
      const { data: stockRows } = await supabase
        .from("products")
        .select("id, stock, size_stock, name_en, name_ar")
        .in("id", productIds)
      const stockMap: Record<string, any> = {}
      for (const p of stockRows || []) stockMap[p.id] = p

      for (const item of orderItems) {
        const product = stockMap[item.product_id]
        if (!product) {
          toast.error(isRtl ? "أحد المنتجات غير متوفر" : "A product is no longer available")
          return
        }
        const sizeStock = Number(product.size_stock?.[item.size] ?? product.stock)
        if (item.quantity > sizeStock) {
          toast.error(
            isRtl
              ? `لا يمكن طلب أكثر من ${sizeStock} من "${product.name_ar}" مقاس ${item.size} (المتوفر: ${sizeStock})`
              : `Cannot order more than ${sizeStock} of "${product.name_en}" size ${item.size} (in stock: ${sizeStock})`
          )
          return
        }
      }

      const { data: order, error } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          status: "pending",
          subtotal,
          shipping_fee: shippingFee,
          discount,
          coupon_code: appliedCoupon?.code || null,
          total: grandTotal,
          full_name: form.full_name,
          phone: phoneCode + form.phone.trim().replace(/^0+/, ""),
          address: form.address,
          city: form.city,
          shipping_country: selectedCountry ? (isRtl ? selectedCountry.name_ar : selectedCountry.name_en) : null,
          shipping_zone: selectedZone ? (isRtl ? selectedZone.name_ar : selectedZone.name_en) : null,
          country_id: selectedCountryId || null,
          zone_id: selectedZoneId || null,
          notes: form.notes,
          items: orderItems,
        })
        .select()
        .single()

      if (error) throw error

      if (appliedCoupon) {
        await supabase
          .from("coupons")
          .update({ used_count: (appliedCoupon.used_count || 0) + 1 })
          .eq("id", appliedCoupon.id)
      }

      await supabase.from("order_status_history").insert({
        order_id: order.id,
        status: "pending",
        note: "Order placed",
      })

      clearCart()
      toast.success(t("order_confirmed"))
      router.push(`/order-confirmed?id=${order.id}`)
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
            {addresses.length > 0 && (
              <div className="bg-white rounded-2xl border border-zinc-100 p-6">
                <h2 className="font-semibold mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-accent" />
                  {t("saved_addresses")}
                </h2>
                <div className="space-y-2">
                  {addresses.map((addr) => (
                    <label
                      key={addr.id}
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                        selectedAddressId === addr.id
                          ? "border-accent bg-accent/5"
                          : "border-zinc-200 hover:border-zinc-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="address"
                        checked={selectedAddressId === addr.id}
                        onChange={() => selectAddress(addr)}
                        className="mt-0.5 accent-accent"
                      />
                      <div className="text-sm">
                        <p className="font-medium">{addr.label}</p>
                        <p className="text-zinc-500">{addr.full_name} - {addr.phone}</p>
                        <p className="text-zinc-400">{addr.address}, {addr.city}</p>
                      </div>
                    </label>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setShowNewAddress(!showNewAddress)}
                  className="mt-3 text-sm text-accent hover:underline flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  {t("add_new_address")}
                </button>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-zinc-100 p-6">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-accent" />
                {showNewAddress || addresses.length === 0 ? t("shipping_info") : t("or_enter_new")}
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
                  <div className="grid grid-cols-[110px_1fr] gap-2">
                    <select
                      value={phoneCode}
                      onChange={(e) => setPhoneCode(e.target.value)}
                      className="w-full px-2 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-accent text-sm bg-white"
                    >
                      {PHONE_CODES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.code} {isRtl ? c.ar : c.en}
                        </option>
                      ))}
                    </select>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={(e) => updateField("phone", e.target.value.replace(/[^0-9+]/g, ""))}
                        className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-accent text-sm"
                        placeholder={isRtl ? "مثال: 988765432" : "e.g. 988765432"}
                        required
                      />
                    </div>
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">{isRtl ? "الدولة" : "Country"}</label>
                    <select
                      value={selectedCountryId}
                      onChange={(e) => { setSelectedCountryId(e.target.value); setSelectedZoneId("") }}
                      className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-accent text-sm bg-white"
                    >
                      <option value="">{isRtl ? "اختر الدولة..." : "Select country..."}</option>
                      {shippingCountries.map((c) => (
                        <option key={c.id} value={c.id}>
                          {isRtl ? c.name_ar : c.name_en}
                        </option>
                      ))}
                    </select>
                  </div>
                  {(selectedCountry?.zones?.length || 0) > 0 && (
                    <div>
                      <label className="block text-sm font-medium mb-1">{isRtl ? "المحافظة" : "Governorate"}</label>
                      <select
                        value={selectedZoneId}
                        onChange={(e) => setSelectedZoneId(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-accent text-sm bg-white"
                      >
                        <option value="">{isRtl ? "اختر المحافظة..." : "Select governorate..."}</option>
                        {selectedCountry.zones.map((z: any) => (
                          <option key={z.id} value={z.id}>
                            {isRtl ? z.name_ar : z.name_en}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
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

            <div className="bg-white rounded-2xl border border-zinc-100 p-6">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <Ticket className="w-5 h-5 text-accent" />
                {ct("coupon_code")}
              </h2>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder={isRtl ? "أدخل كود الخصم" : "Enter coupon code"}
                  className="flex-1 px-3 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-accent text-sm"
                  disabled={!!appliedCoupon}
                />
                {appliedCoupon ? (
                  <button
                    type="button"
                    onClick={() => { setAppliedCoupon(null); setDiscount(0); setCouponCode("") }}
                    className="px-4 py-2.5 rounded-xl border border-red-200 text-red-500 text-sm hover:bg-red-50 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={validatingCoupon || !couponCode.trim()}
                    className="px-6 py-2.5 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent-light transition-colors disabled:opacity-50"
                  >
                    {validatingCoupon ? "..." : ct("apply_coupon")}
                  </button>
                )}
              </div>
              {appliedCoupon && (
                <p className="text-sm text-green-600 mt-2">
                  {ct("coupon_applied")} ({appliedCoupon.code})
                </p>
              )}
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
                    <div className="w-12 h-12 rounded-lg bg-zinc-100 shrink-0 overflow-hidden relative">
                      {item.image ? (
                        <Image src={item.image} alt={isRtl ? item.name_ar : item.name_en} fill sizes="48px" className="object-cover" />
                      ) : null}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {isRtl ? item.name_ar : item.name_en}
                      </p>
                      <p className="text-xs text-zinc-400">
                        {item.size} / {colorLabel(item.color)} x{item.quantity}
                      </p>
                      <p className="text-sm font-medium">
                        ${(item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-zinc-100 pt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-500">{ct("subtotal")}</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">{ct("shipping")}</span>
                  <span>
                    {shippingFee === 0 ? (
                      <span className="text-green-600">{ct("free_shipping")}</span>
                    ) : shippingFee == null ? (
                      <span className="text-amber-600 text-xs font-medium">
                        {!selectedCountryId
                          ? isRtl ? "اختر الدولة لتحديد رسوم الشحن" : "Select a country to see shipping cost"
                          : isRtl ? "اختر المحافظة لتحديد رسوم الشحن" : "Select a Governorate to see shipping cost"}
                      </span>
                    ) : (
                      `$${shippingFee.toFixed(2)}`
                    )}
                  </span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>{ct("discount")}</span>
                    <span>-${discount.toFixed(2)}</span>
                  </div>
                )}
                {shippingFee != null && shippingFee > 0 && settings && (
                  <p className="text-xs text-zinc-400">
                    {ct("free_shipping_note")}
                  </p>
                )}
                <div className="border-t border-zinc-100 pt-2 flex justify-between font-semibold">
                  <span>{ct("total")}</span>
                  <span className="text-xl font-bold text-accent">
                    ${grandTotal.toFixed(2)}
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-green-50 rounded-xl mt-4">
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
    </>
  )
}
