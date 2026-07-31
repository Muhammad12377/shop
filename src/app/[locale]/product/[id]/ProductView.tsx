"use client"

import { useState, useEffect } from "react"
import { useTranslations, useLocale } from "next-intl"
import Image from "next/image"
import { useParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Link } from "@/lib/i18n/navigation"
import { useCartStore } from "@/stores/cart"
import toast from "react-hot-toast"
import Header from "@/components/layout/Header"
import Footer from "@/components/layout/Footer"
import { ShoppingCart, Heart, Check, Package, Truck, Shield, Play } from "lucide-react"
import { colorBackground } from "@/lib/colors"

export default function ProductView({ product }: { product: any }) {
  const t = useTranslations("product")
  const params = useParams<{ locale: string; id: string }>()
  const [related, setRelated] = useState<any[]>([])
  const [selectedSize, setSelectedSize] = useState(product.sizes?.[0] || "")
  const [selectedColor, setSelectedColor] = useState(product.colors?.[0] || "")
  const [selectedImage, setSelectedImage] = useState(0)
  const [showVideo, setShowVideo] = useState(false)
  const [inWishlist, setInWishlist] = useState(false)
  const addItem = useCartStore((s) => s.addItem)
  const locale = useLocale()
  const isRtl = locale === "ar"

  useEffect(() => {
    const supabase = createClient()

    supabase
      .from("products")
      .select("*, category:categories(*)")
      .eq("category_id", product.category_id)
      .eq("active", true)
      .neq("id", product.id)
      .limit(4)
      .then(({ data: rel }) => setRelated(rel || []))

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase
          .from("wishlist")
          .select("id")
          .eq("user_id", user.id)
          .eq("product_id", product.id)
          .maybeSingle()
          .then(({ data: wl }) => setInWishlist(!!wl))
      }
    })
  }, [product.id])

  const toggleWishlist = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error("Please login first"); return }
    if (inWishlist) {
      await supabase.from("wishlist").delete().eq("user_id", user.id).eq("product_id", params.id)
      setInWishlist(false)
      toast.success(t("wishlist_remove"))
    } else {
      await supabase.from("wishlist").insert({ user_id: user.id, product_id: params.id })
      setInWishlist(true)
      toast.success(t("wishlist_add"))
    }
  }

  const handleAddToCart = () => {
    if (!product) return
    const cartId = crypto.randomUUID?.() || Math.random().toString()
    addItem({
      id: cartId,
      product_id: product.id,
      name_en: product.name_en,
      name_ar: product.name_ar,
      price: product.price,
      image: product.images?.[0] || "",
      size: selectedSize,
      color: selectedColor,
      quantity: 1,
      slug: product.slug,
      stock: product.stock,
    })
    toast.success(t("add_to_cart"))
  }

  if (!product) {
    return (
      <>
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <p className="text-zinc-500">{isRtl ? "المنتج غير موجود" : "Product not found"}</p>
          <Link href="/products" className="text-accent text-sm hover:underline mt-2 inline-block">
            {isRtl ? "العودة للمنتجات" : "Back to products"}
          </Link>
        </div>
        <Footer locale={params.locale} />
      </>
    )
  }

  return (
    <>
      <Header />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <nav className="flex items-center gap-2 text-sm text-zinc-400 mb-6">
          <Link href="/" className="hover:text-accent">{isRtl ? "الرئيسية" : "Home"}</Link>
          <span>/</span>
          <Link href="/products" className="hover:text-accent">{isRtl ? "منتجات" : "Products"}</Link>
          {product.category && (
            <>
              <span>/</span>
              <Link href={`/products?category=${product.category.slug}`} className="hover:text-accent">
                {isRtl ? product.category.name_ar : product.category.name_en}
              </Link>
            </>
          )}
        </nav>

        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          <div>
            <div className="aspect-square rounded-2xl bg-zinc-100 overflow-hidden mb-3 relative">
              {showVideo && product.video_url ? (
                <video
                  src={product.video_url}
                  poster={product.images?.[0] || undefined}
                  controls
                  className="absolute inset-0 w-full h-full object-contain"
                />
              ) : product.images?.[selectedImage] ? (
                <Image
                  src={product.images[selectedImage]}
                  alt={isRtl ? product.name_ar || "" : product.name_en || ""}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-16 h-16 text-zinc-300" />
                </div>
              )}
            </div>
            {(product.images?.length > 1 || product.video_url) && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {product.video_url && (
                  <button
                    onClick={() => { setShowVideo(true); setSelectedImage(0) }}
                    className={`w-16 h-16 rounded-xl shrink-0 overflow-hidden border-2 transition-colors relative bg-zinc-900 flex items-center justify-center ${
                      showVideo ? "border-accent" : "border-transparent"
                    }`}
                  >
                    <Play className="w-6 h-6 text-white fill-white" />
                  </button>
                )}
                {product.images.map((img: string, i: number) => (
                  <button
                    key={i}
                    onClick={() => { setSelectedImage(i); setShowVideo(false) }}
                    className={`w-16 h-16 rounded-xl shrink-0 overflow-hidden border-2 transition-colors relative ${
                      i === selectedImage && !showVideo ? "border-accent" : "border-transparent"
                    }`}
                  >
                    <Image
                      src={img}
                      alt=""
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="text-xs text-zinc-400 uppercase tracking-wider mb-2">
              {product.category
                ? isRtl
                  ? product.category.name_ar
                  : product.category.name_en
                : ""}
            </p>
            <h1 className="text-3xl font-bold mb-4">
              {isRtl ? product.name_ar : product.name_en}
            </h1>

            <div className="flex items-center gap-4 mb-6">
              <p className="text-3xl font-bold text-accent">${product.price}</p>
              {product.compare_price && (
                <>
                  <p className="text-lg text-zinc-400 line-through">${product.compare_price}</p>
                  <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                    {isRtl
                      ? `وفرت $${(product.compare_price - product.price).toFixed(2)}`
                      : `Save $${(product.compare_price - product.price).toFixed(2)}`}
                  </span>
                </>
              )}
            </div>

            <p className="text-zinc-600 mb-8 leading-relaxed">
              {isRtl ? product.description_ar : product.description_en}
            </p>

            <div className="mb-6">
              <p className="text-sm font-medium mb-3">{t("sizes")}</p>
              <div className="flex flex-wrap gap-2">
                {(product.sizes || []).map((size: string) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`px-4 py-2 rounded-xl border text-sm transition-colors ${
                      selectedSize === size
                        ? "border-accent bg-accent/5 text-accent font-medium"
                        : "border-zinc-200 hover:border-accent hover:text-accent"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-8">
              <p className="text-sm font-medium mb-3">{t("colors")}</p>
              <div className="flex gap-2">
                {(product.colors || []).map((color: string) => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={`w-8 h-8 rounded-full border-2 transition-colors ${
                      selectedColor === color ? "border-accent scale-110" : "border-zinc-200"
                    }`}
                    style={{ background: colorBackground(color) }}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 mb-6">
              {product.stock > 0 ? (
                <span className="flex items-center gap-1.5 text-sm text-green-600">
                  <Check className="w-4 h-4" />
                  {t("in_stock")}
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-sm text-red-500">
                  <Package className="w-4 h-4" />
                  {t("out_of_stock")}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleAddToCart}
                disabled={product.stock <= 0}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full bg-accent text-white font-medium hover:bg-accent-light transition-colors disabled:opacity-50"
              >
                <ShoppingCart className="w-5 h-5" />
                {t("add_to_cart")}
              </button>
              <button
                onClick={toggleWishlist}
                className={`p-3 rounded-full border transition-colors ${
                  inWishlist
                    ? "border-red-200 bg-red-50 text-red-500"
                    : "border-zinc-200 hover:border-red-200 hover:text-red-400"
                }`}
              >
                <Heart className={`w-5 h-5 ${inWishlist ? "fill-red-500" : ""}`} />
              </button>
            </div>

            <div className="flex items-center gap-6 mt-6 pt-6 border-t border-zinc-100 text-sm text-zinc-500">
              <span className="flex items-center gap-1.5">
                <Truck className="w-4 h-4" />
                {isRtl ? "توصيل سريع" : "Fast Delivery"}
              </span>
              <span className="flex items-center gap-1.5">
                <Shield className="w-4 h-4" />
                {t("guaranteed_authentic")}
              </span>
            </div>
          </div>
        </div>

        {related.length > 0 && (
          <section className="mt-16">
            <h2 className="text-2xl font-bold mb-8">{t("related")}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {related.map((rel: any) => (
                <Link
                  key={rel.id}
                  href={`/product/${rel.id}`}
                  className="group bg-white rounded-2xl overflow-hidden border border-zinc-100 hover:border-accent/30 transition-all"
                >
                  <div className="aspect-square bg-gradient-to-br from-zinc-200 to-zinc-300 flex items-center justify-center relative">
                    {rel.images?.[0] ? (
                      <Image
                        src={rel.images[0]}
                        alt={isRtl ? rel.name_ar || "" : rel.name_en || ""}
                        fill
                        sizes="(max-width: 768px) 50vw, 25vw"
                        className="object-cover"
                      />
                    ) : (
                      <span className="text-zinc-400 text-xs">{isRtl ? "صورة" : "Image"}</span>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-xs text-zinc-400 truncate">
                      {rel.category ? (isRtl ? rel.category.name_ar : rel.category.name_en) : ""}
                    </p>
                    <h3 className="font-medium text-sm group-hover:text-accent transition-colors truncate">
                      {isRtl ? rel.name_ar : rel.name_en}
                    </h3>
                    <p className="text-accent font-bold text-sm mt-1">${rel.price}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
      <Footer locale={params.locale} />
    </>
  )
}
