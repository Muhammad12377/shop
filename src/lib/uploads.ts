export const ALLOWED_TYPES: Record<string, string[]> = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
  "image/avif": ["avif"],
  "image/gif": ["gif"],
  "video/mp4": ["mp4"],
  "video/webm": ["webm"],
  "video/quicktime": ["mov"],
}

export const MAX_IMAGE_SIZE = 5 * 1024 * 1024
export const MAX_VIDEO_SIZE = 50 * 1024 * 1024

export type UploadTypeCheck = {
  ok: boolean
  ext?: string
  isVideo?: boolean
  error?: string
}

export function validateUploadType(type: string, name: string): UploadTypeCheck {
  const t = type.toLowerCase()
  const ext = name.split(".").pop()?.toLowerCase() || ""
  if (!ALLOWED_TYPES[t] || !ALLOWED_TYPES[t].includes(ext)) {
    return {
      ok: false,
      error: "Only images (jpg, png, webp, avif, gif) or videos (mp4, webm, mov) are allowed",
    }
  }
  return { ok: true, ext, isVideo: t.startsWith("video/") }
}

export function maxSizeFor(isVideo: boolean): number {
  return isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE
}

export function sizeErrorFor(isVideo: boolean): string {
  return isVideo
    ? "File too large, maximum video size is 50MB"
    : "File too large, maximum image size is 5MB"
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
  if (ext === "mp4" || ext === "mov" || ext === "avif") {
    const size = (bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]
    return size >= 8 && ascii("ftyp", 4) && bytes[8] === 0
  }
  if (ext === "webm") return bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3
  return true
}
