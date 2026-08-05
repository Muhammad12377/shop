export type ExtEntry = { type: string; video: boolean }

export const EXT_TYPES: Record<string, ExtEntry> = {
  jpg: { type: "image/jpeg", video: false },
  jpeg: { type: "image/jpeg", video: false },
  png: { type: "image/png", video: false },
  webp: { type: "image/webp", video: false },
  avif: { type: "image/avif", video: false },
  gif: { type: "image/gif", video: false },
  mp4: { type: "video/mp4", video: true },
  m4v: { type: "video/mp4", video: true },
  webm: { type: "video/webm", video: true },
  mov: { type: "video/quicktime", video: true },
}

export const MAX_IMAGE_SIZE = 5 * 1024 * 1024
export const MAX_VIDEO_SIZE = 50 * 1024 * 1024

export type UploadTypeCheck = {
  ok: boolean
  ext?: string
  type?: string
  isVideo?: boolean
  error?: string
  errorCode?: "type-unsupported"
}

export function validateUploadType(type: string, name: string): UploadTypeCheck {
  const ext = name.split(".").pop()?.toLowerCase() || ""
  const known = EXT_TYPES[ext]
  if (!known) {
    return {
      ok: false,
      errorCode: "type-unsupported",
      error:
        'Unsupported file format. Allowed images: JPG, PNG, WEBP, AVIF, GIF — videos: MP4, M4V, WEBM, MOV',
    }
  }

  const t = type.toLowerCase()
  if (t && !t.startsWith("image/") && !t.startsWith("video/")) {
    return {
      ok: false,
      errorCode: "type-unsupported",
      error: `File reports MIME type "${t}" which is not a supported image or video`,
    }
  }

  return { ok: true, ext, type: known.type, isVideo: known.video }
}

export function maxSizeFor(isVideo: boolean): number {
  return isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE
}

export function sizeErrorFor(isVideo: boolean, size: number): string {
  const max = maxSizeFor(isVideo)
  return `File is ${(size / (1024 * 1024)).toFixed(1)}MB, but the maximum is ${Math.round(max / (1024 * 1024))}MB`
}

export function sniffFileType(bytes: Uint8Array, declaredExt: string): boolean {
  const ascii = (s: string, off: number) => {
    for (let i = 0; i < s.length; i++) {
      if (bytes[off + i] !== s.charCodeAt(i)) return false
    }
    return true
  }
  const ext = declaredExt.toLowerCase()
  if (ext === "jpg" || ext === "jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  if (ext === "png") {
    return (
      bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
      bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
    )
  }
  if (ext === "gif") return ascii("GIF8", 0)
  if (ext === "webp") return ascii("RIFF", 0) && ascii("WEBP", 8)
  if (ext === "mp4" || ext === "m4v" || ext === "mov" || ext === "avif") {
    const size = (bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]
    return size >= 8 && ascii("ftyp", 4) && bytes[8] === 0
  }
  if (ext === "webm") return bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3
  return true
}
