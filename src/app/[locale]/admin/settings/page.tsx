"use client"

import { useEffect, useState, useRef } from "react"
import Image from "next/image"
import { Loader2, Save, Upload, Image as ImageIcon, Check, FileIcon, X, Trash2 } from "lucide-react"
import toast from "react-hot-toast"
import type { StoreSettings, Media } from "@/types"
import ImageCropModal from "@/components/admin/ImageCropModal"

const defaultSettings: StoreSettings = {
  store_name: "Sneakers Take Off",
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
  hero_image_url: "",
}

function Field({
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
}) {
  return (
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
}

export default function AdminSettingsPage({ params: paramsPromise }: { params: Promise<{ locale: string }> }) {
  const [locale, setLocale] = useState("en")
  const [form, setForm] = useState<StoreSettings>({ ...defaultSettings })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [mediaItems, setMediaItems] = useState<Media[]>([])
  const [mediaModalOpen, setMediaModalOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  useEffect(() => {
    fetch("/api/admin/media")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setMediaItems(data)
      })
      .catch(() => {})
  }, [])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPendingImageFile(file)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleCropConfirm = async (file: File) => {
    setPendingImageFile(null)
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setForm({ ...form, hero_image_url: data.url })
      toast.success(isRtl ? "تم رفع الصورة" : "Image uploaded")
    } catch (err: any) {
      toast.error(err.message || (isRtl ? "خطأ في الرفع" : "Upload failed"))
    } finally {
      setUploading(false)
    }
  }

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
          <div className="mt-4">
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              {isRtl ? "صورة الخلفية" : "Background Image"}
            </label>
            <div className="relative aspect-[21/9] rounded-xl overflow-hidden border border-zinc-200 bg-zinc-100 mb-3">
              {form.hero_image_url ? (
                <Image src={form.hero_image_url} alt="" fill sizes="768px" className="object-cover" />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-400 gap-1">
                  <ImageIcon className="w-8 h-8" />
                  <p className="text-xs">
                    {isRtl ? "لا توجد صورة — ستظهر الخلفية الرمادية الحالية" : "No image — the current gray background will show"}
                  </p>
                </div>
              )}
              {form.hero_image_url && (
                <button
                  type="button"
                  onClick={() => setForm({ ...form, hero_image_url: "" })}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 cursor-pointer"
                  title={isRtl ? "إزالة الصورة" : "Remove image"}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2 mb-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
                onChange={handleUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-2 px-3 py-2 bg-[#f97316] text-white rounded-lg text-sm font-medium hover:bg-[#fb923c] disabled:opacity-50 transition-colors cursor-pointer"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {uploading
                  ? isRtl ? "جارٍ الرفع..." : "Uploading..."
                  : isRtl ? "رفع صورة" : "Upload Image"}
              </button>
              <button
                type="button"
                onClick={() => setMediaModalOpen(true)}
                className="inline-flex items-center gap-2 px-3 py-2 bg-[#f97316]/10 text-[#f97316] rounded-lg text-sm font-medium hover:bg-[#f97316]/20 transition-colors cursor-pointer"
              >
                <ImageIcon className="w-4 h-4" />
                {isRtl ? "من المكتبة" : "From Library"}
              </button>
            </div>
            <input
              type="text"
              value={form.hero_image_url || ""}
              onChange={(e) => setForm({ ...form, hero_image_url: e.target.value })}
              placeholder={isRtl ? "أو الصق رابط الصورة هنا..." : "Or paste an image URL here..."}
              className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316]"
            />
          </div>
        </div>

      {mediaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 pb-10">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMediaModalOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto z-10">
            <div className="sticky top-0 bg-white border-b border-zinc-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{isRtl ? "اختر صورة من المكتبة" : "Choose an image from library"}</h2>
              <button onClick={() => setMediaModalOpen(false)} className="p-1 hover:bg-zinc-100 rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              {mediaItems.length === 0 ? (
                <div className="text-center py-12">
                  <FileIcon className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
                  <p className="text-zinc-400">{isRtl ? "لا توجد صور في المكتبة" : "No images in library"}</p>
                  <p className="text-sm text-zinc-300 mt-1">
                    {isRtl ? "ارفع الصور أولاً من صفحة الوسائط" : "Upload images first from the Media page"}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {mediaItems.map((item) => {
                    const selected = form.hero_image_url === item.url
                    return (
                      <div key={item.id} className="relative">
                        <button
                          type="button"
                          onClick={() => {
                            setForm({ ...form, hero_image_url: item.url })
                            toast.success(isRtl ? "تم الاختيار" : "Selected")
                            setMediaModalOpen(false)
                          }}
                          className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all cursor-pointer w-full ${
                            selected ? "border-green-500" : "border-transparent hover:border-[#f97316]"
                          }`}
                        >
                          <Image src={item.url} alt={item.alt || ""} fill sizes="160px" className="object-cover" />
                          {selected && (
                            <div className="absolute inset-0 bg-green-500/30 flex items-center justify-center">
                              <Check className="w-6 h-6 text-white" />
                            </div>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const url = item.url
                            fetch("/api/admin/media", {
                              method: "DELETE",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ id: item.id, url }),
                            })
                              .then((r) => r.json())
                              .then((d) => {
                                if (d.error) throw new Error(d.error)
                                setMediaItems((prev) => prev.filter((m) => m.id !== item.id))
                                if (form.hero_image_url === url) setForm({ ...form, hero_image_url: "" })
                                toast.success(isRtl ? "تم حذف الصورة" : "Image deleted")
                              })
                              .catch(() => toast.error(isRtl ? "خطأ في الحذف" : "Delete failed"))
                          }}
                          className="absolute -top-1.5 -end-1.5 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-colors cursor-pointer shadow"
                          title={isRtl ? "حذف الصورة" : "Delete image"}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {pendingImageFile && (
        <ImageCropModal
          file={pendingImageFile}
          isRtl={isRtl}
          initialPresetId="hero"
          onCancel={() => setPendingImageFile(null)}
          onConfirm={handleCropConfirm}
        />
      )}

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
