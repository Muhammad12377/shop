"use client"

import { useEffect, useState, useCallback, useRef, useMemo } from "react"
import Image from "next/image"
import { Plus, Pencil, Trash2, X, ArrowUp, ArrowDown, Loader2, Upload, Image as ImageIcon, Check, FileIcon } from "lucide-react"
import toast from "react-hot-toast"
import type { ProductCategory, Media } from "@/types"
import ImageCropModal from "@/components/admin/ImageCropModal"

const defaultCat: Partial<ProductCategory> = {
  name_en: "",
  name_ar: "",
  slug: "",
  image_url: "",
  active: true,
  sort_order: 0,
  parent_id: null,
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
  const [mediaItems, setMediaItems] = useState<Media[]>([])
  const [mediaModalOpen, setMediaModalOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const topLevel = useMemo(() => categories.filter((c) => !c.parent_id), [categories])
  const childrenOf = useMemo(() => {
    const map: Record<string, ProductCategory[]> = {}
    for (const c of categories) {
      if (!c.parent_id) continue
      ;(map[c.parent_id] ||= []).push(c)
    }
    return map
  }, [categories])

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

  const fetchMedia = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/media")
      const data = await res.json()
      if (Array.isArray(data)) setMediaItems(data)
    } catch {}
  }, [])

  useEffect(() => { fetchMedia() }, [fetchMedia])

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
      setForm({ ...form, image_url: data.url })
      toast.success(isRtl ? "تم رفع الصورة" : "Image uploaded")
      fetchMedia()
    } catch (err: any) {
      toast.error(err.message || (isRtl ? "خطأ في الرفع" : "Upload failed"))
    } finally {
      setUploading(false)
    }
  }

  const openAdd = () => {
    setEditing(null)
    setForm({ ...defaultCat, sort_order: categories.length })
    setModalOpen(true)
  }

  const openEdit = (cat: ProductCategory) => {
    setEditing(cat)
    setForm({ ...cat, parent_id: cat.parent_id ?? null })
    setModalOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (form.parent_id && form.parent_id === editing?.id) {
        toast.error(isRtl ? "لا يمكن أن يكون التصنيف أباً لنفسه" : "Category cannot be its own parent")
        setSaving(false)
        return
      }
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
    const hasChildren = categories.some((c) => c.parent_id === deleteId)
    if (hasChildren) {
      toast.error(isRtl ? "لا يمكن حذف تصنيف يحتوي على تصنيفات فرعية" : "Cannot delete a category that has subcategories")
      setDeleteId(null)
      return
    }
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

  const catName = (c: ProductCategory) => (isRtl ? c.name_ar || c.name_en : c.name_en || c.name_ar)

  const descendantsOf = (id: string): Set<string> => {
    const out = new Set<string>()
    const stack = [id]
    while (stack.length) {
      const cur = stack.pop()!
      for (const c of categories) {
        if (c.parent_id === cur && !out.has(c.id)) {
          out.add(c.id)
          stack.push(c.id)
        }
      }
    }
    return out
  }

  const parentOptions = useMemo(() => {
    const excluded = new Set<string>()
    if (editing) {
      excluded.add(editing.id)
      for (const d of descendantsOf(editing.id)) excluded.add(d)
    }
    const rows: { cat: ProductCategory; depth: number }[] = []
    const build = (id: string | null, depth: number) => {
      const kids = categories
        .filter((c) => (id ? c.parent_id === id : !c.parent_id))
        .sort((a, b) => a.sort_order - b.sort_order)
      for (const k of kids) {
        if (excluded.has(k.id)) continue
        rows.push({ cat: k, depth })
        build(k.id, depth + 1)
      }
    }
    build(null, 0)
    return rows
  }, [categories, editing])

  const displayRows: { cat: ProductCategory; depth: number }[] = []
  {
    const build = (id: string | null, depth: number) => {
      const kids = categories
        .filter((c) => (id ? c.parent_id === id : !c.parent_id))
        .sort((a, b) => a.sort_order - b.sort_order)
      for (const k of kids) {
        displayRows.push({ cat: k, depth })
        build(k.id, depth + 1)
      }
    }
    build(null, 0)
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

      <div className="hidden md:block bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50">
              <tr>
                <th className="w-16 px-4 py-3 font-medium text-zinc-500">{isRtl ? "ترتيب" : "Order"}</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500">{isRtl ? "الاسم" : "Name"}</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500">{isRtl ? "الأب" : "Parent"}</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500">{isRtl ? "الصورة" : "Image"}</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500">Slug</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500">{isRtl ? "الحالة" : "Active"}</th>
                <th className="text-right px-4 py-3 font-medium text-zinc-500">{isRtl ? "الإجراءات" : "Actions"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {displayRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-zinc-400">
                    {isRtl ? "لا توجد تصنيفات" : "No categories"}
                  </td>
                </tr>
              ) : (
                displayRows.map(({ cat, depth }) => (
                  <tr key={cat.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => moveUp(categories.findIndex((c) => c.id === cat.id))}
                          disabled={categories.findIndex((c) => c.id === cat.id) === 0}
                          className="p-0.5 hover:bg-zinc-100 rounded disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowUp className="w-3.5 h-3.5 text-zinc-400" />
                        </button>
                        <span className="text-xs text-zinc-400 w-4 text-center">{cat.sort_order}</span>
                        <button
                          onClick={() => moveDown(categories.findIndex((c) => c.id === cat.id))}
                          disabled={categories.findIndex((c) => c.id === cat.id) === categories.length - 1}
                          className="p-0.5 hover:bg-zinc-100 rounded disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowDown className="w-3.5 h-3.5 text-zinc-400" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium">
                      <span style={{ paddingInlineStart: depth * 18 }} className="inline-flex items-center gap-1.5">
                        {depth > 0 && <span className="text-zinc-300">{"└─"}</span>}
                        {catName(cat)}
                        {depth > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-zinc-100 text-[10px] text-zinc-500">
                            {isRtl ? "فرعي" : "Sub"}
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-500">
                      {cat.parent_id ? catName(categories.find((c) => c.id === cat.parent_id)!) : "-"}
                    </td>
                    <td className="px-4 py-3">
                      {cat.image_url ? (
                        <div className="relative w-16 h-10 rounded-lg overflow-hidden border border-zinc-200">
                          <Image src={cat.image_url} alt="" fill sizes="64px" className="object-cover" />
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-400">{isRtl ? "لا توجد" : "None"}</span>
                      )}
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

      <div className="md:hidden space-y-3">
        {displayRows.length === 0 ? (
          <div className="bg-white rounded-xl border border-zinc-200 p-12 text-center text-zinc-400">
            {isRtl ? "لا توجد تصنيفات" : "No categories"}
          </div>
        ) : (
          displayRows.map(({ cat }) => (
            <div key={cat.id} className="bg-white rounded-xl border border-zinc-200 p-4">
              <div className="flex items-start gap-3">
                <div className="w-16 h-10 rounded-lg overflow-hidden border border-zinc-200 bg-zinc-100 shrink-0 relative">
                  {cat.image_url ? (
                    <Image src={cat.image_url} alt="" fill sizes="64px" className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-300">
                      <ImageIcon className="w-4 h-4" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{catName(cat)}</p>
                  <p className="text-xs text-zinc-400 truncate">/{cat.slug}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {cat.parent_id ? (
                      <span className="px-1.5 py-0.5 rounded bg-zinc-100 text-[10px] text-zinc-500">
                        {isRtl ? "فرعي" : "Sub"} · {catName(categories.find((c) => c.id === cat.parent_id)!)}
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded bg-zinc-100 text-[10px] text-zinc-500">
                        {isRtl ? "رئيسي" : "Top"}
                      </span>
                    )}
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
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => moveUp(categories.findIndex((c) => c.id === cat.id))}
                  disabled={categories.findIndex((c) => c.id === cat.id) === 0}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-100 text-zinc-600 text-xs font-medium hover:bg-zinc-200 disabled:opacity-40 transition-colors cursor-pointer"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                  {isRtl ? "أعلى" : "Up"}
                </button>
                <button
                  onClick={() => moveDown(categories.findIndex((c) => c.id === cat.id))}
                  disabled={categories.findIndex((c) => c.id === cat.id) === categories.length - 1}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-100 text-zinc-600 text-xs font-medium hover:bg-zinc-200 disabled:opacity-40 transition-colors cursor-pointer"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                  {isRtl ? "أسفل" : "Down"}
                </button>
                <button
                  onClick={() => openEdit(cat)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-100 text-zinc-700 text-xs font-medium hover:bg-zinc-200 transition-colors cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  {isRtl ? "تعديل" : "Edit"}
                </button>
                <button
                  onClick={() => setDeleteId(cat.id)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {isRtl ? "حذف" : "Delete"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setModalOpen(false)} />
          <div className="relative bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full max-w-lg max-h-[94vh] overflow-y-auto z-10">
            <div className="sticky top-0 bg-white border-b border-zinc-200 px-4 sm:px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {editing
                  ? isRtl ? "تعديل تصنيف" : "Edit Category"
                  : isRtl ? "إضافة تصنيف" : "Add Category"}
              </h2>
              <button onClick={() => setModalOpen(false)} className="p-1 hover:bg-zinc-100 rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  {isRtl ? "التصنيف الأب (اختياري)" : "Parent Category (optional)"}
                </label>
                <select
                  value={form.parent_id || ""}
                  onChange={(e) => setForm({ ...form, parent_id: e.target.value || null })}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316]"
                >
                  <option value="">{isRtl ? "— بدون (تصنيف رئيسي) —" : "— None (top-level) —"}</option>
                  {parentOptions.map(({ cat, depth }) => (
                    <option key={cat.id} value={cat.id}>
                      {"\u00A0\u00A0".repeat(depth)}
                      {depth > 0 ? "↳ " : ""}
                      {catName(cat)}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-zinc-400 mt-1">
                  {isRtl
                    ? "اختر تصنيفاً رئيسياً لجعل هذا تصنيفاً فرعياً (مثال: ملابس ← بناطيل)"
                    : "Pick a top-level category to make this a subcategory (e.g. Clothing → Pants)"}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  {isRtl ? "صورة الخلفية" : "Background Image"}
                </label>
                <div className="relative aspect-video rounded-xl overflow-hidden border border-zinc-200 bg-zinc-100 mb-3">
                  {form.image_url ? (
                    <Image src={form.image_url} alt="" fill sizes="512px" className="object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-400 gap-1">
                      <ImageIcon className="w-8 h-8" />
                      <p className="text-xs">{isRtl ? "لا توجد صورة — ستظهر خلفية ملونة" : "No image — a colored gradient will show"}</p>
                    </div>
                  )}
                  {form.image_url && (
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, image_url: "" })}
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
                  value={form.image_url || ""}
                  onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                  placeholder={isRtl ? "أو الصق رابط الصورة هنا..." : "Or paste an image URL here..."}
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
            <div className="sticky bottom-0 bg-white border-t border-zinc-200 px-4 sm:px-6 py-4 flex items-center justify-end gap-3">
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

      {mediaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMediaModalOpen(false)} />
          <div className="relative bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full max-w-3xl max-h-[94vh] overflow-y-auto z-10">
            <div className="sticky top-0 bg-white border-b border-zinc-200 px-4 sm:px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{isRtl ? "اختر صورة من المكتبة" : "Choose an image from library"}</h2>
              <button onClick={() => setMediaModalOpen(false)} className="p-1 hover:bg-zinc-100 rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 sm:p-6">
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
                    const selected = form.image_url === item.url
                    return (
                      <div key={item.id} className="relative">
                        <button
                          type="button"
                          onClick={() => {
                            setForm({ ...form, image_url: item.url })
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
                                if (form.image_url === url) setForm({ ...form, image_url: "" })
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
          initialPresetId="category"
          onCancel={() => setPendingImageFile(null)}
          onConfirm={handleCropConfirm}
        />
      )}

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
