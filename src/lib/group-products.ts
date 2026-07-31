export type ProductCluster = {
  key: string
  variants: any[]
}

export function groupBySku(products: any[]): ProductCluster[] {
  const map = new Map<string, any[]>()
  for (const p of products || []) {
    const key = p?.name_en || p?.id
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(p)
  }
  return Array.from(map.entries()).map(([key, variants]) => ({ key, variants }))
}
