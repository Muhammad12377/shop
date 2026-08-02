import { unstable_cache } from "next/cache"
import { createClient } from "@supabase/supabase-js"

const client = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
)

export const getCachedSettings = unstable_cache(
  async () => {
    const { data } = await client.from("settings").select("key, value")
    const settings: Record<string, any> = {}
    for (const row of data || []) settings[row.key] = row.value
    return settings
  },
  ["home-settings"],
  { tags: ["home"], revalidate: 60 }
)

export const getCachedCategories = unstable_cache(
  async () => {
    const { data } = await client
      .from("categories")
      .select("*")
      .eq("active", true)
      .order("sort_order")
    return data || []
  },
  ["home-categories"],
  { tags: ["home"], revalidate: 60 }
)

export const getCachedHomeProducts = unstable_cache(
  async () => {
    const { data: featured } = await client
      .from("products")
      .select("*, category:categories!products_category_id_fkey(*)")
      .eq("active", true)
      .eq("featured", true)
      .order("created_at", { ascending: false })
      .limit(4)

    if (featured && featured.length > 0) return featured

    const { data: latest } = await client
      .from("products")
      .select("*, category:categories!products_category_id_fkey(*)")
      .eq("active", true)
      .order("created_at", { ascending: false })
      .limit(4)

    return latest || []
  },
  ["home-products"],
  { tags: ["home"], revalidate: 60 }
)

export const getCachedProduct = unstable_cache(
  async (id: string) => {
    const { data } = await client
      .from("products")
      .select("*, category:categories!products_category_id_fkey(*)")
      .eq("id", id)
      .single()
    return data
  },
  ["product"],
  { tags: ["products", "home"], revalidate: 60 }
)

export const getCachedSiblingProducts = unstable_cache(
  async (id: string, nameEn: string, nameAr: string) => {
    const name = nameEn || nameAr
    if (!name) return []
    const { data } = await client
      .from("products")
      .select("id, name_en, name_ar, colors, images, slug")
      .eq("active", true)
      .neq("id", id)
      .or(`name_en.eq.${name.replace(/'/g, "")},name_ar.eq.${name.replace(/'/g, "")}`)
    return data || []
  },
  ["product-siblings"],
  { tags: ["products", "home"], revalidate: 60 }
)

export const getCachedAllSizes = unstable_cache(
  async (categoryIds?: string[]) => {
    let query = client.from("products").select("sizes").eq("active", true)
    if (categoryIds && categoryIds.length > 0) {
      const { data: catRows } = await client
        .from("product_categories")
        .select("product_id")
        .in("category_id", categoryIds)
      const ids = Array.from(new Set((catRows || []).map((r: any) => r.product_id)))
      if (ids.length > 0) {
        query = query.in("id", ids)
      } else {
        query = query.eq("id", "00000000-0000-0000-0000-000000000000")
      }
    }
    const { data } = await query
    const set = new Set<string>()
    for (const row of data || []) {
      for (const s of row.sizes || []) {
        if (s) set.add(String(s))
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }))
  },
  ["products-sizes"],
  { tags: ["products", "home"], revalidate: 60 }
)

export const getCachedProducts = unstable_cache(
  async (opts: { q?: string; categoryIds?: string[]; sort?: string; sizes?: string[]; page: number; limit: number }) => {
    const search = opts.q?.replace(/[%_]/g, "").trim()

    let matchedIds: string[] | null = null
    if (opts.categoryIds && opts.categoryIds.length > 0) {
      const { data: catRows } = await client
        .from("product_categories")
        .select("product_id")
        .in("category_id", opts.categoryIds)
      matchedIds = Array.from(new Set((catRows || []).map((r: any) => r.product_id)))
    }

    let query = client
      .from("products")
      .select("*, category:categories!products_category_id_fkey(*)", { count: "exact" })
      .eq("active", true)

    if (matchedIds) {
      if (matchedIds.length === 0) return { products: [], total: 0 }
      query = query.in("id", matchedIds)
    }

    if (search) {
      query = query.or(`name_en.ilike.%${search}%,name_ar.ilike.%${search}%`)
    }

    if (opts.sizes && opts.sizes.length > 0) {
      query = query.overlaps("sizes", opts.sizes)
    }

    if (opts.sort === "price-asc") {
      query = query.order("price", { ascending: true })
    } else if (opts.sort === "price-desc") {
      query = query.order("price", { ascending: false })
    } else {
      query = query.order("created_at", { ascending: false })
    }

    query = query.range((opts.page - 1) * opts.limit, opts.page * opts.limit - 1)

    const { data, count } = await query
    return { products: data || [], total: count || 0 }
  },
  ["products-list"],
  { tags: ["products", "home"], revalidate: 60 }
)
