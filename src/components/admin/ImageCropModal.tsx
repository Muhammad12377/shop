"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import { X, Crop, Loader2, Check } from "lucide-react"

export interface CropPreset {
  id: string
  label: string
  labelAr: string
  ratio: number | null
  width: number
  height: number
}

export const CROP_PRESETS: CropPreset[] = [
  { id: "product", label: "Product (1:1)", labelAr: "منتج (1:1)", ratio: 1, width: 800, height: 800 },
  { id: "category", label: "Category (16:9)", labelAr: "تصنيف (16:9)", ratio: 16 / 9, width: 1280, height: 720 },
  { id: "hero", label: "Hero (21:9)", labelAr: "غلاف (21:9)", ratio: 21 / 9, width: 1680, height: 720 },
  { id: "free", label: "Free", labelAr: "حر", ratio: null, width: 1200, height: 1200 },
]

interface CropRect {
  x: number
  y: number
  width: number
  height: number
}

interface ImageCropModalProps {
  file: File
  isRtl: boolean
  initialPresetId?: string
  onCancel: () => void
  onConfirm: (croppedFile: File) => void
}

export default function ImageCropModal({ file, isRtl, initialPresetId = "product", onCancel, onConfirm }: ImageCropModalProps) {
  const [src, setSrc] = useState<string>("")
  const [natural, setNatural] = useState({ width: 0, height: 0 })
  const [presetId, setPresetId] = useState(initialPresetId)
  const [rect, setRect] = useState<CropRect | null>(null)
  const [busy, setBusy] = useState(false)

  const imgRef = useRef<HTMLImageElement | null>(null)
  const boxRef = useRef<HTMLDivElement | null>(null)
  const dragState = useRef<{ mode: string; startX: number; startY: number; rect: CropRect } | null>(null)

  useEffect(() => {
    const url = URL.createObjectURL(file)
    setSrc(url)
    const img = new Image()
    img.onload = () => {
      setNatural({ width: img.naturalWidth, height: img.naturalHeight })
    }
    img.src = url
    return () => URL.revokeObjectURL(url)
  }, [file])

  const preset = CROP_PRESETS.find((p) => p.id === presetId) || CROP_PRESETS[0]

  const fitRect = useCallback((ratio: number | null): CropRect => {
    const el = boxRef.current
    if (!el || !natural.width || !natural.height) return { x: 0, y: 0, width: 100, height: 100 }
    const bw = el.clientWidth
    const bh = el.clientHeight
    if (!bw || !bh) return { x: 0, y: 0, width: 100, height: 100 }

    const imgRatio = natural.width / natural.height
    let iw: number, ih: number
    if (imgRatio > bw / bh) {
      iw = bw
      ih = bw / imgRatio
    } else {
      ih = bh
      iw = bh * imgRatio
    }
    const ox = (bw - iw) / 2
    const oy = (bh - ih) / 2

    let w: number, h: number
    if (ratio) {
      if (imgRatio > ratio) {
        h = ih * 0.9
        w = h * ratio
      } else {
        w = iw * 0.9
        h = w / ratio
      }
      if (w > iw) { w = iw; h = w / ratio }
      if (h > ih) { h = ih; w = h * ratio }
    } else {
      w = iw * 0.9
      h = ih * 0.9
    }

    const x = ox + (iw - w) / 2
    const y = oy + (ih - h) / 2
    return { x, y, width: w, height: h }
  }, [natural])

  useEffect(() => {
    if (rect === null && natural.width && natural.height) {
      setRect(fitRect(preset.ratio))
    }
  }, [natural, preset.ratio, rect, fitRect])

  useEffect(() => {
    if (rect) setRect(fitRect(preset.ratio))
  }, [preset.ratio, fitRect])

  const clampRect = useCallback((r: CropRect): CropRect => {
    const el = boxRef.current
    if (!el) return r
    const bw = el.clientWidth
    const bh = el.clientHeight
    const minSize = 40
    let x = r.x
    let y = r.y
    let w = Math.max(minSize, Math.min(r.width, bw))
    let h = Math.max(minSize, Math.min(r.height, bh))
    if (preset.ratio) {
      if (w / h > preset.ratio) h = w / preset.ratio
      else w = h * preset.ratio
      if (w > bw) { w = bw; h = w / preset.ratio }
      if (h > bh) { h = bh; w = h * preset.ratio }
    }
    x = Math.max(0, Math.min(x, bw - w))
    y = Math.max(0, Math.min(y, bh - h))
    return { x, y, width: w, height: h }
  }, [preset.ratio])

  const onPointerDown = (e: React.PointerEvent, mode: string) => {
    e.preventDefault()
    const el = boxRef.current
    if (!el || !rect) return
    el.setPointerCapture(e.pointerId)
    dragState.current = { mode, startX: e.clientX, startY: e.clientY, rect: { ...rect } }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const el = boxRef.current
    const ds = dragState.current
    if (!el || !ds) return
    const dx = e.clientX - ds.startX
    const dy = e.clientY - ds.startY
    const bw = el.clientWidth
    const bh = el.clientHeight
    const r = ds.rect

    let next: CropRect
    const ratio = preset.ratio

    switch (ds.mode) {
      case "move": {
        next = clampRect({ x: r.x + dx, y: r.y + dy, width: r.width, height: r.height })
        break
      }
      case "se": {
        let w = r.width + dx
        let h = ratio ? w / ratio : r.height + dy
        if (!ratio) h = r.height + dy
        w = Math.max(40, Math.min(w, bw - r.x))
        h = Math.max(40, Math.min(h, bh - r.y))
        if (ratio) h = w / ratio
        next = { x: r.x, y: r.y, width: w, height: h }
        break
      }
      case "sw": {
        let w = r.width - dx
        let h = ratio ? w / ratio : r.height + dy
        if (!ratio) h = r.height + dy
        w = Math.max(40, Math.min(w, r.x + r.width))
        h = Math.max(40, Math.min(h, bh - r.y))
        if (ratio) h = w / ratio
        next = { x: r.x + r.width - w, y: r.y, width: w, height: h }
        break
      }
      case "ne": {
        let w = r.width + dx
        let h = ratio ? w / ratio : r.height - dy
        if (!ratio) h = r.height - dy
        w = Math.max(40, Math.min(w, bw - r.x))
        h = Math.max(40, Math.min(h, r.y + r.height))
        if (ratio) h = w / ratio
        next = { x: r.x, y: r.y + r.height - h, width: w, height: h }
        break
      }
      case "nw": {
        let w = r.width - dx
        let h = ratio ? w / ratio : r.height - dy
        if (!ratio) h = r.height - dy
        w = Math.max(40, Math.min(w, r.x + r.width))
        h = Math.max(40, Math.min(h, r.y + r.height))
        if (ratio) h = w / ratio
        next = { x: r.x + r.width - w, y: r.y + r.height - h, width: w, height: h }
        break
      }
      default:
        next = r
    }
    setRect(clampRect(next))
  }

  const onPointerUp = () => {
    dragState.current = null
  }

  const doCrop = async () => {
    if (!rect || !imgRef.current || !natural.width) return
    setBusy(true)
    try {
      const el = boxRef.current
      if (!el) return
      const bw = el.clientWidth
      const bh = el.clientHeight

      const imgRatio = natural.width / natural.height
      let iw: number, ih: number
      if (imgRatio > bw / bh) {
        iw = bw
        ih = bw / imgRatio
      } else {
        ih = bh
        iw = bh * imgRatio
      }
      const ox = (bw - iw) / 2
      const oy = (bh - ih) / 2

      const scale = natural.width / iw
      const srcX = Math.round((rect.x - ox) * scale)
      const srcY = Math.round((rect.y - oy) * scale)
      const srcW = Math.round(rect.width * scale)
      const srcH = Math.round(rect.height * scale)

      const clamp = (v: number, m: number) => Math.max(0, Math.min(v, m))
      const cx = clamp(srcX, natural.width)
      const cy = clamp(srcY, natural.height)
      const cw = clamp(srcW, natural.width - cx)
      const ch = clamp(srcH, natural.height - cy)

      const outW = preset.width
      const outH = preset.ratio ? Math.round(outW / preset.ratio) : Math.round((ch / cw) * outW)

      const canvas = document.createElement("canvas")
      canvas.width = outW
      canvas.height = outH
      const ctx = canvas.getContext("2d")!
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = "high"
      ctx.drawImage(imgRef.current, cx, cy, cw, ch, 0, 0, outW, outH)

      const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"))
      if (!blob) throw new Error("crop_failed")
      const cropped = new File([blob], file.name.replace(/\.[^.]+$/, "") + ".png", { type: "image/png" })
      onConfirm(cropped)
    } catch {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Crop className="w-5 h-5 text-[#f97316]" />
            {isRtl ? "قص الصورة" : "Crop Image"}
          </h2>
          <button onClick={onCancel} className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6">
          <div className="flex flex-wrap gap-2 mb-4">
            {CROP_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPresetId(p.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                  presetId === p.id
                    ? "bg-[#f97316] text-white border-[#f97316]"
                    : "bg-white text-zinc-600 border-zinc-200 hover:border-[#f97316]/50"
                }`}
              >
                {isRtl ? p.labelAr : p.label}
              </button>
            ))}
          </div>

          {natural.width > 0 && (
            <p className="text-xs text-zinc-500 mb-2">
              {isRtl
                ? `الصورة الأصلية: ${natural.width} × ${natural.height}px — سيتم الإخراج: ${preset.width} × ${preset.ratio ? Math.round(preset.width / preset.ratio) : "…"}px`
                : `Original: ${natural.width} × ${natural.height}px — Output: ${preset.width} × ${preset.ratio ? Math.round(preset.width / preset.ratio) : "…"}px`}
            </p>
          )}

          <div className="relative bg-zinc-100 rounded-xl overflow-hidden select-none" style={{ height: "min(420px, 50vh)" }}>
            {src && (
              <img
                ref={imgRef}
                src={src}
                alt="crop preview"
                draggable={false}
                className="absolute inset-0 w-full h-full object-contain select-none pointer-events-none"
              />
            )}
            {rect && (
              <div
                ref={boxRef}
                className="absolute"
                style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height, touchAction: "none" }}
              >
                <div
                  className="absolute inset-0 border-2 border-[#f97316] bg-[#f97316]/10"
                  onPointerDown={(e) => onPointerDown(e, "move")}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  style={{ cursor: "move", touchAction: "none" }}
                />
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-0 left-0 right-0 bottom-0" style={{ boxShadow: "0 0 0 9999px rgba(0,0,0,0.35)" }} />
                </div>
                <div className="absolute top-1/3 left-0 right-0 h-px bg-white/50" />
                <div className="absolute top-2/3 left-0 right-0 h-px bg-white/50" />
                <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/50" />
                <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/50" />
                {(["nw", "ne", "sw", "se"] as const).map((c) => (
                  <div
                    key={c}
                    onPointerDown={(e) => onPointerDown(e, c)}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    style={{ touchAction: "none", cursor: `${c}-resize` }}
                    className={`absolute w-5 h-5 ${c === "nw" ? "top-0 left-0 -translate-x-1/2 -translate-y-1/2" : ""} ${
                      c === "ne" ? "top-0 right-0 translate-x-1/2 -translate-y-1/2" : ""
                    } ${c === "sw" ? "bottom-0 left-0 -translate-x-1/2 translate-y-1/2" : ""} ${
                      c === "se" ? "bottom-0 right-0 translate-x-1/2 translate-y-1/2" : ""
                    } bg-white border-2 border-[#f97316] rounded-full`}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-4">
            <button
              onClick={onCancel}
              disabled={busy}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-zinc-600 bg-zinc-100 hover:bg-zinc-200 transition-colors cursor-pointer disabled:opacity-50"
            >
              {isRtl ? "إلغاء" : "Cancel"}
            </button>
            <button
              onClick={doCrop}
              disabled={busy || !rect}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-[#f97316] hover:bg-[#ea580c] transition-colors cursor-pointer disabled:opacity-50"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {busy ? (isRtl ? "جارٍ القص..." : "Cropping...") : (isRtl ? "قص وحفظ" : "Crop & Save")}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
