import { getTranslations } from "next-intl/server"
import { Link } from "@/lib/i18n/navigation"
import Image from "next/image"
import Header from "@/components/layout/Header"
import Footer from "@/components/layout/Footer"
import ProductCard from "@/components/products/ProductCard"
import Reveal from "@/components/motion/Reveal"
import { ArrowLeft, ChevronLeft, ChevronRight, Package, Layers } from "lucide-react"
import { getCachedCategories, getCachedProducts } from "@/lib/home-data"
import { groupBySku } from "@/lib/group-products"

const PAGE_SIZE = 24

type Props = {
  params: Promise<{ locale: string; slug: string }>
  searchParams: Promise<{ page?: string }>
}

function collectDescendantIds(categories: any[], id: string): string[] {
  const ids: string[] = []
  const stack = [id]
  while (stack.length) {
    const cur = stack.pop()!
    for (const c of categories) {
      if (c.parent_id === cur) {
        ids.push(c.id)
        stack.push(c.id)
      }
    }
  }
  return ids
}

export async function generateMetadata({ params }: Props) {
  const { locale, slug } = await params
  const categories = await getCachedCategories()
  const cat = categories.find((c: any) => c.slug === slug)
  const name = cat ? (locale === "ar" ? cat.name_ar || cat.name_en : cat.name_en || cat.name_ar) : slug
  return { title: `${name} - Sneakers Take Off` }
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { locale, slug } = await params
  const { page: rawPage } = await searchParams
  const page = Math.max(1, Number(rawPage) || 1)
  const t = await getTranslations({ locale, namespace: "home" })
  const isRtl = locale === "ar"

  const categories = await getCachedCategories()
  const cat = categories.find((c: any) => c.slug === slug)
  const colorMap: Record<string, string> = {
    shoes: "from-blue-900 to-blue-700",
    sweaters: "from-pink-900 to-pink-700",
    pants: "from-green-900 to-green-700",
    "t-shirts": "from-sky-900 to-sky-700",
    jackets: "from-zinc-900 to-zinc-700",
    shorts: "from-amber-900 to-amber-700",
    accessories: "from-violet-900 to-violet-700",
  }

  if (!cat) {
    return (
      <>
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold mb-4">{isRtl ? "القسم غير موجود" : "Section not found"}</h1>
          <Link href="/" className="text-accent font-medium hover:underline">
            {isRtl ? "العودة للرئيسية" : "Back to home"}
          </Link>
        </div>
        <Footer locale={locale} />
      </>
    )
  }

  const children = categories
    .filter((c: any) => c.parent_id === cat.id)
    .sort((a: any, b: any) => a.sort_order - b.sort_order)

  const descendantIds = collectDescendantIds(categories, cat.id)
  const { products, total } = await getCachedProducts({
    categoryIds: [cat.id, ...descendantIds],
    page,
    limit: PAGE_SIZE,
  })

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const catName = isRtl ? cat.name_ar || cat.name_en : cat.name_en || cat.name_ar

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
      <div className="max-w-7xl mx-auto px-4 py-6">
        <nav className="flex items-center gap-2 text-sm text-zinc-500 mb-6">
          <Link href="/" className="hover:text-accent transition-colors">
            {isRtl ? "الرئيسية" : "Home"}
          </Link>
          <ChevronLeft className={`w-4 h-4 ${isRtl ? "rotate-180" : ""}`} />
          <span className="text-zinc-900 font-medium">{catName}</span>
        </nav>

        <Reveal>
          <div
            className={`relative rounded-2xl overflow-hidden h-40 md:h-56 mb-8 ${
              cat.image_url ? "bg-zinc-200" : `bg-gradient-to-br ${colorMap[cat.slug] || "from-zinc-900 to-zinc-700"}`
            }`}
          >
            {cat.image_url ? (
              <Image src={cat.image_url} alt={catName} fill priority sizes="100vw" className="object-cover" />
            ) : null}
            <div className="absolute inset-0 bg-black/25" />
            <div className="relative h-full flex items-end p-6 md:p-10">
              <h1 className="text-3xl md:text-5xl font-bold text-white drop-shadow">{catName}</h1>
            </div>
          </div>
        </Reveal>

        {children.length > 0 && (
          <Reveal className="mb-10">
            <div className="flex items-center gap-2 mb-5">
              <Layers className="w-5 h-5 text-accent" />
              <h2 className="text-xl font-bold">{isRtl ? "الأصناف" : "Subcategories"}</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {children.map((child: any, i: number) => {
                const childName = isRtl ? child.name_ar || child.name_en : child.name_en || child.name_ar
                return (
                  <Reveal key={child.id} delay={i * 80} stagger>
                    <Link
                      href={`/products?category=${child.slug}`}
                      locale={locale}
                      className={`relative h-32 md:h-40 rounded-2xl overflow-hidden group block ${
                        child.image_url
                          ? "bg-zinc-200"
                          : `bg-gradient-to-br ${colorMap[child.slug] || "from-zinc-800 to-zinc-600"}`
                      } transition-all duration-300 hover:-translate-y-1 hover:shadow-lg`}
                    >
                      {child.image_url ? (
                        <Image
                          src={child.image_url}
                          alt={childName}
                          fill
                          sizes="(max-width: 768px) 50vw, 25vw"
                          className="object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      ) : null}
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                      <div className="relative h-full flex items-end p-4">
                        <span className="text-white font-semibold drop-shadow">{childName}</span>
                      </div>
                    </Link>
                  </Reveal>
                )
              })}
            </div>
          </Reveal>
        )}

        <Reveal>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">{isRtl ? "المنتجات" : "Products"}</h2>
            <p className="text-sm text-zinc-500">
              {isRtl ? `عرض ${total} منتج` : `Showing ${total} products`}
            </p>
          </div>

          {products.length === 0 ? (
            <div className="text-center py-20">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-zinc-100 mb-4">
                <Package className="w-6 h-6 text-zinc-400" />
              </div>
              <h3 className="text-lg font-medium text-zinc-600">
                {isRtl ? "لا توجد منتجات في هذا القسم" : "No products in this section yet"}
              </h3>
              <Link href="/products" className="inline-flex items-center gap-1.5 mt-4 text-accent font-medium hover:underline">
                <ArrowLeft className={`w-4 h-4 ${isRtl ? "rotate-180" : ""}`} />
                {isRtl ? "تصفح كل المنتجات" : "Browse all products"}
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                {groupBySku(products).map((cluster, i) => (
                  <Reveal key={cluster.key} delay={(i % 8) * 70} stagger>
                    <ProductCard variants={cluster.variants} locale={locale} />
                  </Reveal>
                ))}
              </div>

              {totalPages > 1 && (
                <nav className="flex flex-wrap items-center justify-center gap-1 mt-10" aria-label="Pagination">
                  {page > 1 ? (
                    <Link
                      href={`/category/${cat.slug}?page=${page - 1}`}
                      locale={locale}
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
                        href={`/category/${cat.slug}?page=${p}`}
                        locale={locale}
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
                      href={`/category/${cat.slug}?page=${page + 1}`}
                      locale={locale}
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
        </Reveal>
      </div>
      <Footer locale={locale} />
    </>
  )
}
