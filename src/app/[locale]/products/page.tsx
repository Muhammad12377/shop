import { getTranslations } from "next-intl/server"
import { Link } from "@/lib/i18n/navigation"
import { createServerSupabase } from "@/lib/supabase/server"
import Header from "@/components/layout/Header"
import Footer from "@/components/layout/Footer"
import { Search, SlidersHorizontal } from "lucide-react"

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ q?: string; category?: string; sort?: string }>
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "nav" })
  return { title: `${t("products")} - Sneakers Club Syria` }
}

export default async function ProductsPage({ params, searchParams }: Props) {
  const { locale } = await params
  const { q, category, sort } = await searchParams
  const t = await getTranslations({ locale, namespace: "nav" })
  const pt = await getTranslations({ locale, namespace: "product" })
  const isRtl = locale === "ar"

  const supabase = await createServerSupabase()

  let query = supabase
    .from("products")
    .select("*, category:categories(*)")
    .eq("active", true)

  if (category && category !== "all") {
    const { data: cat } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", category)
      .single()
    if (cat) {
      query = query.eq("category_id", cat.id)
    }
  }

  if (q) {
    const searchCol = isRtl ? "name_ar" : "name_en"
    query = query.ilike(searchCol, `%${q}%`)
  }

  if (sort === "price-asc") {
    query = query.order("price", { ascending: true })
  } else if (sort === "price-desc") {
    query = query.order("price", { ascending: false })
  } else {
    query = query.order("created_at", { ascending: false })
  }

  const { data: products, count } = await query

  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .eq("active", true)
    .order("sort_order")

  return (
    <>
      <Header />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          <aside className="md:w-56 shrink-0">
            <div className="flex items-center gap-2 mb-4">
              <SlidersHorizontal className="w-4 h-4" />
              <span className="font-medium text-sm">{isRtl ? "تصفية" : "Filters"}</span>
            </div>
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-medium text-zinc-400 uppercase mb-2">
                  {isRtl ? "التصنيف" : "Category"}
                </h4>
                <div className="space-y-1">
                  <Link
                    href="/products"
                    className={`block px-3 py-1.5 text-sm rounded-lg transition-colors ${
                      !category ? "bg-accent/10 text-accent font-medium" : "hover:bg-zinc-100 text-zinc-600"
                    }`}
                  >
                    {isRtl ? "الكل" : "All"}
                  </Link>
                  {(categories || []).map((cat: any) => (
                    <Link
                      key={cat.id}
                      href={`/products?category=${cat.slug}`}
                      className={`block px-3 py-1.5 text-sm rounded-lg transition-colors ${
                        category === cat.slug
                          ? "bg-accent/10 text-accent font-medium"
                          : "hover:bg-zinc-100 text-zinc-600"
                      }`}
                    >
                      {isRtl ? cat.name_ar : cat.name_en}
                    </Link>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-medium text-zinc-400 uppercase mb-2">
                  {isRtl ? "الترتيب" : "Sort"}
                </h4>
                <div className="space-y-1">
                  {[
                    { key: "newest", label: isRtl ? "الأحدث" : "Newest" },
                    { key: "price-asc", label: isRtl ? "السعر: من الأقل" : "Price: Low to High" },
                    { key: "price-desc", label: isRtl ? "السعر: من الأعلى" : "Price: High to Low" },
                  ].map((s) => (
                    <Link
                      key={s.key}
                      href={`/products${s.key !== "newest" ? `?sort=${s.key}` : ""}${category ? `${s.key !== "newest" ? "&" : "?"}category=${category}` : ""}`}
                      className={`block px-3 py-1.5 text-sm rounded-lg transition-colors ${
                        (s.key === "newest" && !sort) || sort === s.key
                          ? "bg-accent/10 text-accent font-medium"
                          : "hover:bg-zinc-100 text-zinc-600"
                      }`}
                    >
                      {s.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          <div className="flex-1">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold">{t("products")}</h1>
              <p className="text-sm text-zinc-500">
                {isRtl ? `عرض ${count || 0} منتج` : `Showing ${count || 0} products`}
              </p>
            </div>

            {q && (
              <div className="mb-6 p-4 bg-zinc-50 rounded-xl">
                <p className="text-sm text-zinc-600">
                  {isRtl ? `نتائج البحث عن: "${q}"` : `Search results for: "${q}"`}
                </p>
              </div>
            )}

            {!products || products.length === 0 ? (
              <div className="text-center py-20">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-zinc-100 mb-4">
                  <Search className="w-6 h-6 text-zinc-400" />
                </div>
                <h3 className="text-lg font-medium text-zinc-600">
                  {isRtl ? "لا توجد منتجات" : "No products found"}
                </h3>
                <p className="text-sm text-zinc-400 mt-1">
                  {isRtl ? "حاول تعديل معايير البحث" : "Try adjusting your search criteria"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product: any) => (
                  <Link
                    key={product.id}
                    href={`/product/${product.id}`}
                    className="group bg-white rounded-2xl overflow-hidden border border-zinc-100 hover:border-accent/30 hover:shadow-sm transition-all"
                  >
                    <div className="aspect-square bg-gradient-to-br from-zinc-200 to-zinc-300 flex items-center justify-center relative">
                      {product.images?.[0] ? (
                        <img src={product.images[0]} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-zinc-400 text-sm">
                          {isRtl ? "صورة المنتج" : "Product Image"}
                        </span>
                      )}
                      {product.compare_price && (
                        <span className="absolute top-3 left-3 bg-accent text-white text-xs px-2 py-1 rounded-full font-medium">
                          {Math.round((1 - product.price / product.compare_price) * 100)}% OFF
                        </span>
                      )}
                    </div>
                    <div className="p-4">
                      <p className="text-xs text-zinc-400 mb-1">
                        {product.category
                          ? isRtl
                            ? product.category.name_ar
                            : product.category.name_en
                          : ""}
                      </p>
                      <h3 className="font-medium group-hover:text-accent transition-colors truncate">
                        {isRtl ? product.name_ar : product.name_en}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-accent font-bold">${product.price}</p>
                        {product.compare_price && (
                          <p className="text-xs text-zinc-400 line-through">
                            ${product.compare_price}
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer locale={locale} />
    </>
  )
}
