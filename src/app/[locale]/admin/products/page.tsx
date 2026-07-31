"use client"

import { useEffect, useState, useCallback } from "react"
import Image from "next/image"
import { Plus, Pencil, Trash2, Star, X, Search, Check, Loader2, Image as ImageIcon, Upload, FileIcon } from "lucide-react"
import toast from "react-hot-toast"
import type { Product, ProductCategory, Media } from "@/types"
import { colorBackground, colorLabel } from "@/lib/colors"

const presetColors = [
  "#ffffff", "#000000", "#f5f5f5", "#9ca3af", "#6b7280", "#374151",
  "#ef4444", "#f97316", "#f59e0b", "#facc15", "#eab308", "#a3e635",
  "#22c55e", "#10b981", "#14b8a6", "#06b6d4", "#0ea5e9", "#3b82f6",
  "#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899", "#f43f5e",
]

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
  const [mediaItems, setMediaItems] = useState<Media[]>([])
  const [mediaModalOpen, setMediaModalOpen] = useState(false)
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

  const fetchMedia = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/media")
      const data = await res.json()
      if (Array.isArray(data)) setMediaItems(data)
    } catch {}
  }, [])

  useEffect(() => {
    Promise.all([fetchProducts(), fetchCategories(), fetchMedia()]).finally(() => setLoading(false))
  }, [fetchProducts, fetchCategories, fetchMedia])

  const filtered = products.filter((p) => {
    if (!search) return true
    const s = search.toLowerCase()
    return p.name_en?.toLowerCase().includes(s) || p.name_ar?.toLowerCase().includes(s)
  })

  const openAdd = () => {
    setEditing(null)
    setForm({ ...defaultProduct, size_stock: {} })
    setModalOpen(true)
  }

  const openEdit = (product: Product) => {
    setEditing(product)
    const sizeStock: Record<string, number> = { ...(product.size_stock || {}) }
    for (const s of product.sizes || []) {
      if (!(s in sizeStock)) sizeStock[s] = 0
    }
    setForm({ ...product, size_stock: sizeStock })
    setModalOpen(true)
  }

  const totalStock = Object.values(form.size_stock || {}).reduce((a, b) => a + b, 0)

  const handleSave = async () => {
    setSaving(true)
    try {
      const url = editing ? `/api/admin/products/${editing.id}` : "/api/admin/products"
      const method = editing ? "PUT" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, stock: totalStock }),
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
      const sizeStock = { ...(form.size_stock || {}), [sizeInput]: 0 }
      setForm({ ...form, sizes: [...(form.sizes || []), sizeInput], size_stock: sizeStock })
      setSizeInput("")
    }
  }

  const removeSize = (s: string) => {
    const sizeStock = { ...(form.size_stock || {}) }
    delete sizeStock[s]
    setForm({ ...form, sizes: (form.sizes || []).filter((x) => x !== s), size_stock: sizeStock })
  }

  const setSizeQty = (s: string, qty: number) => {
    setForm({ ...form, size_stock: { ...(form.size_stock || {}), [s]: Math.max(0, qty) } })
  }

  const setColor = (c: string) => {
    if (!c) return
    setForm({
      ...form,
      colors: (form.colors || []).includes(c)
        ? (form.colors || []).filter((x) => x !== c)
        : [...(form.colors || []), c],
    })
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

  const uploadMedia = async (file: File, isVideo: boolean) => {
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      if (isVideo) {
        setForm({ ...form, video_url: data.url })
        toast.success(isRtl ? "تم رفع الفيديو" : "Video uploaded")
      } else {
        setForm({ ...form, images: [...(form.images || []), data.url] })
        toast.success(isRtl ? "تم رفع الصورة" : "Image uploaded")
      }
      fetchMedia()
      return true
    } catch (err: any) {
      toast.error(err.message || (isRtl ? "خطأ في الرفع" : "Upload failed"))
      return false
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    await uploadMedia(file, false)
    if (e.target) e.target.value = ""
  }

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    await uploadMedia(file, true)
    if (e.target) e.target.value = ""
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
                        <div className="w-10 h-10 rounded-lg overflow-hidden relative">
                          <Image src={product.images[0]} alt="" fill sizes="40px" className="object-cover" />
                        </div>
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
                  <label className="block text-sm font-medium text-zinc-700 mb-1">{isRtl ? "المخزون الكلي (تلقائي)" : "Total Stock (auto)"}</label>
                  <div className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm font-semibold text-zinc-700">
                    {totalStock}
                  </div>
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
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  {isRtl ? "المقاسات والكمية لكل مقاس" : "Sizes and quantity per size"}
                </label>
                <div className="space-y-2 mb-3">
                  {(form.sizes || []).map((s) => (
                    <div key={s} className="flex items-center gap-2">
                      <span className="w-16 text-center px-3 py-2 bg-zinc-100 rounded-lg text-sm font-medium">
                        {s}
                      </span>
                      <input
                        type="number"
                        min={0}
                        value={form.size_stock?.[s] ?? 0}
                        onChange={(e) => setSizeQty(s, parseInt(e.target.value) || 0)}
                        className="flex-1 px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316]"
                        placeholder={isRtl ? "عدد القطع" : "Quantity"}
                      />
                      <button onClick={() => removeSize(s)} className="p-2 hover:bg-red-50 rounded-lg cursor-pointer">
                        <X className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
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
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  {isRtl ? "الألوان (اختر لونًا واحدًا أو أكثر)" : "Colors (pick one or more)"}
                </label>
                <div className="flex gap-2 mb-3 flex-wrap">
                  {(form.colors || []).map((c) => (
                    <span key={c} className="inline-flex items-center gap-1.5 px-2 py-1 bg-zinc-100 rounded-md text-xs">
                      <span className="w-4 h-4 rounded-full inline-block border border-zinc-200" style={{ background: colorBackground(c) }} />
                      {colorLabel(c)}
                      <button onClick={() => removeColor(c)} className="cursor-pointer"><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {presetColors.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 cursor-pointer ${
                        (form.colors || []).includes(c) ? "border-[#f97316] scale-110" : "border-zinc-200"
                      }`}
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={colorInput || "#000000"}
                    onChange={(e) => { setColorInput(e.target.value); setColor(e.target.value) }}
                    className="w-10 h-10 p-0.5 border border-zinc-200 rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    value={colorInput}
                    onChange={(e) => setColorInput(e.target.value)}
                    placeholder={isRtl ? "كود اللون #hex" : "Color code #hex"}
                    className="flex-1 px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316]"
                  />
                  <button
                    type="button"
                    onClick={() => colorInput && setColor(colorInput)}
                    className="px-3 py-2 bg-[#f97316] text-white rounded-lg text-sm hover:bg-[#fb923c] cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">{isRtl ? "الصور" : "Images"}</label>
                <div className="flex gap-2 mb-2 flex-wrap">
                  {(form.images || []).map((url) => (
                    <div key={url} className="relative group">
                      <div className="w-16 h-16 rounded-lg overflow-hidden border relative">
                        <Image src={url} alt="" fill sizes="64px" className="object-cover" />
                      </div>
                      <button
                        onClick={() => removeImage(url)}
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mb-2 flex-wrap">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="product-image-upload"
                  />
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
                  <button
                    type="button"
                    onClick={() => document.getElementById("product-image-upload")?.click()}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-[#f97316]/10 text-[#f97316] rounded-lg text-sm font-medium hover:bg-[#f97316]/20 cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    {isRtl ? "رفع" : "Upload"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMediaModalOpen(true)}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-[#f97316]/10 text-[#f97316] rounded-lg text-sm font-medium hover:bg-[#f97316]/20 cursor-pointer"
                  >
                    <ImageIcon className="w-4 h-4" />
                    {isRtl ? "من المكتبة" : "From Library"}
                  </button>
                </div>
                {mediaItems.length === 0 && (
                  <p className="text-xs text-zinc-400">
                    {isRtl ? "لا توجد صور في المكتبة — ارفع صورًا من صفحة الوسائط أولاً" : "No images in library yet — upload some from the Media page first"}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  {isRtl ? "فيديو المنتج (اختياري)" : "Product Video (optional)"}
                </label>
                {form.video_url && (
                  <div className="relative mb-2">
                    <video
                      src={form.video_url}
                      controls
                      className="w-full max-h-48 rounded-xl border border-zinc-200 bg-zinc-900"
                    />
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, video_url: "" })}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 cursor-pointer"
                      title={isRtl ? "إزالة الفيديو" : "Remove video"}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                <div className="flex gap-2 flex-wrap">
                  <input
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime"
                    onChange={handleVideoUpload}
                    className="hidden"
                    id="product-video-upload"
                  />
                  <button
                    type="button"
                    onClick={() => document.getElementById("product-video-upload")?.click()}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-[#f97316]/10 text-[#f97316] rounded-lg text-sm font-medium hover:bg-[#f97316]/20 cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    {isRtl ? "رفع فيديو (حتى 50MB)" : "Upload Video (up to 50MB)"}
                  </button>
                  <input
                    type="text"
                    value={form.video_url || ""}
                    onChange={(e) => setForm({ ...form, video_url: e.target.value })}
                    placeholder={isRtl ? "أو الصق رابط الفيديو..." : "Or paste a video URL..."}
                    className="flex-1 px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316]"
                  />
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

      {mediaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 pb-10">
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
                    const alreadyAdded = (form.images || []).includes(item.url)
                    return (
                      <button
                        key={item.id}
                        type="button"
                        disabled={alreadyAdded}
                        onClick={() => {
                          if (!alreadyAdded) {
                            setForm({ ...form, images: [...(form.images || []), item.url] })
                            toast.success(isRtl ? "تمت الإضافة" : "Added")
                          }
                        }}
                        className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                          alreadyAdded ? "border-green-500 opacity-60" : "border-transparent hover:border-[#f97316]"
                        }`}
                      >
                        <Image src={item.url} alt={item.alt || ""} fill sizes="160px" className="object-cover" />
                        {alreadyAdded && (
                          <div className="absolute inset-0 bg-green-500/30 flex items-center justify-center">
                            <Check className="w-6 h-6 text-white" />
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
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
