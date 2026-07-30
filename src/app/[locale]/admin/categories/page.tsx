"use client"

import { useEffect, useState, useCallback } from "react"
import { Plus, Pencil, Trash2, X, ArrowUp, ArrowDown, Loader2 } from "lucide-react"
import toast from "react-hot-toast"
import type { ProductCategory } from "@/types"

const defaultCat: Partial<ProductCategory> = {
  name_en: "",
  name_ar: "",
  slug: "",
  image_url: "",
  active: true,
  sort_order: 0,
}

export default function AdminCategoriesPage({ params: paramsPromise }: { params: Promise<{ locale: string }> }) {
  const [locale, setLocale] = useState("en")
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ProductCategory | null>(null)
  const [form, setForm] = useState<Partial<ProductCategory>>({ ...defaultCat })
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  useEffect(() => { paramsPromise.then((p) => setLocale(p.locale)) }, [paramsPromise])
  const isRtl = locale === "ar"

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/categories")
      const data = await res.json()
      if (Array.isArray(data)) setCategories(data)
    } catch {
      toast.error(isRtl ? "خطأ في تحميل التصنيفات" : "Failed to load categories")
    } finally {
      setLoading(false)
    }
  }, [isRtl])

  useEffect(() => { fetchCategories() }, [fetchCategories])

  const openAdd = () => {
    setEditing(null)
    setForm({ ...defaultCat, sort_order: categories.length })
    setModalOpen(true)
  }

  const openEdit = (cat: ProductCategory) => {
    setEditing(cat)
    setForm({ ...cat })
    setModalOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const url = editing ? `/api/admin/categories/${editing.id}` : "/api/admin/categories"
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
      fetchCategories()
    } catch (err: any) {
      toast.error(err.message || (isRtl ? "خطأ في الحفظ" : "Save failed"))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      const res = await fetch(`/api/admin/categories/${deleteId}`, { method: "DELETE" })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      toast.success(isRtl ? "تم الحذف" : "Deleted")
      setDeleteId(null)
      fetchCategories()
    } catch (err: any) {
      toast.error(err.message || (isRtl ? "خطأ في الحذف" : "Delete failed"))
    }
  }

  const toggleActive = async (cat: ProductCategory) => {
    try {
      const res = await fetch(`/api/admin/categories/${cat.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !cat.active }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setCategories((prev) => prev.map((c) => (c.id === cat.id ? { ...c, active: !cat.active } : c)))
    } catch {
      toast.error(isRtl ? "خطأ" : "Error")
    }
  }

  const moveUp = (index: number) => {
    if (index === 0) return
    const items = [...categories]
    const temp = items[index]
    items[index] = items[index - 1]
    items[index - 1] = temp
    items.forEach((c, i) => { c.sort_order = i })
    setCategories(items)
    items.forEach((c) => {
      fetch(`/api/admin/categories/${c.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sort_order: c.sort_order }),
      }).catch(() => {})
    })
  }

  const moveDown = (index: number) => {
    if (index === categories.length - 1) return
    const items = [...categories]
    const temp = items[index]
    items[index] = items[index + 1]
    items[index + 1] = temp
    items.forEach((c, i) => { c.sort_order = i })
    setCategories(items)
    items.forEach((c) => {
      fetch(`/api/admin/categories/${c.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sort_order: c.sort_order }),
      }).catch(() => {})
    })
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
        <h1 className="text-2xl font-bold">{isRtl ? "التصنيفات" : "Categories"}</h1>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 bg-[#f97316] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#fb923c] transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          {isRtl ? "إضافة تصنيف" : "Add Category"}
        </button>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50">
              <tr>
                <th className="w-16 px-4 py-3 font-medium text-zinc-500">{isRtl ? "ترتيب" : "Order"}</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500">{isRtl ? "الاسم" : "Name"}</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500">Slug</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500">{isRtl ? "الحالة" : "Active"}</th>
                <th className="text-right px-4 py-3 font-medium text-zinc-500">{isRtl ? "الإجراءات" : "Actions"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {categories.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-zinc-400">
                    {isRtl ? "لا توجد تصنيفات" : "No categories"}
                  </td>
                </tr>
              ) : (
                categories.map((cat, index) => (
                  <tr key={cat.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => moveUp(index)}
                          disabled={index === 0}
                          className="p-0.5 hover:bg-zinc-100 rounded disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowUp className="w-3.5 h-3.5 text-zinc-400" />
                        </button>
                        <span className="text-xs text-zinc-400 w-4 text-center">{cat.sort_order}</span>
                        <button
                          onClick={() => moveDown(index)}
                          disabled={index === categories.length - 1}
                          className="p-0.5 hover:bg-zinc-100 rounded disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowDown className="w-3.5 h-3.5 text-zinc-400" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {isRtl ? cat.name_ar || cat.name_en : cat.name_en || cat.name_ar}
                    </td>
                    <td className="px-4 py-3 text-zinc-500">{cat.slug}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleActive(cat)}
                        className={`px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer ${
                          cat.active
                            ? "bg-green-100 text-green-700 hover:bg-green-200"
                            : "bg-red-100 text-red-700 hover:bg-red-200"
                        }`}
                      >
                        {cat.active
                          ? isRtl ? "نشط" : "Active"
                          : isRtl ? "غير نشط" : "Inactive"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(cat)}
                          className="p-1.5 rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer"
                        >
                          <Pencil className="w-4 h-4 text-zinc-400" />
                        </button>
                        <button
                          onClick={() => setDeleteId(cat.id)}
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
                  ? isRtl ? "تعديل تصنيف" : "Edit Category"
                  : isRtl ? "إضافة تصنيف" : "Add Category"}
              </h2>
              <button onClick={() => setModalOpen(false)} className="p-1 hover:bg-zinc-100 rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">{isRtl ? "الاسم (إنجليزي)" : "Name (English)"}</label>
                  <input
                    type="text"
                    value={form.name_en || ""}
                    onChange={(e) => setForm({ ...form, name_en: e.target.value, slug: editing ? form.slug : e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") })}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">{isRtl ? "الاسم (عربي)" : "Name (Arabic)"}</label>
                  <input
                    type="text"
                    value={form.name_ar || ""}
                    onChange={(e) => setForm({ ...form, name_ar: e.target.value })}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Slug</label>
                <input
                  type="text"
                  value={form.slug || ""}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">{isRtl ? "رابط الصورة" : "Image URL"}</label>
                <input
                  type="text"
                  value={form.image_url || ""}
                  onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">{isRtl ? "ترتيب" : "Sort Order"}</label>
                  <input
                    type="number"
                    value={form.sort_order ?? 0}
                    onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316]"
                  />
                </div>
                <div className="flex items-end pb-2">
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
