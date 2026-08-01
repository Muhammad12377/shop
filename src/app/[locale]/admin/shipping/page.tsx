"use client"

import { useEffect, useState, useCallback } from "react"
import { Plus, Pencil, Trash2, X, ChevronDown, ChevronUp, Loader2, Truck, MapPin } from "lucide-react"
import toast from "react-hot-toast"
import type { ShippingCountry, ShippingZone } from "@/types"

type CountryForm = { name_en: string; name_ar: string; price: number; active: boolean }
type ZoneForm = { name_en: string; name_ar: string; price: number; active: boolean }

const emptyCountry: CountryForm = { name_en: "", name_ar: "", price: 0, active: true }
const emptyZone: ZoneForm = { name_en: "", name_ar: "", price: 0, active: true }

export default function AdminShippingPage({ params: paramsPromise }: { params: Promise<{ locale: string }> }) {
  const [locale, setLocale] = useState("en")
  const [countries, setCountries] = useState<ShippingCountry[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [countryModal, setCountryModal] = useState(false)
  const [editingCountry, setEditingCountry] = useState<ShippingCountry | null>(null)
  const [countryForm, setCountryForm] = useState<CountryForm>({ ...emptyCountry })
  const [zoneModal, setZoneModal] = useState(false)
  const [zoneCountryId, setZoneCountryId] = useState("")
  const [editingZone, setEditingZone] = useState<ShippingZone | null>(null)
  const [zoneForm, setZoneForm] = useState<ZoneForm>({ ...emptyZone })
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ type: "country" | "zone"; id: string; name: string } | null>(null)

  useEffect(() => { paramsPromise.then((p) => setLocale(p.locale)) }, [paramsPromise])
  const isRtl = locale === "ar"

  const fetchCountries = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/shipping")
      const data = await res.json()
      if (Array.isArray(data)) setCountries(data)
    } catch {
      toast.error(isRtl ? "خطأ في تحميل الشحن" : "Failed to load shipping")
    } finally {
      setLoading(false)
    }
  }, [isRtl])

  useEffect(() => { fetchCountries() }, [fetchCountries])

  const openAddCountry = () => {
    setEditingCountry(null)
    setCountryForm({ ...emptyCountry })
    setCountryModal(true)
  }

  const openEditCountry = (c: ShippingCountry) => {
    setEditingCountry(c)
    setCountryForm({ name_en: c.name_en, name_ar: c.name_ar, price: c.price, active: c.active })
    setCountryModal(true)
  }

  const saveCountry = async () => {
    setSaving(true)
    try {
      const url = editingCountry ? `/api/admin/shipping/${editingCountry.id}` : "/api/admin/shipping"
      const method = editingCountry ? "PUT" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(countryForm),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      toast.success(isRtl ? "تم الحفظ" : "Saved")
      setCountryModal(false)
      fetchCountries()
    } catch (err: any) {
      toast.error(err.message || (isRtl ? "خطأ في الحفظ" : "Save failed"))
    } finally {
      setSaving(false)
    }
  }

  const openAddZone = (countryId: string) => {
    setZoneCountryId(countryId)
    setEditingZone(null)
    setZoneForm({ ...emptyZone })
    setZoneModal(true)
  }

  const openEditZone = (z: ShippingZone) => {
    setZoneCountryId(z.country_id)
    setEditingZone(z)
    setZoneForm({ name_en: z.name_en, name_ar: z.name_ar, price: z.price, active: z.active })
    setZoneModal(true)
  }

  const saveZone = async () => {
    setSaving(true)
    try {
      const url = editingZone ? `/api/admin/shipping-zones/${editingZone.id}` : "/api/admin/shipping-zones"
      const method = editingZone ? "PUT" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...zoneForm, country_id: zoneCountryId }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      toast.success(isRtl ? "تم الحفظ" : "Saved")
      setZoneModal(false)
      fetchCountries()
    } catch (err: any) {
      toast.error(err.message || (isRtl ? "خطأ في الحفظ" : "Save failed"))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      const res = await fetch(
        `/api/admin/${deleteTarget.type === "country" ? "shipping" : "shipping-zones"}/${deleteTarget.id}`,
        { method: "DELETE" }
      )
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      toast.success(isRtl ? "تم الحذف" : "Deleted")
      setDeleteTarget(null)
      fetchCountries()
    } catch (err: any) {
      toast.error(err.message || (isRtl ? "خطأ في الحذف" : "Delete failed"))
    }
  }

  const toggleCountryActive = async (c: ShippingCountry) => {
    try {
      const res = await fetch(`/api/admin/shipping/${c.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !c.active }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setCountries((prev) => prev.map((x) => (x.id === c.id ? { ...x, active: !c.active } : x)))
    } catch {
      toast.error(isRtl ? "خطأ" : "Error")
    }
  }

  const toggleZoneActive = async (z: ShippingZone) => {
    try {
      const res = await fetch(`/api/admin/shipping-zones/${z.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !z.active }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setCountries((prev) =>
        prev.map((c) => ({
          ...c,
          zones: (c.zones || []).map((x) => (x.id === z.id ? { ...x, active: !z.active } : x)),
        }))
      )
    } catch {
      toast.error(isRtl ? "خطأ" : "Error")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-[#f97316] border-t-transparent rounded-full" />
      </div>
    )
  }

  const inputCls =
    "w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316]"

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{isRtl ? "رسوم الشحن" : "Shipping Fees"}</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {isRtl
              ? "حدد سعر شحن لكل دولة ولكل محافظة داخل الدولة"
              : "Set a shipping price per country and per region inside each country"}
          </p>
        </div>
        <button
          onClick={openAddCountry}
          className="inline-flex items-center gap-2 bg-[#f97316] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#fb923c] transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          {isRtl ? "إضافة دولة" : "Add Country"}
        </button>
      </div>

      {countries.length === 0 ? (
        <div className="bg-white rounded-xl border border-zinc-200 p-12 text-center">
          <Truck className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
          <p className="text-zinc-500 mb-1">{isRtl ? "لا توجد دول بعد" : "No countries yet"}</p>
          <p className="text-sm text-zinc-400">
            {isRtl ? "أضف أول دولة مثل سوريا ثم حدد سعر كل محافظة" : "Add your first country (e.g. Syria), then set a price per region"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {countries.map((c) => (
            <div key={c.id} className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3">
                <button
                  onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                  className="p-1 hover:bg-zinc-100 rounded cursor-pointer"
                >
                  {expanded === c.id ? (
                    <ChevronUp className="w-4 h-4 text-zinc-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-zinc-400" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {isRtl ? c.name_ar || c.name_en : c.name_en || c.name_ar}
                  </p>
                  <p className="text-xs text-zinc-400">
                    {(c.zones || []).length} {isRtl ? "محافظة" : "regions"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-[#f97316]">${c.price}</span>
                  <button
                    onClick={() => toggleCountryActive(c)}
                    className={`px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer ${
                      c.active
                        ? "bg-green-100 text-green-700 hover:bg-green-200"
                        : "bg-red-100 text-red-700 hover:bg-red-200"
                    }`}
                  >
                    {c.active ? (isRtl ? "نشط" : "Active") : (isRtl ? "غير نشط" : "Inactive")}
                  </button>
                  <button
                    onClick={() => openEditCountry(c)}
                    className="p-1.5 rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer"
                  >
                    <Pencil className="w-4 h-4 text-zinc-400" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget({ type: "country", id: c.id, name: isRtl ? c.name_ar : c.name_en })}
                    className="p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>

              {expanded === c.id && (
                <div className="border-t border-zinc-100 px-4 py-3 bg-zinc-50/50">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-zinc-600 flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-[#f97316]" />
                      {isRtl ? "المحافظات" : "Regions"}
                    </p>
                    <button
                      onClick={() => openAddZone(c.id)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-[#f97316] hover:text-[#ea580c] cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {isRtl ? "إضافة محافظة" : "Add Region"}
                    </button>
                  </div>
                  {(c.zones || []).length === 0 ? (
                    <p className="text-xs text-zinc-400 py-2">
                      {isRtl
                        ? "لا توجد محافظات — أضف محافظات لتحديد سعر مختلف لكل منها"
                        : "No regions yet — add regions to set a different price for each"}
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {(c.zones || []).map((z) => (
                        <div
                          key={z.id}
                          className="flex items-center gap-3 px-3 py-2 bg-white rounded-lg border border-zinc-100"
                        >
                          <p className="flex-1 text-sm truncate">
                            {isRtl ? z.name_ar || z.name_en : z.name_en || z.name_ar}
                          </p>
                          <span className="text-sm font-semibold text-[#f97316]">${z.price}</span>
                          <button
                            onClick={() => toggleZoneActive(z)}
                            className={`px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer ${
                              z.active
                                ? "bg-green-100 text-green-700 hover:bg-green-200"
                                : "bg-red-100 text-red-700 hover:bg-red-200"
                            }`}
                          >
                            {z.active ? (isRtl ? "نشط" : "Active") : (isRtl ? "غير نشط" : "Inactive")}
                          </button>
                          <button
                            onClick={() => openEditZone(z)}
                            className="p-1 rounded hover:bg-zinc-100 cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5 text-zinc-400" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget({ type: "zone", id: z.id, name: isRtl ? z.name_ar : z.name_en })}
                            className="p-1 rounded hover:bg-red-50 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {countryModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setCountryModal(false)} />
          <div className="relative bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full max-w-md max-h-[94vh] overflow-y-auto z-10">
            <div className="sticky top-0 bg-white border-b border-zinc-200 px-4 sm:px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {editingCountry
                  ? isRtl ? "تعديل دولة" : "Edit Country"
                  : isRtl ? "إضافة دولة" : "Add Country"}
              </h2>
              <button onClick={() => setCountryModal(false)} className="p-1 hover:bg-zinc-100 rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">{isRtl ? "الاسم (إنجليزي)" : "Name (English)"}</label>
                <input
                  type="text"
                  value={countryForm.name_en}
                  onChange={(e) => setCountryForm({ ...countryForm, name_en: e.target.value })}
                  className={inputCls}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">{isRtl ? "الاسم (عربي)" : "Name (Arabic)"}</label>
                <input
                  type="text"
                  value={countryForm.name_ar}
                  onChange={(e) => setCountryForm({ ...countryForm, name_ar: e.target.value })}
                  className={inputCls}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  {isRtl ? "سعر الشحن للدولة ($)" : "Shipping price for country ($)"}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={countryForm.price}
                  onChange={(e) => setCountryForm({ ...countryForm, price: parseFloat(e.target.value) || 0 })}
                  className={inputCls}
                  required
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={countryForm.active}
                  onChange={(e) => setCountryForm({ ...countryForm, active: e.target.checked })}
                  className="rounded border-zinc-300 text-[#f97316] focus:ring-[#f97316]"
                />
                {isRtl ? "نشط" : "Active"}
              </label>
            </div>
            <div className="sticky bottom-0 bg-white border-t border-zinc-200 px-4 sm:px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={() => setCountryModal(false)}
                className="px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100 rounded-lg cursor-pointer"
              >
                {isRtl ? "إلغاء" : "Cancel"}
              </button>
              <button
                onClick={saveCountry}
                disabled={saving}
                className="px-4 py-2 text-sm bg-[#f97316] text-white rounded-lg hover:bg-[#fb923c] disabled:opacity-50 transition-colors inline-flex items-center gap-2 cursor-pointer"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {isRtl ? "حفظ" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {zoneModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setZoneModal(false)} />
          <div className="relative bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full max-w-md max-h-[94vh] overflow-y-auto z-10">
            <div className="sticky top-0 bg-white border-b border-zinc-200 px-4 sm:px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {editingZone
                  ? isRtl ? "تعديل محافظة" : "Edit Region"
                  : isRtl ? "إضافة محافظة" : "Add Region"}
              </h2>
              <button onClick={() => setZoneModal(false)} className="p-1 hover:bg-zinc-100 rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">{isRtl ? "الاسم (إنجليزي)" : "Name (English)"}</label>
                <input
                  type="text"
                  value={zoneForm.name_en}
                  onChange={(e) => setZoneForm({ ...zoneForm, name_en: e.target.value })}
                  className={inputCls}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">{isRtl ? "الاسم (عربي)" : "Name (Arabic)"}</label>
                <input
                  type="text"
                  value={zoneForm.name_ar}
                  onChange={(e) => setZoneForm({ ...zoneForm, name_ar: e.target.value })}
                  className={inputCls}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  {isRtl ? "سعر الشحن ($)" : "Shipping price ($)"}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={zoneForm.price}
                  onChange={(e) => setZoneForm({ ...zoneForm, price: parseFloat(e.target.value) || 0 })}
                  className={inputCls}
                  required
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={zoneForm.active}
                  onChange={(e) => setZoneForm({ ...zoneForm, active: e.target.checked })}
                  className="rounded border-zinc-300 text-[#f97316] focus:ring-[#f97316]"
                />
                {isRtl ? "نشط" : "Active"}
              </label>
            </div>
            <div className="sticky bottom-0 bg-white border-t border-zinc-200 px-4 sm:px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={() => setZoneModal(false)}
                className="px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100 rounded-lg cursor-pointer"
              >
                {isRtl ? "إلغاء" : "Cancel"}
              </button>
              <button
                onClick={saveZone}
                disabled={saving}
                className="px-4 py-2 text-sm bg-[#f97316] text-white rounded-lg hover:bg-[#fb923c] disabled:opacity-50 transition-colors inline-flex items-center gap-2 cursor-pointer"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {isRtl ? "حفظ" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-sm z-10">
            <h3 className="text-lg font-semibold mb-2">{isRtl ? "تأكيد الحذف" : "Confirm Delete"}</h3>
            <p className="text-sm text-zinc-500 mb-6">
              {isRtl
                ? `هل أنت متأكد من حذف "${deleteTarget.name}"؟`
                : `Are you sure you want to delete "${deleteTarget.name}"?`}
              {deleteTarget.type === "country" && (isRtl ? " ستُحذف كل محافظاتها أيضًا." : " All its regions will be deleted too.")}
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100 rounded-lg cursor-pointer"
              >
                {isRtl ? "إلغاء" : "Cancel"}
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 cursor-pointer"
              >
                {isRtl ? "حذف" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
