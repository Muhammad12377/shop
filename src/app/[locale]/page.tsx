import { getTranslations, getLocale } from "next-intl/server"
import { Link } from "@/lib/i18n/navigation"
import Header from "@/components/layout/Header"
import Footer from "@/components/layout/Footer"
import { ArrowRight, Sparkles, Shield, Truck } from "lucide-react"

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
  return (
    <section className="relative bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 text-white overflow-hidden">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
      <div className="relative max-w-7xl mx-auto px-4 py-20 md:py-32">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-accent" />
            <span className="text-sm font-medium text-accent uppercase tracking-wider">
              {isRtl ? "مجموعة 2026" : "2026 Collection"}
            </span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            {t("hero_title")}
          </h1>
          <p className="text-lg md:text-xl text-zinc-400 mb-8 max-w-lg">
            {t("hero_subtitle")}
          </p>
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
  const categories = [
    { key: "men", color: "from-blue-900 to-blue-700" },
    { key: "women", color: "from-pink-900 to-pink-700" },
    { key: "kids", color: "from-green-900 to-green-700" },
    { key: "sports", color: "from-orange-900 to-orange-700" },
  ]

  return (
    <section className="py-16 bg-zinc-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold mb-2">{t("categories")}</h2>
          <p className="text-zinc-500">{locale === "ar" ? "تصفح حسب التصنيف" : "Browse by category"}</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.key}
              href={`/products?category=${cat.key}`}
              className={`relative h-48 rounded-2xl bg-gradient-to-br ${cat.color} overflow-hidden group`}
            >
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
              <div className="relative h-full flex items-end p-5">
                <span className="text-white font-semibold text-lg">{t(cat.key as any)}</span>
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
  const placeholderProducts = [
    { id: "1", name: { en: "Air Max Pulse", ar: "إير ماكس بولس" }, price: 149.99, category: "Men" },
    { id: "2", name: { en: "Runner X Pro", ar: "رانر إكس برو" }, price: 129.99, category: "Sports" },
    { id: "3", name: { en: "Street Style 3000", ar: "ستريت ستايل 3000" }, price: 99.99, category: "Women" },
    { id: "4", name: { en: "Classic Low Top", ar: "كلاسيك لو توب" }, price: 89.99, category: "Kids" },
  ]

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-3xl font-bold">{t("featured")}</h2>
            <p className="text-zinc-500 mt-1">{isRtl ? "أفضل المنتجات لهذا الأسبوع" : "Best products this week"}</p>
          </div>
          <Link href="/products" className="text-sm font-medium text-accent hover:underline">
            {isRtl ? "عرض الكل" : "View All"}
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {placeholderProducts.map((product) => (
            <Link
              key={product.id}
              href={`/product/${product.id}`}
              className="group bg-zinc-50 rounded-2xl overflow-hidden border border-zinc-100 hover:border-accent/30 transition-all"
            >
              <div className="aspect-square bg-gradient-to-br from-zinc-200 to-zinc-300 flex items-center justify-center">
                <span className="text-zinc-400 text-sm">
                  {isRtl ? "صورة المنتج" : "Product Image"}
                </span>
              </div>
              <div className="p-4">
                <p className="text-xs text-zinc-400 mb-1">{product.category}</p>
                <h3 className="font-medium group-hover:text-accent transition-colors">
                  {isRtl ? product.name.ar : product.name.en}
                </h3>
                <p className="text-accent font-bold mt-1">${product.price}</p>
              </div>
            </Link>
          ))}
        </div>
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
