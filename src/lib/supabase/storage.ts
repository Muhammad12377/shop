import { createClient } from "./client"

export async function uploadImage(file: File, bucket: string = "products"): Promise<string | null> {
  try {
    const supabase = createClient()
    const ext = file.name.split(".").pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { data, error } = await supabase.storage.from(bucket).upload(fileName, file, {
      cacheControl: "3600",
      upsert: false,
    })
    if (error) throw error
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path)
    return urlData.publicUrl
  } catch {
    return null
  }
}

export async function deleteImage(path: string, bucket: string = "products"): Promise<boolean> {
  try {
    const supabase = createClient()
    const { error } = await supabase.storage.from(bucket).remove([path])
    return !error
  } catch {
    return false
  }
}

export async function uploadMultiple(files: File[], bucket: string = "products"): Promise<string[]> {
  const urls: string[] = []
  for (const file of files) {
    const url = await uploadImage(file, bucket)
    if (url) urls.push(url)
  }
  return urls
}
