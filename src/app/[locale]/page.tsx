import { getTranslations } from "next-intl/server"
import { Link } from "@/lib/i18n/navigation"
import Image from "next/image"
import Header from "@/components/layout/Header"
import Footer from "@/components/layout/Footer"
import { ArrowRight, Sparkles, Shield, Truck } from "lucide-react"
import { getCachedSettings, getCachedCategories, getCachedHomeProducts } from "@/lib/home-data"

export const revalidate = 60
export const dynamic = "force-static"

type Props = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "home" })
  return {
    title: "Sneakers Club Syria",
    description: t("hero_subtitle"),
  }
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params
  return (
    <>
      <Header />
      <main>
        <HeroSection locale={locale} />
        <FeaturesSection locale={locale} />
        <CategoriesSection locale={locale} />
        <FeaturedProductsSection locale={locale} />
        <NewsletterSection locale={locale} />
      </main>
      <Footer locale={locale} />
    </>
  )
}

async function HeroSection({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "home" })
  const isRtl = locale === "ar"

  const settings = await getCachedSettings()

  const heroTitle = settings
    ? isRtl
      ? settings.hero_title_ar || t("hero_title")
      : settings.hero_title_en || t("hero_title")
    : t("hero_title")

  const heroSubtitle = settings
    ? isRtl
      ? settings.hero_subtitle_ar || t("hero_subtitle")
      : settings.hero_subtitle_en || t("hero_subtitle")
    : t("hero_subtitle")

  const heroImage = settings?.hero_image_url

  return (
    <section className={`relative text-white overflow-hidden ${heroImage ? "bg-zinc-900" : "bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900"}`}>
      {heroImage ? (
        <Image
          src={heroImage}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
      )}
      <div className={`absolute inset-0 ${heroImage ? "bg-black/50" : ""}`} />
      <div className="relative max-w-7xl mx-auto px-4 py-20 md:py-32">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-accent" />
            <span className="text-sm font-medium text-accent uppercase tracking-wider">
              {isRtl ? "مجموعة 2026" : "2026 Collection"}
            </span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">{heroTitle}</h1>
          <p className="text-lg md:text-xl text-zinc-400 mb-8 max-w-lg">{heroSubtitle}</p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/products"
              className="inline-flex items-center justify-center gap-2 bg-accent hover:bg-accent-light text-white px-8 py-3 rounded-full font-medium transition-colors"
            >
              {t("shop_now")}
              <ArrowRight className={`w-4 h-4 ${isRtl ? "rotate-180" : ""}`} />
            </Link>
            <Link
              href="/products?category=men"
              locale={locale}
              className="inline-flex items-center justify-center gap-2 border border-white/20 hover:border-white/40 text-white px-8 py-3 rounded-full font-medium transition-colors"
            >
              {t("men")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

async function FeaturesSection({ locale }: { locale: string }) {
  const isRtl = locale === "ar"
  const features = [
    {
      icon: Truck,
      title: isRtl ? "توصيل سريع" : "Fast Delivery",
      desc: isRtl ? "توصيل إلى باب منزلك خلال 3-5 أيام" : "Delivery to your doorstep in 3-5 days",
    },
    {
      icon: Shield,
      title: isRtl ? "جودة مضمونة" : "Quality Guaranteed",
      desc: isRtl ? "أحذية أصلية 100% مع ضمان الجودة" : "100% authentic sneakers with quality guarantee",
    },
    {
      icon: Sparkles,
      title: isRtl ? "أسعار منافسة" : "Best Prices",
      desc: isRtl ? "أفضل الأسعار في السوق مع عروض حصرية" : "Best prices in the market with exclusive deals",
    },
  ]

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((f, i) => (
            <div key={i} className="text-center p-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-accent/10 text-accent mb-4">
                <f.icon className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-zinc-500 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

async function CategoriesSection({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "home" })
  const isRtl = locale === "ar"

  const categories = await getCachedCategories()

  const colorMap: Record<string, string> = {
    men: "from-blue-900 to-blue-700",
    women: "from-pink-900 to-pink-700",
    kids: "from-green-900 to-green-700",
    sports: "from-orange-900 to-orange-700",
  }

  const displayCats = categories || []

  return (
    <section className="py-16 bg-zinc-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold mb-2">{t("categories")}</h2>
          <p className="text-zinc-500">{isRtl ? "تصفح حسب التصنيف" : "Browse by category"}</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {displayCats.map((cat: any, i: number) => (
            <Link
              key={cat.id || i}
              href={`/products?category=${cat.slug}`}
              locale={locale}
              className={`relative h-48 rounded-2xl overflow-hidden group ${
                cat.image_url
                  ? "bg-zinc-200"
                  : `bg-gradient-to-br ${colorMap[cat.slug] || "from-zinc-900 to-zinc-700"}`
              }`}
            >
              {cat.image_url ? (
                <Image
                  src={cat.image_url}
                  alt={isRtl ? cat.name_ar || "" : cat.name_en || ""}
                  fill
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : null}
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
              <div className="relative h-full flex items-end p-5">
                <span className="text-white font-semibold text-lg drop-shadow">
                  {isRtl ? cat.name_ar : cat.name_en}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

async function FeaturedProductsSection({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "home" })
  const isRtl = locale === "ar"

  const displayProducts = await getCachedHomeProducts()
  const fallback = displayProducts.length === 0

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-3xl font-bold">{t("featured")}</h2>
            <p className="text-zinc-500 mt-1">{isRtl ? "أفضل المنتجات لهذا الأسبوع" : "Best products this week"}</p>
          </div>
          <Link href="/products" locale={locale} className="text-sm font-medium text-accent hover:underline">
            {isRtl ? "عرض الكل" : "View All"}
          </Link>
        </div>
        {fallback ? (
          <div className="text-center py-12 text-zinc-400">
            {isRtl ? "لا توجد منتجات بعد" : "No products yet"}
          </div>
        ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {displayProducts.map((product: any, i: number) => (
            <Link
              key={product.id}
              href={`/product/${product.id}`}
              locale={locale}
              className="group bg-zinc-50 rounded-2xl overflow-hidden border border-zinc-100 hover:border-accent/30 transition-all"
            >
              <div className="aspect-square bg-gradient-to-br from-zinc-200 to-zinc-300 flex items-center justify-center relative">
                {product.images?.[0] ? (
                  <Image
                    src={product.images[0]}
                    alt={isRtl ? product.name_ar || "" : product.name_en || ""}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className="object-cover"
                    priority={i < 4}
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
                <h3 className="font-medium group-hover:text-accent transition-colors">
                  {isRtl ? product.name_ar : product.name_en}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-accent font-bold">${product.price}</p>
                  {product.compare_price && (
                    <p className="text-xs text-zinc-400 line-through">${product.compare_price}</p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
        )}
      </div>
    </section>
  )
}

async function NewsletterSection({ locale }: { locale: string }) {
  const isRtl = locale === "ar"
  return (
    <section className="py-16 bg-accent">
      <div className="max-w-3xl mx-auto px-4 text-center text-white">
        <h2 className="text-3xl font-bold mb-3">
          {isRtl ? "ابق على تواصل" : "Stay in Touch"}
        </h2>
        <p className="text-white/80 mb-8">
          {isRtl
            ? "اشترك في النشرة البريدية لتحصل على أحدث العروض والمنتجات"
            : "Subscribe to our newsletter for the latest deals and products"}
        </p>
        <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
          <input
            type="email"
            placeholder={isRtl ? "بريدك الإلكتروني" : "Your email"}
            className="flex-1 px-4 py-3 rounded-full text-zinc-900 focus:outline-none"
          />
          <button
            type="submit"
            className="px-8 py-3 rounded-full bg-primary text-white font-medium hover:bg-zinc-800 transition-colors"
          >
            {isRtl ? "اشتراك" : "Subscribe"}
          </button>
        </form>
      </div>
    </section>
  )
}
