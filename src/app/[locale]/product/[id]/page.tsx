"use client"

import { useState, useEffect } from "react"
import { useTranslations, useLocale } from "next-intl"
import { useParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Link } from "@/lib/i18n/navigation"
import { useCartStore } from "@/stores/cart"
import toast from "react-hot-toast"
import Header from "@/components/layout/Header"
import Footer from "@/components/layout/Footer"
import { ShoppingCart, Heart, Star, Check, ChevronLeft, ChevronRight, Package, Truck, Shield } from "lucide-react"

export default function ProductPage() {
  const t = useTranslations("product")
  const params = useParams<{ locale: string; id: string }>()
  const [product, setProduct] = useState<any>(null)
  const [related, setRelated] = useState<any[]>([])
  const [reviews, setReviews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSize, setSelectedSize] = useState("")
  const [selectedColor, setSelectedColor] = useState("")
  const [selectedImage, setSelectedImage] = useState(0)
  const [inWishlist, setInWishlist] = useState(false)
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: "" })
  const [submittingReview, setSubmittingReview] = useState(false)
  const addItem = useCartStore((s) => s.addItem)
  const locale = useLocale()
  const isRtl = locale === "ar"

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from("products")
      .select("*, category:categories(*)")
      .eq("id", params.id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) { setLoading(false); return }
        setProduct(data)
        setSelectedSize(data.sizes?.[0] || "")
        setSelectedColor(data.colors?.[0] || "")

        supabase
          .from("products")
          .select("*, category:categories(*)")
          .eq("category_id", data.category_id)
          .eq("active", true)
          .neq("id", data.id)
          .limit(4)
          .then(({ data: rel }) => setRelated(rel || []))

        supabase
          .from("reviews")
          .select("*, user:profiles(full_name, avatar_url)")
          .eq("product_id", data.id)
          .order("created_at", { ascending: false })
          .then(({ data: rev }) => setReviews(rev || []))

        supabase.auth.getUser().then(({ data: { user } }) => {
          if (user) {
            supabase
              .from("wishlist")
              .select("id")
              .eq("user_id", user.id)
              .eq("product_id", data.id)
              .maybeSingle()
              .then(({ data: wl }) => setInWishlist(!!wl))
          }
        })

        setLoading(false)
      })
  }, [params.id])

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
    })
    toast.success(t("add_to_cart"))
  }

  const handleReview = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmittingReview(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error("Please login"); setSubmittingReview(false); return }
    const { error } = await supabase.from("reviews").insert({
      user_id: user.id,
      product_id: params.id,
      rating: reviewForm.rating,
      comment: reviewForm.comment,
    })
    if (error) { toast.error(error.message); setSubmittingReview(false); return }
    toast.success(t("submit_review"))
    setReviewForm({ rating: 5, comment: "" })
    const { data: rev } = await supabase
      .from("reviews")
      .select("*, user:profiles(full_name, avatar_url)")
      .eq("product_id", params.id)
      .order("created_at", { ascending: false })
    if (rev) setReviews(rev)
    setSubmittingReview(false)
  }

  if (loading) {
    return (
      <>
        <Header />
        <div className="flex items-center justify-center py-40">
          <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" />
        </div>
      </>
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

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0

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
            <div className="aspect-square rounded-2xl bg-zinc-100 overflow-hidden mb-3">
              {product.images?.[selectedImage] ? (
                <img src={product.images[selectedImage]} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-16 h-16 text-zinc-300" />
                </div>
              )}
            </div>
            {product.images?.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {product.images.map((img: string, i: number) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={`w-16 h-16 rounded-xl shrink-0 overflow-hidden border-2 transition-colors ${
                      i === selectedImage ? "border-accent" : "border-transparent"
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
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

            {reviews.length > 0 && (
              <div className="flex items-center gap-2 mb-6">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${star <= Math.round(avgRating) ? "text-yellow-400 fill-yellow-400" : "text-zinc-200"}`}
                    />
                  ))}
                </div>
                <span className="text-sm text-zinc-500">
                  {avgRating.toFixed(1)} ({reviews.length} {isRtl ? "تقييم" : "reviews"})
                </span>
              </div>
            )}

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
                    style={{ backgroundColor: color }}
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

        <section className="mt-16">
          <h2 className="text-2xl font-bold mb-8">{t("reviews")}</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-4">
              {reviews.length === 0 ? (
                <p className="text-zinc-400 text-sm">{t("no_reviews")}</p>
              ) : (
                reviews.map((review: any) => (
                  <div key={review.id} className="bg-white rounded-2xl border border-zinc-100 p-5">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-medium">
                        {review.user?.full_name?.[0] || "U"}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{review.user?.full_name || "User"}</p>
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-3 h-3 ${star <= review.rating ? "text-yellow-400 fill-yellow-400" : "text-zinc-200"}`}
                            />
                          ))}
                        </div>
                      </div>
                      <span className="text-xs text-zinc-400 ml-auto">
                        {new Date(review.created_at).toLocaleDateString(isRtl ? "ar" : "en-US")}
                      </span>
                    </div>
                    {review.comment && <p className="text-sm text-zinc-600">{review.comment}</p>}
                  </div>
                ))
              )}
            </div>

            <div>
              <div className="bg-white rounded-2xl border border-zinc-100 p-5 sticky top-24">
                <h3 className="font-medium mb-4">{t("write_review")}</h3>
                <form onSubmit={handleReview} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">{t("your_rating")}</label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setReviewForm((f) => ({ ...f, rating: star }))}
                        >
                          <Star
                            className={`w-6 h-6 cursor-pointer transition-colors ${
                              star <= reviewForm.rating
                                ? "text-yellow-400 fill-yellow-400"
                                : "text-zinc-200 hover:text-yellow-300"
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t("your_review")}</label>
                    <textarea
                      value={reviewForm.comment}
                      onChange={(e) => setReviewForm((f) => ({ ...f, comment: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-accent text-sm min-h-[80px]"
                      rows={3}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="w-full py-2.5 rounded-full bg-accent text-white font-medium hover:bg-accent-light transition-colors disabled:opacity-50 text-sm"
                  >
                    {submittingReview ? "..." : t("submit_review")}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>

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
                  <div className="aspect-square bg-gradient-to-br from-zinc-200 to-zinc-300 flex items-center justify-center">
                    {rel.images?.[0] ? (
                      <img src={rel.images[0]} alt="" className="w-full h-full object-cover" />
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
