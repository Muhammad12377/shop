"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, Upload, X } from "lucide-react"
import { directUpload, describeUploadError } from "@/lib/direct-upload"

type Phase = "preparing" | "uploading" | "saving" | "done" | "error"

type Props = {
  open: boolean
  file: File | null
  isRtl: boolean
  onSuccess: (url: string) => void
  onClose: () => void
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 MB"
  const mb = bytes / (1024 * 1024)
  if (mb >= 1) return `${mb.toFixed(1)} MB`
  const kb = bytes / 1024
  return `${kb.toFixed(0)} KB`
}

function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec <= 0) return "—"
  if (bytesPerSec >= 1024 * 1024) return `${(bytesPerSec / (1024 * 1024)).toFixed(2)} MB/s`
  return `${(bytesPerSec / 1024).toFixed(1)} KB/s`
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "—"
  const s = Math.round(seconds)
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${r.toString().padStart(2, "0")}`
}

export default function UploadDialog({ open, file, isRtl, onSuccess, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>("preparing")
  const [loaded, setLoaded] = useState(0)
  const [total, setTotal] = useState(0)
  const [speed, setSpeed] = useState(0)
  const [eta, setEta] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const startTimeRef = useRef(0)
  const lastSampleRef = useRef<{ t: number; loaded: number } | null>(null)
  const speedRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mountedRef = useRef(true)
  const lastStartedRef = useRef<File | null>(null)

  const t = (ar: string, en: string) => (isRtl ? ar : en)

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  const run = useCallback(
    async (f: File) => {
      setPhase("preparing")
      setError(null)
      setLoaded(0)
      setSpeed(0)
      setEta(0)
      setElapsed(0)
      setTotal(f.size)
      lastSampleRef.current = null
      speedRef.current = 0
      startTimeRef.current = performance.now()
      stopTimer()
      timerRef.current = setInterval(() => {
        setElapsed((performance.now() - startTimeRef.current) / 1000)
      }, 250)

      try {
        const url = await directUpload(f, (p) => {
          if (!mountedRef.current) return
          setPhase(p.phase)
          setLoaded(p.loaded)
          if (p.total) setTotal(p.total)
          const now = performance.now()
          if (lastSampleRef.current) {
            const dt = (now - lastSampleRef.current.t) / 1000
            if (dt > 0) {
              const inst = (p.loaded - lastSampleRef.current.loaded) / dt
              if (inst > 0) speedRef.current = inst
            }
          }
          lastSampleRef.current = { t: now, loaded: p.loaded }
          setSpeed(speedRef.current)
          if (
            p.phase === "uploading" &&
            p.total > 0 &&
            p.total > p.loaded &&
            speedRef.current > 0
          ) {
            setEta((p.total - p.loaded) / speedRef.current)
          }
        })
        if (!mountedRef.current) return
        stopTimer()
        setLoaded(f.size)
        setPhase("done")
        setTimeout(() => {
          if (mountedRef.current) {
            onSuccess(url)
            onClose()
          }
        }, 900)
      } catch (err) {
        if (!mountedRef.current) return
        stopTimer()
        setPhase("error")
        setError(describeUploadError(err, isRtl, { name: f.name, size: f.size }))
      }
    },
    [isRtl, onSuccess, onClose]
  )

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      stopTimer()
    }
  }, [])

  useEffect(() => {
    if (open && file && lastStartedRef.current !== file) {
      lastStartedRef.current = file
      run(file)
    }
  }, [open, file, run])

  if (!open || !file) return null

  const percent = total > 0 ? Math.min(100, (loaded / total) * 100) : 0
  const running = phase === "preparing" || phase === "uploading" || phase === "saving"

  const phaseLabel =
    phase === "preparing"
      ? t("تحضير الرفع...", "Preparing upload...")
      : phase === "uploading"
        ? t("جاري رفع الملف", "Uploading file")
        : phase === "saving"
          ? t("حفظ الملف...", "Saving file...")
          : phase === "done"
            ? t("اكتمل الرفع", "Upload complete")
            : t("فشل الرفع", "Upload failed")

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={running ? undefined : onClose} />
      <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-md z-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            {running ? (
              <Upload className="w-5 h-5 text-[#f97316]" />
            ) : phase === "done" ? (
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-500" />
            )}
            {phaseLabel}
          </h3>
          {!running && (
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-zinc-600 cursor-pointer"
              aria-label={t("إغلاق", "Close")}
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <p className="text-sm text-zinc-600 mb-4 truncate" title={file.name}>
          {file.name} · {formatBytes(file.size)}
        </p>

        <div className="mb-2 flex items-center justify-between text-xs text-zinc-500">
          <span>
            {t("المحمّل", "Uploaded")}: {formatBytes(loaded)} / {formatBytes(total)}
          </span>
          <span className="font-semibold text-[#f97316]">{Math.round(percent)}%</span>
        </div>
        <div className="w-full h-2.5 bg-zinc-100 rounded-full overflow-hidden mb-5">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              phase === "error"
                ? "bg-red-400"
                : phase === "done"
                  ? "bg-green-500"
                  : "bg-[#f97316]"
            }`}
            style={{ width: `${phase === "preparing" ? 6 : percent}%` }}
          />
        </div>

        {running && (
          <div className="grid grid-cols-2 gap-3 text-sm mb-2">
            <div className="rounded-lg bg-zinc-50 p-3">
              <p className="text-xs text-zinc-400 mb-1">{t("السرعة الحالية", "Current speed")}</p>
              <p className="font-semibold text-zinc-700">{formatSpeed(speed)}</p>
            </div>
            <div className="rounded-lg bg-zinc-50 p-3">
              <p className="text-xs text-zinc-400 mb-1">{t("الوقت المتبقي (تقديري)", "Time left (est.)")}</p>
              <p className="font-semibold text-zinc-700">{phase === "uploading" ? formatTime(eta) : "—"}</p>
            </div>
            <div className="rounded-lg bg-zinc-50 p-3">
              <p className="text-xs text-zinc-400 mb-1">{t("الوقت المنقضي", "Elapsed")}</p>
              <p className="font-semibold text-zinc-700">{formatTime(elapsed)}</p>
            </div>
            <div className="rounded-lg bg-zinc-50 p-3">
              <p className="text-xs text-zinc-400 mb-1">{t("المحاولة", "Attempt")}</p>
              <p className="font-semibold text-zinc-700">{t("الرفع المباشر", "Direct upload")}</p>
            </div>
          </div>
        )}

        {phase === "preparing" && (
          <p className="flex items-center gap-2 text-xs text-zinc-400">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            {t("يتم تجهيز رابط الرفع الآمن...", "Creating secure upload link...")}
          </p>
        )}

        {phase === "done" && (
          <p className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle2 className="w-4 h-4" />
            {t("تم رفع الملف بنجاح، جارٍ إضافته الآن.", "File uploaded successfully, adding it now.")}
          </p>
        )}

        {phase === "error" && error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4 mb-4">
            <p className="text-sm text-red-700 leading-relaxed">{error}</p>
          </div>
        )}

        {phase === "error" && (
          <div className="flex gap-3">
            <button
              onClick={() => file && run(file)}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#f97316] text-white rounded-lg text-sm font-medium hover:bg-[#fb923c] cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              {t("إعادة المحاولة", "Try again")}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2.5 text-sm text-zinc-600 hover:bg-zinc-100 rounded-lg cursor-pointer"
            >
              {t("إغلاق", "Close")}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
