"use client"

import { useEffect, useState, useCallback } from "react"
import { Plus, Pencil, Trash2, Star, X, Search, Check, Loader2 } from "lucide-react"
import toast from "react-hot-toast"
import type { Product, ProductCategory } from "@/types"

const defaultProduct: Partial<Product> = {
  name_en: "",
  name_ar: "",
  description_en: "",
  description_ar: "",
  price: 0,
  compare_price: 0,
  category_id: "",
  sizes: [],
  colors: [],
  stock: 0,
  images: [],
  featured: false,
  active: true,
}

export default function AdminProductsPage({ params: paramsPromise }: { params: Promise<{ locale: string }> }) {
  const [locale, setLocale] = useState("en")
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState<Partial<Product>>({ ...defaultProduct })
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [sizeInput, setSizeInput] = useState("")
  const [colorInput, setColorInput] = useState("")
  const [imageInput, setImageInput] = useState("")

  useEffect(() => { paramsPromise.then((p) => setLocale(p.locale)) }, [paramsPromise])
  const isRtl = locale === "ar"

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/products")
      const data = await res.json()
      if (Array.isArray(data)) setProducts(data)
    } catch { toast.error(isRtl ? "خطأ في تحميل المنتجات" : "Failed to load products") }
  }, [isRtl])

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/categories")
      const data = await res.json()
      if (Array.isArray(data)) setCategories(data)
    } catch {}
  }, [])

  useEffect(() => {
    Promise.all([fetchProducts(), fetchCategories()]).finally(() => setLoading(false))
  }, [fetchProducts, fetchCategories])

  const filtered = products.filter((p) => {
    if (!search) return true
    const s = search.toLowerCase()
    return p.name_en?.toLowerCase().includes(s) || p.name_ar?.toLowerCase().includes(s)
  })

  const openAdd = () => {
    setEditing(null)
    setForm({ ...defaultProduct })
    setModalOpen(true)
  }

  const openEdit = (product: Product) => {
    setEditing(product)
    setForm({ ...product })
    setModalOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const url = editing ? `/api/admin/products/${editing.id}` : "/api/admin/products"
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
      fetchProducts()
    } catch (err: any) {
      toast.error(err.message || (isRtl ? "خطأ في الحفظ" : "Save failed"))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      const res = await fetch(`/api/admin/products/${deleteId}`, { method: "DELETE" })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      toast.success(isRtl ? "تم الحذف" : "Deleted")
      setDeleteId(null)
      fetchProducts()
    } catch (err: any) {
      toast.error(err.message || (isRtl ? "خطأ في الحذف" : "Delete failed"))
    }
  }

  const toggleStatus = async (product: Product) => {
    try {
      const res = await fetch(`/api/admin/products/${product.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !product.active }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, active: !p.active } : p)))
      toast.success(isRtl ? "تم التحديث" : "Updated")
    } catch {
      toast.error(isRtl ? "خطأ" : "Error")
    }
  }

  const toggleFeatured = async (product: Product) => {
    try {
      const res = await fetch(`/api/admin/products/${product.id}/featured`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featured: !product.featured }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, featured: !p.featured } : p)))
      toast.success(isRtl ? "تم التحديث" : "Updated")
    } catch {
      toast.error(isRtl ? "خطأ" : "Error")
    }
  }

  const addSize = () => {
    if (sizeInput && !(form.sizes || []).includes(sizeInput)) {
      setForm({ ...form, sizes: [...(form.sizes || []), sizeInput] })
      setSizeInput("")
    }
  }

  const removeSize = (s: string) => {
    setForm({ ...form, sizes: (form.sizes || []).filter((x) => x !== s) })
  }

  const addColor = () => {
    if (colorInput && !(form.colors || []).includes(colorInput)) {
      setForm({ ...form, colors: [...(form.colors || []), colorInput] })
      setColorInput("")
    }
  }

  const removeColor = (c: string) => {
    setForm({ ...form, colors: (form.colors || []).filter((x) => x !== c) })
  }

  const addImage = () => {
    if (imageInput && !(form.images || []).includes(imageInput)) {
      setForm({ ...form, images: [...(form.images || []), imageInput] })
      setImageInput("")
    }
  }

  const removeImage = (url: string) => {
    setForm({ ...form, images: (form.images || []).filter((i) => i !== url) })
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
        <h1 className="text-2xl font-bold">{isRtl ? "المنتجات" : "Products"}</h1>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 bg-[#f97316] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#fb923c] transition-colors"
        >
          <Plus className="w-4 h-4" />
          {isRtl ? "إضافة منتج" : "Add Product"}
        </button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={isRtl ? "بحث..." : "Search..."}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316]"
        />
      </div>

      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-zinc-500">{isRtl ? "الصورة" : "Image"}</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500">{isRtl ? "الاسم" : "Name"}</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500">{isRtl ? "السعر" : "Price"}</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500">{isRtl ? "المخزون" : "Stock"}</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500">{isRtl ? "الحالة" : "Status"}</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500">{isRtl ? "مميز" : "Featured"}</th>
                <th className="text-right px-4 py-3 font-medium text-zinc-500">{isRtl ? "الإجراءات" : "Actions"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-zinc-400">
                    {isRtl ? "لا توجد منتجات" : "No products"}
                  </td>
                </tr>
              ) : (
                filtered.map((product) => (
                  <tr key={product.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3">
                      {product.images?.[0] ? (
                        <img src={product.images[0]} alt="" className="w-10 h-10 rounded-lg object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-300 text-xs">
                          {isRtl ? "لا" : "NA"}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {isRtl ? product.name_ar || product.name_en : product.name_en || product.name_ar}
                    </td>
                    <td className="px-4 py-3">${product.price?.toFixed(2)}</td>
                    <td className="px-4 py-3">{product.stock}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleStatus(product)}
                        className={`px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer ${
                          product.active
                            ? "bg-green-100 text-green-700 hover:bg-green-200"
                            : "bg-red-100 text-red-700 hover:bg-red-200"
                        }`}
                      >
                        {product.active
                          ? isRtl ? "نشط" : "Active"
                          : isRtl ? "غير نشط" : "Inactive"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleFeatured(product)} className="cursor-pointer">
                        <Star
                          className={`w-4 h-4 ${
                            product.featured ? "text-[#f97316] fill-[#f97316]" : "text-zinc-300"
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(product)}
                          className="p-1.5 rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer"
                        >
                          <Pencil className="w-4 h-4 text-zinc-400" />
                        </button>
                        <button
                          onClick={() => setDeleteId(product.id)}
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
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 pb-10">
          <div className="fixed inset-0 bg-black/50" onClick={() => setModalOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto z-10">
            <div className="sticky top-0 bg-white border-b border-zinc-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {editing
                  ? isRtl ? "تعديل منتج" : "Edit Product"
                  : isRtl ? "إضافة منتج" : "Add Product"}
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
                    onChange={(e) => setForm({ ...form, name_en: e.target.value })}
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">{isRtl ? "الوصف (إنجليزي)" : "Description (English)"}</label>
                  <textarea
                    value={form.description_en || ""}
                    onChange={(e) => setForm({ ...form, description_en: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">{isRtl ? "الوصف (عربي)" : "Description (Arabic)"}</label>
                  <textarea
                    value={form.description_ar || ""}
                    onChange={(e) => setForm({ ...form, description_ar: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">{isRtl ? "السعر" : "Price"}</label>
                  <input
                    type="number"
                    value={form.price || 0}
                    onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">{isRtl ? "السعر الأصلي" : "Compare Price"}</label>
                  <input
                    type="number"
                    value={form.compare_price || 0}
                    onChange={(e) => setForm({ ...form, compare_price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">{isRtl ? "المخزون" : "Stock"}</label>
                  <input
                    type="number"
                    value={form.stock || 0}
                    onChange={(e) => setForm({ ...form, stock: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">{isRtl ? "التصنيف" : "Category"}</label>
                <select
                  value={form.category_id || ""}
                  onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316]"
                >
                  <option value="">{isRtl ? "اختر تصنيف" : "Select category"}</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {isRtl ? c.name_ar || c.name_en : c.name_en || c.name_ar}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">{isRtl ? "المقاسات" : "Sizes"}</label>
                <div className="flex gap-2 mb-2 flex-wrap">
                  {(form.sizes || []).map((s) => (
                    <span key={s} className="inline-flex items-center gap-1 px-2 py-1 bg-zinc-100 rounded-md text-xs">
                      {s}
                      <button onClick={() => removeSize(s)} className="cursor-pointer"><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={sizeInput}
                    onChange={(e) => setSizeInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSize())}
                    placeholder={isRtl ? "أضف مقاس..." : "Add size..."}
                    className="flex-1 px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316]"
                  />
                  <button onClick={addSize} className="px-3 py-2 bg-zinc-100 rounded-lg text-sm hover:bg-zinc-200 cursor-pointer">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">{isRtl ? "الألوان" : "Colors"}</label>
                <div className="flex gap-2 mb-2 flex-wrap">
                  {(form.colors || []).map((c) => (
                    <span key={c} className="inline-flex items-center gap-1 px-2 py-1 bg-zinc-100 rounded-md text-xs">
                      <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: c }} />
                      {c}
                      <button onClick={() => removeColor(c)} className="cursor-pointer"><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={colorInput || "#000000"}
                    onChange={(e) => setColorInput(e.target.value)}
                    className="w-10 h-10 p-0.5 border border-zinc-200 rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    value={colorInput}
                    onChange={(e) => setColorInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addColor())}
                    placeholder="#hex"
                    className="flex-1 px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316]"
                  />
                  <button onClick={addColor} className="px-3 py-2 bg-zinc-100 rounded-lg text-sm hover:bg-zinc-200 cursor-pointer">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">{isRtl ? "الصور" : "Images"}</label>
                <div className="flex gap-2 mb-2 flex-wrap">
                  {(form.images || []).map((url) => (
                    <div key={url} className="relative group">
                      <img src={url} alt="" className="w-16 h-16 rounded-lg object-cover border" />
                      <button
                        onClick={() => removeImage(url)}
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={imageInput}
                    onChange={(e) => setImageInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addImage())}
                    placeholder={isRtl ? "رابط الصورة..." : "Image URL..."}
                    className="flex-1 px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316]"
                  />
                  <button onClick={addImage} className="px-3 py-2 bg-zinc-100 rounded-lg text-sm hover:bg-zinc-200 cursor-pointer">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.featured || false}
                    onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                    className="rounded border-zinc-300 text-[#f97316] focus:ring-[#f97316]"
                  />
                  {isRtl ? "مميز" : "Featured"}
                </label>
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
                className="px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
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
              <button
                onClick={() => setDeleteId(null)}
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
