export type UploadPhase = "preparing" | "uploading" | "saving"
export type UploadProgress = { phase: UploadPhase; loaded: number; total: number }

export type UploadErrorCode =
  | "type-unsupported"
  | "too-large"
  | "unauthorized"
  | "forbidden"
  | "rate-limited"
  | "setup-failed"
  | "network"
  | "timeout"
  | "upload-failed"
  | "save-failed"

export class UploadError extends Error {
  code: UploadErrorCode
  status?: number

  constructor(code: UploadErrorCode, message: string, status?: number) {
    super(message)
    this.name = "UploadError"
    this.code = code
    this.status = status
  }
}

function mapInitError(status: number, data: any): UploadError {
  switch (status) {
    case 415:
      return new UploadError("type-unsupported", data?.error ?? "Unsupported file type", status)
    case 413:
      return new UploadError("too-large", data?.error ?? "File too large", status)
    case 401:
      return new UploadError("unauthorized", "You must be signed in as admin", status)
    case 403:
      return new UploadError("forbidden", "Your account is not admin", status)
    case 429:
      return new UploadError("rate-limited", "Too many requests, try again in a minute", status)
    default:
      return new UploadError("setup-failed", data?.error ?? `Upload setup failed (${status})`, status)
  }
}

export async function directUpload(
  file: File,
  onProgress: (p: UploadProgress) => void
): Promise<string> {
  onProgress({ phase: "preparing", loaded: 0, total: file.size })

  const initRes = await fetch("/api/upload/direct", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: file.name, size: file.size, type: file.type || "" }),
  })
  const initData = await initRes.json().catch(() => null)
  if (!initRes.ok) throw mapInitError(initRes.status, initData)
  if (!initData?.signedUrl) throw new UploadError("setup-failed", "No upload URL returned")

  const contentType = initData.contentType || file.type || "application/octet-stream"

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open("PUT", initData.signedUrl)
    xhr.setRequestHeader("Content-Type", contentType)
    xhr.timeout = 1000 * 60 * 30
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress({ phase: "uploading", loaded: e.loaded, total: e.total })
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve()
      else reject(new UploadError("upload-failed", `Server rejected upload (${xhr.status})`, xhr.status))
    }
    xhr.onerror = () => reject(new UploadError("network", "Connection lost during upload"))
    xhr.ontimeout = () => reject(new UploadError("timeout", "Upload timed out"))
    xhr.send(file)
  })

  onProgress({ phase: "saving", loaded: file.size, total: file.size })

  const confirmRes = await fetch("/api/upload/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: initData.path, alt: file.name }),
  })
  const confirmData = await confirmRes.json().catch(() => null)
  if (!confirmRes.ok) {
    throw new UploadError("save-failed", confirmData?.error ?? `Saving failed (${confirmRes.status})`, confirmRes.status)
  }
  if (!confirmData?.url) throw new UploadError("save-failed", "No media URL returned")

  return confirmData.url
}

export function describeUploadError(
  err: unknown,
  isRtl: boolean,
  file?: { name: string; size: number }
): string {
  const t = (ar: string, en: string) => (isRtl ? ar : en)
  const name = file?.name ?? ""
  const mb = file ? (file.size / (1024 * 1024)).toFixed(1) : ""
  const status = err instanceof UploadError ? err.status : undefined
  const message = err instanceof Error ? err.message : ""

  switch (err instanceof UploadError ? err.code : undefined) {
    case "type-unsupported":
      return t(
        `صيغة الملف "${name}" غير مدعومة. الفيديو المسموح: MP4, M4V, WEBM, MOV — والصور: JPG, PNG, WEBP, GIF.`,
        `File "${name}" uses an unsupported format. Allowed videos: MP4, M4V, WEBM, MOV — images: JPG, PNG, WEBP, GIF.`
      )
    case "too-large":
      return t(
        `الملف "${name}" بحجم ${mb}MB، أكبر من الحد الأقصى 50MB للفيديو.`,
        `File "${name}" is ${mb}MB, above the 50MB video limit.`
      )
    case "unauthorized":
      return t(
        "انتهت جلستك. سجّل الدخول كأدمن ثم أعد المحاولة.",
        "Your session expired. Sign in as admin and retry."
      )
    case "forbidden":
      return t(
        "حسابك ليس أدمن ولا يملك صلاحية الرفع.",
        "Your account is not admin and cannot upload."
      )
    case "rate-limited":
      return t(
        "طلبات كثيرة جداً في وقت قصير. انتظر دقيقة ثم أعد المحاولة.",
        "Too many requests in a short time. Wait a minute and retry."
      )
    case "timeout":
      return t(
        "انتهت مهلة الرفع (الشبكة بطيئة جداً). أعد المحاولة.",
        "Upload timed out (very slow network). Retry."
      )
    case "network":
      return t(
        "انقطع الاتصال بالإنترنت أثناء الرفع. تحقق من الشبكة وأعد المحاولة.",
        "Internet connection lost during upload. Check your connection and retry."
      )
    case "upload-failed":
      return t(
        `الخادم رفض رفع الملف${status ? ` (رمز ${status})` : ""}. أعد المحاولة أو جرّب صيغة أخرى.`,
        `Server rejected the upload${status ? ` (status ${status})` : ""}. Retry or try another format.`
      )
    case "save-failed":
      return t(
        `تعذّر حفظ الملف في قاعدة البيانات: ${message}`,
        `Failed to save the file to the database: ${message}`
      )
    default:
      return t(
        `حدث خطأ غير متوقع: ${message}`,
        `Unexpected error: ${message}`
      )
  }
}
