"use client"

import { useEffect, useState, useCallback } from "react"
import { Plus, Pencil, Trash2, X, Loader2 } from "lucide-react"
import toast from "react-hot-toast"
import type { Coupon } from "@/types"

const defaultCoupon: Partial<Coupon> = {
  code: "",
  discount_type: "percentage",
  discount_value: 0,
  min_order: 0,
  max_uses: 0,
  expires_at: "",
  active: true,
}

export default function AdminCouponsPage({ params: paramsPromise }: { params: Promise<{ locale: string }> }) {
  const [locale, setLocale] = useState("en")
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Coupon | null>(null)
  const [form, setForm] = useState<Partial<Coupon>>({ ...defaultCoupon })
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  useEffect(() => { paramsPromise.then((p) => setLocale(p.locale)) }, [paramsPromise])
  const isRtl = locale === "ar"

  const fetchCoupons = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/coupons")
      const data = await res.json()
      if (Array.isArray(data)) setCoupons(data)
    } catch {
      toast.error(isRtl ? "خطأ في تحميل الكوبونات" : "Failed to load coupons")
    } finally {
      setLoading(false)
    }
  }, [isRtl])

  useEffect(() => { fetchCoupons() }, [fetchCoupons])

  const openAdd = () => {
    setEditing(null)
    setForm({ ...defaultCoupon })
    setModalOpen(true)
  }

  const openEdit = (coupon: Coupon) => {
    setEditing(coupon)
    setForm({
      ...coupon,
      expires_at: coupon.expires_at ? coupon.expires_at.slice(0, 10) : "",
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const url = editing ? `/api/admin/coupons/${editing.id}` : "/api/admin/coupons"
      const method = editing ? "PUT" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      toast.success(isRtl ? "تم الحفظ" : "Saved")
      setModalOpen(false)
      fetchCoupons()
    } catch (err: any) {
      toast.error(err.message || (isRtl ? "خطأ في الحفظ" : "Save failed"))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      const res = await fetch(`/api/admin/coupons/${deleteId}`, { method: "DELETE" })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      toast.success(isRtl ? "تم الحذف" : "Deleted")
      setDeleteId(null)
      fetchCoupons()
    } catch (err: any) {
      toast.error(err.message || (isRtl ? "خطأ في الحذف" : "Delete failed"))
    }
  }

  const toggleActive = async (coupon: Coupon) => {
    try {
      const res = await fetch(`/api/admin/coupons/${coupon.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !coupon.active }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setCoupons((prev) => prev.map((c) => (c.id === coupon.id ? { ...c, active: !coupon.active } : c)))
    } catch {
      toast.error(isRtl ? "خطأ" : "Error")
    }
  }

  const isExpired = (coupon: Coupon) => {
    if (!coupon.expires_at) return false
    return new Date(coupon.expires_at) < new Date()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-[#f97316] border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{isRtl ? "كوبونات الخصم" : "Coupons"}</h1>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 bg-[#f97316] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#fb923c] transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          {isRtl ? "إضافة كوبون" : "Add Coupon"}
        </button>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-zinc-500">{isRtl ? "الكود" : "Code"}</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500">{isRtl ? "النوع" : "Type"}</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500">{isRtl ? "القيمة" : "Value"}</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500">{isRtl ? "أقل طلب" : "Min Order"}</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500">{isRtl ? "استخدام" : "Used/Max"}</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500">{isRtl ? "ينتهي" : "Expires"}</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500">{isRtl ? "الحالة" : "Status"}</th>
                <th className="text-right px-4 py-3 font-medium text-zinc-500">{isRtl ? "الإجراءات" : "Actions"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {coupons.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-zinc-400">
                    {isRtl ? "لا توجد كوبونات" : "No coupons"}
                  </td>
                </tr>
              ) : (
                coupons.map((coupon) => (
                  <tr key={coupon.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3 font-mono font-medium">{coupon.code}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-100">
                        {coupon.discount_type === "percentage"
                          ? isRtl ? "نسبة مئوية" : "%"
                          : isRtl ? "قيمة ثابتة" : "$"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {coupon.discount_type === "percentage" ? `${coupon.discount_value}%` : `$${coupon.discount_value.toFixed(2)}`}
                    </td>
                    <td className="px-4 py-3 text-zinc-500">${coupon.min_order?.toFixed(2)}</td>
                    <td className="px-4 py-3">{coupon.used_count || 0}/{coupon.max_uses || "∞"}</td>
                    <td className="px-4 py-3 text-zinc-500">
                      {coupon.expires_at
                        ? new Date(coupon.expires_at).toLocaleDateString(isRtl ? "ar" : "en-US")
                        : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleActive(coupon)}
                        className={`px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer ${
                          !coupon.active || isExpired(coupon)
                            ? "bg-red-100 text-red-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {isExpired(coupon)
                          ? isRtl ? "منتهي" : "Expired"
                          : coupon.active
                          ? isRtl ? "نشط" : "Active"
                          : isRtl ? "غير نشط" : "Inactive"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(coupon)}
                          className="p-1.5 rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer"
                        >
                          <Pencil className="w-4 h-4 text-zinc-400" />
                        </button>
                        <button
                          onClick={() => setDeleteId(coupon.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 pb-10">
          <div className="fixed inset-0 bg-black/50" onClick={() => setModalOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg z-10">
            <div className="sticky top-0 bg-white border-b border-zinc-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {editing
                  ? isRtl ? "تعديل كوبون" : "Edit Coupon"
                  : isRtl ? "إضافة كوبون" : "Add Coupon"}
              </h2>
              <button onClick={() => setModalOpen(false)} className="p-1 hover:bg-zinc-100 rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">{isRtl ? "الكود" : "Code"}</label>
                <input
                  type="text"
                  value={form.code || ""}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">{isRtl ? "نوع الخصم" : "Discount Type"}</label>
                  <select
                    value={form.discount_type || "percentage"}
                    onChange={(e) => setForm({ ...form, discount_type: e.target.value as "percentage" | "fixed" })}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316]"
                  >
                    <option value="percentage">{isRtl ? "نسبة مئوية" : "Percentage"}</option>
                    <option value="fixed">{isRtl ? "قيمة ثابتة" : "Fixed Amount"}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">{isRtl ? "قيمة الخصم" : "Discount Value"}</label>
                  <input
                    type="number"
                    value={form.discount_value || 0}
                    onChange={(e) => setForm({ ...form, discount_value: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">{isRtl ? "أقل طلب" : "Min Order"}</label>
                  <input
                    type="number"
                    value={form.min_order || 0}
                    onChange={(e) => setForm({ ...form, min_order: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">{isRtl ? "أقصى استخدام (0 = غير محدود)" : "Max Uses (0 = unlimited)"}</label>
                  <input
                    type="number"
                    value={form.max_uses || 0}
                    onChange={(e) => setForm({ ...form, max_uses: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">{isRtl ? "ينتهي في" : "Expires At"}</label>
                <input
                  type="date"
                  value={form.expires_at || ""}
                  onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316]"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.active ?? true}
                    onChange={(e) => setForm({ ...form, active: e.target.checked })}
                    className="rounded border-zinc-300 text-[#f97316] focus:ring-[#f97316]"
                  />
                  {isRtl ? "نشط" : "Active"}
                </label>
              </div>
            </div>
            <div className="sticky bottom-0 bg-white border-t border-zinc-200 px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100 rounded-lg cursor-pointer"
              >
                {isRtl ? "إلغاء" : "Cancel"}
              </button>
              <button
                onClick={handleSave}
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

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setDeleteId(null)} />
          <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-sm z-10">
            <h3 className="text-lg font-semibold mb-2">{isRtl ? "تأكيد الحذف" : "Confirm Delete"}</h3>
            <p className="text-sm text-zinc-500 mb-6">
              {isRtl ? "هل أنت متأكد؟ لا يمكن التراجع عن هذا الإجراء." : "Are you sure? This action cannot be undone."}
            </p>
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100 rounded-lg cursor-pointer">
                {isRtl ? "إلغاء" : "Cancel"}
              </button>
              <button onClick={handleDelete} className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 cursor-pointer">
                {isRtl ? "حذف" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
