"use client"

import { useState, useEffect } from "react"
import { useTranslations, useLocale } from "next-intl"
import Image from "next/image"
import { useParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Link, useRouter } from "@/lib/i18n/navigation"
import { useCartStore } from "@/stores/cart"
import toast from "react-hot-toast"
import Header from "@/components/layout/Header"
import Footer from "@/components/layout/Footer"
import { ShoppingCart, Heart, Check, Package, Truck, Shield, Play } from "lucide-react"
import { colorBackground, colorLabel } from "@/lib/colors"
import ProductCard from "@/components/products/ProductCard"
import { groupBySku } from "@/lib/group-products"
import Reviews from "@/components/products/Reviews"

export default function ProductView({ product, siblings }: { product: any; siblings?: any[] }) {
  const t = useTranslations("product")
  const params = useParams<{ locale: string; id: string }>()
  const router = useRouter()
  const [related, setRelated] = useState<any[]>([])
  const hasPerSize = !!(product?.size_stock && Object.keys(product.size_stock).length > 0)
  const sizeQty = (s: string) => (hasPerSize ? Number(product?.size_stock?.[s] ?? 0) : product?.stock ?? 0)
  const initialSize =
    (product?.sizes || []).find((s: string) => sizeQty(s) > 0) || product?.sizes?.[0] || ""
  const [selectedSize, setSelectedSize] = useState(initialSize)
  const [selectedImage, setSelectedImage] = useState(0)
  const [showVideo, setShowVideo] = useState(false)
  const [inWishlist, setInWishlist] = useState(false)
  const addItem = useCartStore((s) => s.addItem)
  const cartQty = useCartStore((s) =>
    s.items
      .filter((i) => i.product_id === product?.id && i.size === selectedSize)
      .reduce((a, b) => a + b.quantity, 0)
  )
  const maxQty = selectedSize ? sizeQty(selectedSize) : product?.stock ?? 0
  const remaining = Math.max(0, maxQty - cartQty)
  const atLimit = remaining <= 0
  const [adding, setAdding] = useState(false)
  const [justAdded, setJustAdded] = useState(false)
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

  const handleAddToCart = async () => {
    if (!product || atLimit || adding) return
    setAdding(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setAdding(false)
      toast.error(isRtl ? "يرجى تسجيل الدخول لإضافة المنتجات إلى السلة" : "Please login to add items to your cart")
      router.push("/auth")
      return
    }
    const cartId = crypto.randomUUID?.() || Math.random().toString()
    addItem({
      id: cartId,
      product_id: product.id,
      name_en: product.name_en,
      name_ar: product.name_ar,
      price: product.price,
      image: product.images?.[0] || "",
      size: selectedSize,
      color: product.colors?.[0] || "",
      quantity: 1,
      slug: product.slug,
      stock: hasPerSize ? sizeQty(selectedSize) : product.stock,
    })
    setAdding(false)
    setJustAdded(true)
    window.setTimeout(() => setJustAdded(false), 1800)
    toast.custom(
      (toastEl) => (
        <div className="flex items-center gap-3 bg-white rounded-xl shadow-lg border border-zinc-100 px-4 py-3">
          <span className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
            <Check className="w-4 h-4 text-green-600" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-zinc-900">
              {isRtl ? "تمت الإضافة إلى السلة" : "Added to cart"}
            </p>
            <p className="text-xs text-zinc-500 truncate">
              {isRtl ? product.name_ar : product.name_en}
            </p>
          </div>
          <Link
            href="/cart"
            onClick={() => toast.dismiss(toastEl.id)}
            className="shrink-0 text-xs font-semibold text-accent bg-accent/10 hover:bg-accent/20 px-3 py-1.5 rounded-full transition-colors"
          >
            {isRtl ? "عرض السلة" : "View Cart"}
          </Link>
        </div>
      ),
      { duration: 3000 }
    )
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
        <nav className="flex flex-wrap items-center gap-2 text-sm text-zinc-400 mb-6">
          <Link href="/" className="hover:text-accent whitespace-nowrap">{isRtl ? "الرئيسية" : "Home"}</Link>
          <span>/</span>
          <Link href="/products" className="hover:text-accent whitespace-nowrap">{isRtl ? "منتجات" : "Products"}</Link>
          {product.category && (
            <>
              <span>/</span>
              <Link href={`/products?category=${product.category.slug}`} className="hover:text-accent truncate max-w-[140px] sm:max-w-full">
                {isRtl ? product.category.name_ar : product.category.name_en}
              </Link>
            </>
          )}
        </nav>

        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          <div className="min-w-0">
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

          <div className="min-w-0">
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
                {(product.sizes || []).map((size: string) => {
                  const qty = sizeQty(size)
                  return (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      disabled={qty <= 0}
                      className={`px-4 py-2 rounded-xl border text-sm transition-colors ${
                        selectedSize === size
                          ? "border-accent bg-accent/5 text-accent font-medium"
                          : "border-zinc-200 hover:border-accent hover:text-accent"
                      } ${qty <= 0 ? "opacity-40 cursor-not-allowed line-through" : ""}`}
                      title={qty <= 0 ? (isRtl ? "غير متوفر" : "Out of stock") : undefined}
                    >
                      {size}
                      {hasPerSize && (
                        <span className={`block text-[10px] ${qty <= 0 ? "text-red-400" : "text-zinc-400"}`}>
                          {qty > 0 ? (isRtl ? `متبقي ${qty}` : `${qty} left`) : isRtl ? "نفد" : "out"}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="mb-8">
              <p className="text-sm font-medium mb-3">{t("colors")}</p>
              <div className="flex flex-wrap gap-2 items-center">
                {(product.colors || []).map((color: string) => (
                  <span
                    key={color}
                    className="w-8 h-8 rounded-full border-2 border-accent scale-110"
                    style={{ background: colorBackground(color) }}
                    title={colorLabel(color, isRtl ? "ar" : "en")}
                  />
                ))}
                {(siblings || []).length > 0 && (
                  <>
                    <span className="w-px h-6 bg-zinc-200 mx-1" />
                    {(siblings || []).map((sib: any) => {
                      const sibColor = sib.colors?.[0]
                      return (
                        <Link
                          key={sib.id}
                          href={`/product/${sib.id}`}
                          title={isRtl ? sib.name_ar : sib.name_en}
                          className={`w-8 h-8 rounded-full border-2 transition-colors hover:scale-110 overflow-hidden ${
                            sibColor ? "" : "flex items-center justify-center"
                          } border-zinc-300 hover:border-accent relative`}
                        >
                          {sibColor ? (
                            <span className="block w-full h-full" style={{ background: colorBackground(sibColor) }} />
                          ) : sib.images?.[0] ? (
                            <Image src={sib.images[0]} alt="" fill sizes="32px" className="object-cover" />
                          ) : (
                            <span className="text-[9px] text-zinc-400">{isRtl ? "لون" : "Color"}</span>
                          )}
                        </Link>
                      )
                    })}
                  </>
                )}
              </div>
              <p className="text-xs text-zinc-400 mt-2">
                {isRtl
                  ? siblings?.length
                    ? "منتجات أخرى بنفس الاسم: اضغط على اللون للانتقال للمنتج"
                    : null
                  : siblings?.length
                    ? "Other products with the same name: click a color to view"
                    : null}
              </p>
            </div>

            <div className="flex items-center gap-3 mb-6">
              {selectedSize ? (
                sizeQty(selectedSize) > 0 ? (
                  <span className="flex items-center gap-1.5 text-sm text-green-600">
                    <Check className="w-4 h-4" />
                    {t("in_stock")}
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-sm text-red-500">
                    <Package className="w-4 h-4" />
                    {t("out_of_stock")}
                  </span>
                )
              ) : product.stock > 0 ? (
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
                disabled={atLimit || adding}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-full font-medium transition-all duration-300 disabled:opacity-50 ${
                  justAdded
                    ? "bg-green-600 text-white animate-added-pop"
                    : "bg-accent text-white hover:bg-accent-light active:scale-[0.98]"
                }`}
              >
                {adding ? (
                  <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : justAdded ? (
                  <>
                    <Check className="w-5 h-5" />
                    {isRtl ? "تمت الإضافة ✓" : "Added ✓"}
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-5 h-5" />
                    {atLimit
                      ? isRtl ? "الكمية القصوى في السلة" : "Max quantity in cart"
                      : t("add_to_cart")}
                  </>
                )}
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

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-6 pt-6 border-t border-zinc-100 text-sm text-zinc-500">
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

        <Reviews productId={product.id} />

        {related.length > 0 && (
          <section className="mt-16">
            <h2 className="text-2xl font-bold mb-8">{t("related")}</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
              {groupBySku(related).map((cluster) => (
                <ProductCard key={cluster.key} variants={cluster.variants} locale={locale} />
              ))}
            </div>
          </section>
        )}
      </div>
      <Footer locale={params.locale} />
    </>
  )
}
