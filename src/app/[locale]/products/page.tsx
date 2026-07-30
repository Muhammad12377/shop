import { getTranslations, getLocale } from "next-intl/server"
import { Link } from "@/lib/i18n/navigation"
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
                  {["all", "men", "women", "kids", "sports"].map((cat) => (
                    <Link
                      key={cat}
                      href={cat === "all" ? "/products" : `/products?category=${cat}`}
                      className={`block px-3 py-1.5 text-sm rounded-lg transition-colors ${
                        (cat === "all" && !category) || category === cat
                          ? "bg-accent/10 text-accent font-medium"
                          : "hover:bg-zinc-100 text-zinc-600"
                      }`}
                    >
                      {cat === "all" ? (isRtl ? "الكل" : "All") : t(cat as any)}
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
                      href={`/products${category ? `?category=${category}` : ""}${s.key !== "newest" ? `${category ? "&" : "?"}sort=${s.key}` : ""}`}
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
                {isRtl ? "عرض 0 منتج" : "Showing 0 products"}
              </p>
            </div>

            {q && (
              <div className="mb-6 p-4 bg-zinc-50 rounded-xl">
                <p className="text-sm text-zinc-600">
                  {isRtl ? `نتائج البحث عن: "${q}"` : `Search results for: "${q}"`}
                </p>
              </div>
            )}

            <div className="text-center py-20">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-zinc-100 mb-4">
                <Search className="w-6 h-6 text-zinc-400" />
              </div>
              <h3 className="text-lg font-medium text-zinc-600">
                {isRtl ? "لا توجد منتجات بعد" : "No products yet"}
              </h3>
              <p className="text-sm text-zinc-400 mt-1">
                {isRtl
                  ? "سيتم إضافة المنتجات قريباً"
                  : "Products will be added soon"}
              </p>
            </div>
          </div>
        </div>
      </div>
      <Footer locale={locale} />
    </>
  )
}
