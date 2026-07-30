"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { Upload, Trash2, Copy, Check, FileIcon, Loader2 } from "lucide-react"
import toast from "react-hot-toast"
import type { Media } from "@/types"

export default function AdminMediaPage({ params: paramsPromise }: { params: Promise<{ locale: string }> }) {
  const [locale, setLocale] = useState("en")
  const [media, setMedia] = useState<Media[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { paramsPromise.then((p) => setLocale(p.locale)) }, [paramsPromise])
  const isRtl = locale === "ar"

  const fetchMedia = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/media")
      const data = await res.json()
      if (Array.isArray(data)) setMedia(data)
    } catch {
      toast.error(isRtl ? "خطأ في تحميل الصور" : "Failed to load media")
    } finally {
      setLoading(false)
    }
  }, [isRtl])

  useEffect(() => { fetchMedia() }, [fetchMedia])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setPreview(url)
    uploadFile(file)
  }

  const uploadFile = async (file: File) => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/upload", { method: "POST", body: formData })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      toast.success(isRtl ? "تم الرفع" : "Uploaded")
      setPreview(null)
      fetchMedia()
    } catch (err: any) {
      toast.error(err.message || (isRtl ? "خطأ في الرفع" : "Upload failed"))
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      const item = media.find((m) => m.id === deleteId)
      const res = await fetch("/api/admin/media", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteId, url: item?.url }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      toast.success(isRtl ? "تم الحذف" : "Deleted")
      setDeleteId(null)
      fetchMedia()
    } catch (err: any) {
      toast.error(err.message || (isRtl ? "خطأ في الحذف" : "Delete failed"))
    }
  }

  const copyUrl = (url: string, id: string) => {
    navigator.clipboard.writeText(url)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
    toast.success(isRtl ? "تم النسخ" : "Copied")
  }

  const isImage = (url: string) => /\.(jpg|jpeg|png|gif|webp|svg|bmp|avif)(\?.*)?$/i.test(url)

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
        <h1 className="text-2xl font-bold">{isRtl ? "مكتبة الصور" : "Media Library"}</h1>
        <div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 bg-[#f97316] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#fb923c] disabled:opacity-50 transition-colors cursor-pointer"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {isRtl ? "رفع صورة" : "Upload"}
          </button>
        </div>
      </div>

      {preview && (
        <div className="mb-6 p-4 bg-white rounded-xl border border-zinc-200">
          <p className="text-xs text-zinc-500 mb-2">{isRtl ? "معاينة قبل الرفع" : "Preview"}</p>
          <img src={preview} alt="" className="w-32 h-32 object-cover rounded-lg" />
        </div>
      )}

      {media.length === 0 ? (
        <div className="bg-white rounded-xl border border-zinc-200 p-16 text-center">
          <FileIcon className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
          <p className="text-zinc-400">{isRtl ? "لا توجد صور" : "No media yet"}</p>
          <p className="text-sm text-zinc-300 mt-1">
            {isRtl ? "اضغط على رفع لإضافة صور" : "Click upload to add images"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {media.map((item) => (
            <div key={item.id} className="group relative bg-white rounded-xl border border-zinc-200 overflow-hidden">
              {isImage(item.url) ? (
                <img
                  src={item.url}
                  alt={item.alt || ""}
                  className="w-full aspect-square object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full aspect-square flex items-center justify-center bg-zinc-50">
                  <FileIcon className="w-10 h-10 text-zinc-300" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  onClick={() => copyUrl(item.url, item.id)}
                  className="p-2 bg-white rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer"
                  title={isRtl ? "نسخ الرابط" : "Copy URL"}
                >
                  {copiedId === item.id ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-zinc-600" />}
                </button>
                <button
                  onClick={() => setDeleteId(item.id)}
                  className="p-2 bg-white rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                  title={isRtl ? "حذف" : "Delete"}
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              </div>
              <div className="p-2">
                <p className="text-[10px] text-zinc-400 truncate">{item.url.split("/").pop()}</p>
              </div>
            </div>
          ))}
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
