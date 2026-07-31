import { getTranslations } from "next-intl/server"
import { Link } from "@/lib/i18n/navigation"
import Header from "@/components/layout/Header"
import Footer from "@/components/layout/Footer"
import ProductFilters from "@/components/products/ProductFilters"
import ProductCard from "@/components/products/ProductCard"
import { Search, ChevronLeft, ChevronRight } from "lucide-react"
import { getCachedCategories, getCachedProducts, getCachedAllSizes } from "@/lib/home-data"
import { groupBySku } from "@/lib/group-products"

const PAGE_SIZE = 24

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ q?: string; category?: string; sort?: string; size?: string; page?: string }>
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "nav" })
  return { title: `${t("products")} - Sneakers Club Syria` }
}

export default async function ProductsPage({ params, searchParams }: Props) {
  const { locale } = await params
  const { q, category, sort, size } = await searchParams
  const rawPage = Number((await searchParams).page) || 1
  const page = Math.max(1, rawPage)
  const t = await getTranslations({ locale, namespace: "nav" })
  const isRtl = locale === "ar"

  const selectedSizes = size
    ? size.split(",").map((s) => s.trim()).filter(Boolean)
    : []

  const categories = await getCachedCategories()
  const activeCat = category && category !== "all" ? categories.find((c: any) => c.slug === category) : undefined

  const sizes = await getCachedAllSizes(activeCat?.id)

  const { products, total } = await getCachedProducts({
    q,
    categoryId: activeCat?.id,
    sort,
    sizes: selectedSizes,
    page,
    limit: PAGE_SIZE,
  })

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const buildUrl = (pageNum: number) => {
    const sp = new URLSearchParams()
    if (q) sp.set("q", q)
    if (category && category !== "all") sp.set("category", category)
    if (sort) sp.set("sort", sort)
    if (selectedSizes.length > 0) sp.set("size", selectedSizes.join(","))
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
          <ProductFilters
            categories={categories}
            sizes={sizes}
            activeCategory={category}
            activeSizes={selectedSizes}
            sort={sort}
            q={q}
            isRtl={isRtl}
          />

          <div className="flex-1">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-xl sm:text-2xl font-bold">{t("products")}</h1>
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
                <div className="grid grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                  {groupBySku(products).map((cluster) => (
                    <ProductCard key={cluster.key} variants={cluster.variants} locale={locale} />
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
