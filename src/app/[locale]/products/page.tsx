import { getTranslations } from "next-intl/server"
import { Link } from "@/lib/i18n/navigation"
import Image from "next/image"
import Header from "@/components/layout/Header"
import Footer from "@/components/layout/Footer"
import { Search, SlidersHorizontal, ChevronLeft, ChevronRight } from "lucide-react"
import { getCachedCategories, getCachedProducts } from "@/lib/home-data"

const PAGE_SIZE = 24

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ q?: string; category?: string; sort?: string; page?: string }>
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "nav" })
  return { title: `${t("products")} - Sneakers Club Syria` }
}

export default async function ProductsPage({ params, searchParams }: Props) {
  const { locale } = await params
  const { q, category, sort } = await searchParams
  const rawPage = Number((await searchParams).page) || 1
  const page = Math.max(1, rawPage)
  const t = await getTranslations({ locale, namespace: "nav" })
  const isRtl = locale === "ar"

  const categories = await getCachedCategories()
  const activeCat = category && category !== "all" ? categories.find((c: any) => c.slug === category) : undefined

  const { products, total } = await getCachedProducts({
    q,
    categoryId: activeCat?.id,
    sort,
    page,
    limit: PAGE_SIZE,
  })

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const buildUrl = (pageNum: number) => {
    const sp = new URLSearchParams()
    if (q) sp.set("q", q)
    if (category && category !== "all") sp.set("category", category)
    if (sort) sp.set("sort", sort)
    if (pageNum > 1) sp.set("page", String(pageNum))
    const qs = sp.toString()
    return qs ? `/products?${qs}` : "/products"
  }

  const pageNumbers: number[] = []
  for (let p = 1; p <= totalPages; p++) {
    if (totalPages <= 7 || Math.abs(p - page) <= 2 || p === 1 || p === totalPages) {
      pageNumbers.push(p)
    }
  }
  const withEllipsis: (number | "...")[] = []
  pageNumbers.forEach((p, i) => {
    if (i > 0 && p - pageNumbers[i - 1] > 1) withEllipsis.push("...")
    withEllipsis.push(p)
  })

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
                {isRtl ? `عرض ${total} منتج` : `Showing ${total} products`}
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
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.map((product: any) => (
                    <Link
                      key={product.id}
                      href={`/product/${product.id}`}
                      className="group bg-white rounded-2xl overflow-hidden border border-zinc-100 hover:border-accent/30 hover:shadow-sm transition-all"
                    >
                      <div className="aspect-square bg-gradient-to-br from-zinc-200 to-zinc-300 flex items-center justify-center relative">
                        {product.images?.[0] ? (
                          <Image
                            src={product.images[0]}
                            alt={isRtl ? product.name_ar || "" : product.name_en || ""}
                            fill
                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 33vw"
                            className="object-cover"
                          />
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

                {totalPages > 1 && (
                  <nav className="flex items-center justify-center gap-1 mt-10" aria-label="Pagination">
                    {page > 1 ? (
                      <Link
                        href={buildUrl(page - 1)}
                        className="flex items-center gap-1 px-3 py-2 text-sm rounded-lg border border-zinc-200 hover:border-accent hover:text-accent transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        {isRtl ? "السابق" : "Previous"}
                      </Link>
                    ) : (
                      <span className="flex items-center gap-1 px-3 py-2 text-sm rounded-lg border border-zinc-100 text-zinc-300 cursor-not-allowed">
                        <ChevronLeft className="w-4 h-4" />
                        {isRtl ? "السابق" : "Previous"}
                      </span>
                    )}

                    {withEllipsis.map((p, i) =>
                      p === "..." ? (
                        <span key={`e${i}`} className="px-2 py-2 text-sm text-zinc-400">
                          ...
                        </span>
                      ) : (
                        <Link
                          key={p}
                          href={buildUrl(p)}
                          aria-current={p === page ? "page" : undefined}
                          className={`w-9 h-9 flex items-center justify-center text-sm rounded-lg transition-colors ${
                            p === page
                              ? "bg-accent text-white font-medium"
                              : "border border-zinc-200 hover:border-accent hover:text-accent"
                          }`}
                        >
                          {p}
                        </Link>
                      )
                    )}

                    {page < totalPages ? (
                      <Link
                        href={buildUrl(page + 1)}
                        className="flex items-center gap-1 px-3 py-2 text-sm rounded-lg border border-zinc-200 hover:border-accent hover:text-accent transition-colors"
                      >
                        {isRtl ? "التالي" : "Next"}
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    ) : (
                      <span className="flex items-center gap-1 px-3 py-2 text-sm rounded-lg border border-zinc-100 text-zinc-300 cursor-not-allowed">
                        {isRtl ? "التالي" : "Next"}
                        <ChevronRight className="w-4 h-4" />
                      </span>
                    )}
                  </nav>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      <Footer locale={locale} />
    </>
  )
}
