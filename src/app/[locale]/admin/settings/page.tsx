"use client"

import { useEffect, useState } from "react"
import { Loader2, Save } from "lucide-react"
import toast from "react-hot-toast"
import type { StoreSettings } from "@/types"

const defaultSettings: StoreSettings = {
  store_name: "Sneakers Club",
  store_description: "",
  currency: "USD",
  shipping_fee: 0,
  free_shipping_min: 0,
  delivery_days: "3-5",
  contact_email: "",
  contact_phone: "",
  social_instagram: "",
  hero_title_en: "",
  hero_title_ar: "",
  hero_subtitle_en: "",
  hero_subtitle_ar: "",
}

export default function AdminSettingsPage({ params: paramsPromise }: { params: Promise<{ locale: string }> }) {
  const [locale, setLocale] = useState("en")
  const [form, setForm] = useState<StoreSettings>({ ...defaultSettings })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => { paramsPromise.then((p) => setLocale(p.locale)) }, [paramsPromise])
  const isRtl = locale === "ar"

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data && !data.error) {
          setForm((prev) => ({ ...prev, ...data }))
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      toast.success(isRtl ? "تم حفظ الإعدادات" : "Settings saved")
    } catch (err: any) {
      toast.error(err.message || (isRtl ? "خطأ في الحفظ" : "Save failed"))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-[#f97316] border-t-transparent rounded-full" />
      </div>
    )
  }

  const Field = ({
    label,
    value,
    onChange,
    type = "text",
    placeholder = "",
  }: {
    label: string
    value: string | number
    onChange: (v: string) => void
    type?: string
    placeholder?: string
  }) => (
    <div>
      <label className="block text-sm font-medium text-zinc-700 mb-1">{label}</label>
      {type === "textarea" ? (
        <textarea
          value={value as string}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          placeholder={placeholder}
          className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316]"
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316]"
        />
      )}
    </div>
  )

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{isRtl ? "الإعدادات" : "Settings"}</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 bg-[#f97316] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#fb923c] disabled:opacity-50 transition-colors cursor-pointer"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isRtl ? "حفظ" : "Save"}
        </button>
      </div>

      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-zinc-200 p-6">
          <h2 className="text-base font-semibold mb-4">{isRtl ? "معلومات المتجر" : "Store Info"}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field
              label={isRtl ? "اسم المتجر" : "Store Name"}
              value={form.store_name}
              onChange={(v) => setForm({ ...form, store_name: v })}
            />
            <Field
              label={isRtl ? "العملة" : "Currency"}
              value={form.currency}
              onChange={(v) => setForm({ ...form, currency: v })}
            />
          </div>
          <div className="mt-4">
            <Field
              label={isRtl ? "وصف المتجر" : "Store Description"}
              value={form.store_description}
              onChange={(v) => setForm({ ...form, store_description: v })}
              type="textarea"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-zinc-200 p-6">
          <h2 className="text-base font-semibold mb-4">{isRtl ? "الشحن والتوصيل" : "Shipping & Delivery"}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field
              label={isRtl ? "رسوم الشحن" : "Shipping Fee"}
              value={form.shipping_fee}
              onChange={(v) => setForm({ ...form, shipping_fee: parseFloat(v) || 0 })}
              type="number"
            />
            <Field
              label={isRtl ? "الشحن المجاني من" : "Free Shipping Min"}
              value={form.free_shipping_min}
              onChange={(v) => setForm({ ...form, free_shipping_min: parseFloat(v) || 0 })}
              type="number"
            />
            <Field
              label={isRtl ? "أيام التوصيل" : "Delivery Days"}
              value={form.delivery_days}
              onChange={(v) => setForm({ ...form, delivery_days: v })}
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-zinc-200 p-6">
          <h2 className="text-base font-semibold mb-4">{isRtl ? "معلومات الاتصال" : "Contact Info"}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field
              label={isRtl ? "البريد الإلكتروني" : "Contact Email"}
              value={form.contact_email}
              onChange={(v) => setForm({ ...form, contact_email: v })}
              type="email"
            />
            <Field
              label={isRtl ? "رقم الهاتف" : "Contact Phone"}
              value={form.contact_phone}
              onChange={(v) => setForm({ ...form, contact_phone: v })}
            />
            <Field
              label="Instagram"
              value={form.social_instagram}
              onChange={(v) => setForm({ ...form, social_instagram: v })}
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-zinc-200 p-6">
          <h2 className="text-base font-semibold mb-4">{isRtl ? "قسم الهيرو" : "Hero Section"}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field
              label={isRtl ? "عنوان الهيرو (إنجليزي)" : "Hero Title (EN)"}
              value={form.hero_title_en}
              onChange={(v) => setForm({ ...form, hero_title_en: v })}
            />
            <Field
              label={isRtl ? "عنوان الهيرو (عربي)" : "Hero Title (AR)"}
              value={form.hero_title_ar}
              onChange={(v) => setForm({ ...form, hero_title_ar: v })}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <Field
              label={isRtl ? "وصف الهيرو (إنجليزي)" : "Hero Subtitle (EN)"}
              value={form.hero_subtitle_en}
              onChange={(v) => setForm({ ...form, hero_subtitle_en: v })}
              type="textarea"
            />
            <Field
              label={isRtl ? "وصف الهيرو (عربي)" : "Hero Subtitle (AR)"}
              value={form.hero_subtitle_ar}
              onChange={(v) => setForm({ ...form, hero_subtitle_ar: v })}
              type="textarea"
            />
          </div>
        </div>

        <div className="flex justify-end pb-8">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 bg-[#f97316] text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-[#fb923c] disabled:opacity-50 transition-colors cursor-pointer"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isRtl ? "حفظ الإعدادات" : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  )
}
