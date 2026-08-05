export async function directUpload(file: File): Promise<string> {
  const initRes = await fetch("/api/upload/direct", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: file.name, size: file.size, type: file.type }),
  })
  const initData = await initRes.json().catch(() => null)
  if (!initRes.ok || initData?.error) {
    throw new Error(initData?.error ?? `Upload setup failed (${initRes.status})`)
  }

  const putRes = await fetch(initData.signedUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  })
  if (!putRes.ok) throw new Error(`Upload failed (${putRes.status})`)

  const confirmRes = await fetch("/api/upload/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: initData.path, alt: file.name }),
  })
  const confirmData = await confirmRes.json().catch(() => null)
  if (!confirmRes.ok || confirmData?.error) {
    throw new Error(confirmData?.error ?? `Upload confirm failed (${confirmRes.status})`)
  }

  return confirmData.url
}
