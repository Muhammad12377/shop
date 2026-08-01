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
  { id: "custom", label: "Custom Size", labelAr: "حجم مخصص", ratio: null, width: 1200, height: 1200 },
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
  const [customW, setCustomW] = useState(1200)
  const [customH, setCustomH] = useState(1200)

  const imgRef = useRef<HTMLImageElement | null>(null)
  const areaRef = useRef<HTMLDivElement | null>(null)
  const dragState = useRef<{ mode: string; startX: number; startY: number; rect: CropRect } | null>(null)

  useEffect(() => {
    const url = URL.createObjectURL(file)
    setSrc(url)
    const img = new Image()
    img.onload = () => {
      setNatural({ width: img.naturalWidth, height: img.naturalHeight })
      setCustomW(img.naturalWidth > 1200 ? 1200 : img.naturalWidth)
      setCustomH(img.naturalHeight > 1200 ? 1200 : img.naturalHeight)
    }
    img.src = url
    return () => URL.revokeObjectURL(url)
  }, [file])

  const preset = CROP_PRESETS.find((p) => p.id === presetId) || CROP_PRESETS[0]

  // Effective output dimensions (user-editable in custom mode)
  const outW = preset.id === "custom" ? Math.max(1, customW) : preset.width
  const outH =
    preset.id === "custom"
      ? Math.max(1, customH)
      : preset.ratio
        ? Math.round(preset.width / preset.ratio)
        : preset.height

  // Ratio used to lock the crop box aspect; null = fully free corners
  const cropRatio = preset.id === "custom" ? null : preset.ratio

  // Displayed image rect inside the crop container (object-contain)
  const imageRect = useCallback(() => {
    const el = areaRef.current
    if (!el || !natural.width || !natural.height) return { x: 0, y: 0, width: 0, height: 0 }
    const bw = el.clientWidth
    const bh = el.clientHeight
    if (!bw || !bh) return { x: 0, y: 0, width: 0, height: 0 }
    const imgRatio = natural.width / natural.height
    let iw: number, ih: number
    if (imgRatio > bw / bh) {
      iw = bw
      ih = bw / imgRatio
    } else {
      ih = bh
      iw = bh * imgRatio
    }
    return { x: (bw - iw) / 2, y: (bh - ih) / 2, width: iw, height: ih }
  }, [natural])

  const fitRect = useCallback((ratio: number | null): CropRect => {
    const el = areaRef.current
    if (!el || !natural.width || !natural.height) return { x: 0, y: 0, width: 100, height: 100 }
    const img = imageRect()
    if (!img.width || !img.height) return { x: 0, y: 0, width: 100, height: 100 }

    let w: number, h: number
    if (ratio) {
      if (img.width / img.height > ratio) {
        h = img.height * 0.95
        w = h * ratio
      } else {
        w = img.width * 0.95
        h = w / ratio
      }
      if (w > img.width) { w = img.width; h = w / ratio }
      if (h > img.height) { h = img.height; w = h * ratio }
    } else {
      w = img.width * 0.95
      h = img.height * 0.95
    }

    const x = img.x + (img.width - w) / 2
    const y = img.y + (img.height - h) / 2
    return { x, y, width: w, height: h }
  }, [natural, imageRect])

  useEffect(() => {
    if (rect === null && natural.width && natural.height) {
      setRect(fitRect(cropRatio))
    }
  }, [natural, cropRatio, rect, fitRect])

  useEffect(() => {
    if (rect) setRect(fitRect(cropRatio))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cropRatio])

  const clampRect = useCallback((r: CropRect): CropRect => {
    const img = imageRect()
    if (!img.width || !img.height) return r
    const minSize = 40
    let x = r.x
    let y = r.y
    let w = Math.max(minSize, Math.min(r.width, img.width))
    let h = Math.max(minSize, Math.min(r.height, img.height))
    if (cropRatio) {
      if (w / h > cropRatio) h = w / cropRatio
      else w = h * cropRatio
      if (w > img.width) { w = img.width; h = w / cropRatio }
      if (h > img.height) { h = img.height; w = h * cropRatio }
    }
    x = Math.max(img.x, Math.min(x, img.x + img.width - w))
    y = Math.max(img.y, Math.min(y, img.y + img.height - h))
    return { x, y, width: w, height: h }
  }, [cropRatio, imageRect])

  // ----- Drag logic (all pointer handlers live on elements that own the capture) -----

  const startDrag = (e: React.PointerEvent, mode: string, rectAtStart: CropRect) => {
    e.preventDefault()
    e.stopPropagation()
    const el = e.currentTarget as HTMLElement
    try {
      el.setPointerCapture(e.pointerId)
    } catch {
      // ignore capture failure
    }
    dragState.current = { mode, startX: e.clientX, startY: e.clientY, rect: { ...rectAtStart } }
  }

  const handleMove = (e: React.PointerEvent) => {
    const ds = dragState.current
    if (!ds || !rect) return
    const dx = e.clientX - ds.startX
    const dy = e.clientY - ds.startY
    const r = ds.rect
    const ratio = cropRatio

    let next: CropRect
    switch (ds.mode) {
      case "move": {
        next = clampRect({ x: r.x + dx, y: r.y + dy, width: r.width, height: r.height })
        break
      }
      case "se": {
        let w = r.width + dx
        let h = ratio ? w / ratio : r.height + dy
        w = Math.max(40, w)
        h = Math.max(40, h)
        if (ratio) h = w / ratio
        next = { x: r.x, y: r.y, width: w, height: h }
        break
      }
      case "sw": {
        let w = r.width - dx
        let h = ratio ? w / ratio : r.height + dy
        w = Math.max(40, w)
        h = Math.max(40, h)
        if (ratio) h = w / ratio
        next = { x: r.x + r.width - w, y: r.y, width: w, height: h }
        break
      }
      case "ne": {
        let w = r.width + dx
        let h = ratio ? w / ratio : r.height - dy
        w = Math.max(40, w)
        h = Math.max(40, h)
        if (ratio) h = w / ratio
        next = { x: r.x, y: r.y + r.height - h, width: w, height: h }
        break
      }
      case "nw": {
        let w = r.width - dx
        let h = ratio ? w / ratio : r.height - dy
        w = Math.max(40, w)
        h = Math.max(40, h)
        if (ratio) h = w / ratio
        next = { x: r.x + r.width - w, y: r.y + r.height - h, width: w, height: h }
        break
      }
      default:
        next = r
    }
    setRect(clampRect(next))
  }

  const endDrag = () => {
    dragState.current = null
  }

  // Draw a brand-new selection by dragging anywhere on the image
  const startDraw = (e: React.PointerEvent) => {
    if (!natural.width || !areaRef.current) return
    const el = areaRef.current
    e.preventDefault()
    try {
      el.setPointerCapture(e.pointerId)
    } catch {
      // ignore
    }
    const br = el.getBoundingClientRect()
    const px = e.clientX - br.left
    const py = e.clientY - br.top
    dragState.current = { mode: "draw", startX: px, startY: py, rect: { x: px, y: py, width: 0, height: 0 } }
  }

  const handleDrawMove = (e: React.PointerEvent) => {
    const ds = dragState.current
    if (!ds || ds.mode !== "draw" || !areaRef.current) return
    const el = areaRef.current
    const br = el.getBoundingClientRect()
    const px = e.clientX - br.left
    const py = e.clientY - br.top
    const x0 = ds.startX
    const y0 = ds.startY
    let x = Math.min(x0, px)
    let y = Math.min(y0, py)
    let w = Math.abs(px - x0)
    let h = Math.abs(py - y0)
    if (w < 8) w = 8
    if (h < 8) h = 8
    if (cropRatio) {
      if (w / h > cropRatio) h = w / cropRatio
      else w = h * cropRatio
    }
    setRect(clampRect({ x, y, width: w, height: h }))
  }

  const endDraw = () => {
    dragState.current = null
  }

  const doCrop = async () => {
    if (!rect || !imgRef.current || !natural.width) return
    setBusy(true)
    try {
      const img = imageRect()
      if (!img.width || !img.height) return

      const scale = natural.width / img.width
      const srcX = Math.round((rect.x - img.x) * scale)
      const srcY = Math.round((rect.y - img.y) * scale)
      const srcW = Math.round(rect.width * scale)
      const srcH = Math.round(rect.height * scale)

      const clamp = (v: number, m: number) => Math.max(0, Math.min(v, m))
      const cx = clamp(srcX, natural.width)
      const cy = clamp(srcY, natural.height)
      const cw = clamp(srcW, natural.width - cx)
      const ch = clamp(srcH, natural.height - cy)

      let oW = outW
      let oH = outH
      if (preset.id === "custom") {
        // Output exactly the user's chosen dimensions
        oW = Math.max(1, customW)
        oH = Math.max(1, customH)
      }

      const canvas = document.createElement("canvas")
      canvas.width = oW
      canvas.height = oH
      const ctx = canvas.getContext("2d")!
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = "high"
      ctx.drawImage(imgRef.current, cx, cy, cw, ch, 0, 0, oW, oH)

      const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"))
      if (!blob) throw new Error("crop_failed")
      const cropped = new File([blob], file.name.replace(/\.[^.]+$/, "") + ".png", { type: "image/png" })
      onConfirm(cropped)
    } catch {
      setBusy(false)
    }
  }

  const handleCustomW = (v: string) => {
    const n = parseInt(v)
    if (!isNaN(n) && n > 0) {
      setCustomW(n)
      if (presetId !== "custom") setPresetId("custom")
    }
  }

  const handleCustomH = (v: string) => {
    const n = parseInt(v)
    if (!isNaN(n) && n > 0) {
      setCustomH(n)
      if (presetId !== "custom") setPresetId("custom")
    }
  }

  const resetToImage = () => {
    if (!rect) return
    const img = imageRect()
    if (!img.width) return
    setRect({ x: img.x, y: img.y, width: img.width, height: img.height })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-2xl max-h-[94vh] overflow-y-auto">
        <div className="sticky top-0 bg-white z-10 px-4 sm:px-6 py-4 border-b border-zinc-200 flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2">
            <Crop className="w-5 h-5 text-[#f97316]" />
            {isRtl ? "قص الصورة" : "Crop Image"}
          </h2>
          <button onClick={onCancel} className="p-2 rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6">
          <div className="flex flex-wrap gap-2 mb-3">
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
            <button
              type="button"
              onClick={resetToImage}
              className="px-3 py-1.5 rounded-full text-xs font-medium border border-zinc-200 bg-white text-zinc-600 hover:border-[#f97316]/50 transition-colors cursor-pointer"
            >
              {isRtl ? "تحديد الكل" : "Fit Image"}
            </button>
          </div>

          {presetId === "custom" && (
            <div className="flex flex-wrap items-end gap-2 mb-3 p-3 bg-zinc-50 rounded-xl border border-zinc-200">
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">
                  {isRtl ? "العرض (بكسل)" : "Width (px)"}
                </label>
                <input
                  type="number"
                  min={1}
                  value={customW}
                  onChange={(e) => handleCustomW(e.target.value)}
                  className="w-28 px-3 py-2 border border-zinc-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316]"
                />
              </div>
              <span className="pb-2 text-zinc-400">×</span>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">
                  {isRtl ? "الارتفاع (بكسل)" : "Height (px)"}
                </label>
                <input
                  type="number"
                  min={1}
                  value={customH}
                  onChange={(e) => handleCustomH(e.target.value)}
                  className="w-28 px-3 py-2 border border-zinc-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316]"
                />
              </div>
              <p className="text-[11px] text-zinc-400 flex-1 min-w-[160px] pb-1">
                {isRtl
                  ? "اسحب على الصورة أو حرّك الزوايا الأربع لتحديد المنطقة، وسيُحفظ الناتج بالمقاس الذي كتبته أعلاه"
                  : "Drag on the image or move the 4 corners to select the area; output will be exactly the size above"}
              </p>
            </div>
          )}

          {natural.width > 0 && (
            <p className="text-xs text-zinc-500 mb-2">
              {isRtl
                ? `الصورة الأصلية: ${natural.width} × ${natural.height}px — سيتم الإخراج: ${outW} × ${
                    preset.id === "custom" ? customH : preset.ratio ? Math.round(outW / preset.ratio) : "…"
                  }px`
                : `Original: ${natural.width} × ${natural.height}px — Output: ${outW} × ${
                    preset.id === "custom" ? customH : preset.ratio ? Math.round(outW / preset.ratio) : "…"
                  }px`}
            </p>
          )}

          <div
            ref={areaRef}
            onPointerDown={startDraw}
            onPointerMove={handleDrawMove}
            onPointerUp={endDraw}
            onPointerCancel={endDraw}
            className="relative bg-zinc-100 rounded-xl overflow-hidden select-none touch-none"
            style={{ height: "min(420px, 48vh)" }}
          >
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
                className="absolute"
                style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height, touchAction: "none" }}
              >
                <div
                  onPointerDown={(e) => startDrag(e, "move", rect)}
                  onPointerMove={handleMove}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                  className="absolute inset-0 border-2 border-[#f97316] bg-[#f97316]/10"
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
                    onPointerDown={(e) => startDrag(e, c, rect)}
                    onPointerMove={handleMove}
                    onPointerUp={endDrag}
                    onPointerCancel={endDrag}
                    style={{ touchAction: "none", cursor: `${c}-resize` }}
                    className={`absolute w-7 h-7 sm:w-6 sm:h-6 flex items-center justify-center ${
                      c === "nw" ? "top-0 left-0 -translate-x-1/2 -translate-y-1/2" : ""
                    } ${c === "ne" ? "top-0 right-0 translate-x-1/2 -translate-y-1/2" : ""} ${
                      c === "sw" ? "bottom-0 left-0 -translate-x-1/2 translate-y-1/2" : ""
                    } ${c === "se" ? "bottom-0 right-0 translate-x-1/2 translate-y-1/2" : ""}`}
                  >
                    <span className="block w-5 h-5 sm:w-4 sm:h-4 bg-white border-2 border-[#f97316] rounded-full" />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-4">
            <button
              onClick={onCancel}
              disabled={busy}
              className="flex-1 px-4 py-3 rounded-xl text-sm font-medium text-zinc-600 bg-zinc-100 hover:bg-zinc-200 transition-colors cursor-pointer disabled:opacity-50"
            >
              {isRtl ? "إلغاء" : "Cancel"}
            </button>
            <button
              onClick={doCrop}
              disabled={busy || !rect}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium text-white bg-[#f97316] hover:bg-[#ea580c] transition-colors cursor-pointer disabled:opacity-50"
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
