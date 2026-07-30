import { getTranslations } from "next-intl/server"
import { notFound } from "next/navigation"
import Header from "@/components/layout/Header"
import Footer from "@/components/layout/Footer"


type Props = {
  params: Promise<{ locale: string; id: string }>
}

export async function generateMetadata({ params }: Props) {
  const { locale, id } = await params
  return { title: `Product - Sneakers Club Syria` }
}

export default async function ProductPage({ params }: Props) {
  const { locale, id } = await params
  const pt = await getTranslations({ locale, namespace: "product" })
  const isRtl = locale === "ar"

  const supabase = (await import("@/lib/supabase/server")).createServerSupabase
  // Will fetch product data when DB is ready
  const product = null

  if (!product && true) {
    return (
      <>
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-16">
          <div className="grid md:grid-cols-2 gap-12">
            <div className="aspect-square rounded-2xl bg-gradient-to-br from-zinc-200 to-zinc-300 flex items-center justify-center">
              <span className="text-zinc-400">{isRtl ? "صورة المنتج" : "Product Image"}</span>
            </div>
            <div>
              <span className="text-xs text-zinc-400 uppercase tracking-wider mb-2 block">
                {isRtl ? "منتجات" : "Products"}
              </span>
              <h1 className="text-3xl font-bold mb-4">
                {isRtl ? "منتج تجريبي" : "Sample Product"}
              </h1>
              <p className="text-3xl font-bold text-accent mb-6">$149.99</p>
              <p className="text-zinc-600 mb-8 leading-relaxed">
                {isRtl
                  ? "هذا منتج تجريبي. سيتم ربط قاعدة البيانات قريباً."
                  : "This is a sample product. Database connection coming soon."}
              </p>

              <div className="mb-6">
                <p className="text-sm font-medium mb-3">{pt("sizes")}</p>
                <div className="flex flex-wrap gap-2">
                  {["EU 39", "EU 40", "EU 41", "EU 42", "EU 43", "EU 44"].map((size) => (
                    <button
                      key={size}
                      className="px-4 py-2 rounded-xl border border-zinc-200 text-sm hover:border-accent hover:text-accent transition-colors"
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-8">
                <p className="text-sm font-medium mb-3">{pt("colors")}</p>
                <div className="flex gap-2">
                  {["#000", "#fff", "#f97316", "#2563eb", "#16a34a"].map((color) => (
                    <button
                      key={color}
                      className="w-8 h-8 rounded-full border-2 border-zinc-200 hover:border-accent transition-colors"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <button className="w-full py-3 rounded-full bg-accent text-white font-medium hover:bg-accent-light transition-colors">
                {pt("add_to_cart")}
              </button>
            </div>
          </div>
        </div>
        <Footer locale={locale} />
      </>
    )
  }
}
