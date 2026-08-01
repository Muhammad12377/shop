"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import Image from "next/image"
import { Upload, Trash2, Copy, Check, FileIcon, Loader2 } from "lucide-react"
import toast from "react-hot-toast"
import type { Media } from "@/types"
import ImageCropModal from "@/components/admin/ImageCropModal"

export default function AdminMediaPage({ params: paramsPromise }: { params: Promise<{ locale: string }> }) {
  const [locale, setLocale] = useState("en")
  const [media, setMedia] = useState<Media[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
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
    if (file.type.startsWith("video/")) {
      uploadFile(file)
    } else {
      setPendingFile(file)
    }
    if (fileRef.current) fileRef.current.value = ""
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    if (file.type.startsWith("video/")) {
      uploadFile(file)
    } else {
      setPendingFile(file)
    }
  }

  const handleCropConfirm = async (file: File) => {
    setPendingFile(null)
    await uploadFile(file)
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
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
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

      <div
        onClick={() => !uploading && fileRef.current?.click()}
        className={`mb-6 p-8 rounded-xl border-2 border-dashed transition-colors cursor-pointer text-center ${
          dragOver
            ? "bg-[#f97316]/5 border-[#f97316]"
            : "bg-white border-zinc-300 hover:border-[#f97316]/50"
        }`}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 text-[#f97316] animate-spin" />
            <p className="text-sm text-zinc-500">{isRtl ? "جاري الرفع..." : "Uploading..."}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className={`w-8 h-8 ${dragOver ? "text-[#f97316]" : "text-zinc-400"}`} />
            <p className="text-sm font-medium text-zinc-600">
              {dragOver
                ? isRtl ? "أفلت الصورة هنا" : "Drop the image here"
                : isRtl ? "اسحب وأفلت صورة هنا أو اضغط للاختيار" : "Drag and drop an image here, or click to select"}
            </p>
            <p className="text-xs text-zinc-400">{isRtl ? "JPG, PNG, WEBP, GIF" : "JPG, PNG, WEBP, GIF"}</p>
          </div>
        )}
      </div>

      {dragOver && (
        <div className="fixed inset-0 z-40 bg-[#f97316]/10 border-4 border-[#f97316] border-dashed rounded-2xl pointer-events-none">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-white rounded-2xl shadow-xl px-8 py-6 text-center">
              <Upload className="w-10 h-10 text-[#f97316] mx-auto mb-2" />
              <p className="font-medium">{isRtl ? "أفلت الصورة للرفع" : "Drop to upload"}</p>
            </div>
          </div>
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
                <div className="relative w-full aspect-square">
                  <Image
                    src={item.url}
                    alt={item.alt || ""}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
                    className="object-cover"
                    loading="lazy"
                  />
                </div>
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

      {pendingFile && (
        <ImageCropModal
          file={pendingFile}
          isRtl={isRtl}
          onCancel={() => {
            setPendingFile(null)
            if (fileRef.current) fileRef.current.value = ""
          }}
          onConfirm={handleCropConfirm}
        />
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
