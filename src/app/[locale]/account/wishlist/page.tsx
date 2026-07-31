"use client"

import { useState, useEffect } from "react"
import { useTranslations, useLocale } from "next-intl"
import Image from "next/image"
import { createClient } from "@/lib/supabase/client"
import { Link } from "@/lib/i18n/navigation"
import { useCartStore } from "@/stores/cart"
import toast from "react-hot-toast"
import { Heart, ShoppingCart, Trash2, ArrowLeft } from "lucide-react"

export default function WishlistPage() {
  const t = useTranslations("account")
  const pt = useTranslations("product")
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [removing, setRemoving] = useState<string | null>(null)
  const addItem = useCartStore((s) => s.addItem)
  const locale = useLocale()
  const isRtl = locale === "ar"

  const fetchWishlist = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const { data } = await supabase
      .from("wishlist")
      .select("*, products(*)")
      .eq("user_id", user.id)
    setItems(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchWishlist() }, [])

  const handleRemove = async (productId: string) => {
    setRemoving(productId)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase
      .from("wishlist")
      .delete()
      .eq("user_id", user.id)
      .eq("product_id", productId)
    if (error) { toast.error(error.message); setRemoving(null); return }
    toast.success(t("wishlist_removed"))
    setItems((prev) => prev.filter((i) => i.product_id !== productId))
    setRemoving(null)
  }

  const handleAddToCart = async (item: any) => {
    const product = item.products
    if (!product) return
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.error(isRtl ? "يرجى تسجيل الدخول لإضافة المنتجات إلى السلة" : "Please login to add items to your cart")
      return
    }
    addItem({
      id: crypto.randomUUID?.() || Math.random().toString(),
      product_id: product.id,
      name_en: product.name_en,
      name_ar: product.name_ar,
      price: product.price,
      image: product.images?.[0] || "",
      size: product.sizes?.[0] || "",
      color: product.colors?.[0] || "",
      quantity: 1,
      slug: product.slug,
    })
    toast.success(pt("add_to_cart"))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" />
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-zinc-100 mb-6">
          <Heart className="w-8 h-8 text-zinc-400" />
        </div>
        <h2 className="text-xl font-bold mb-2">{t("no_wishlist")}</h2>
        <p className="text-sm text-zinc-500 mb-6">{t("wishlist_empty_desc")}</p>
        <Link
          href="/products"
          className="inline-flex items-center gap-2 bg-accent text-white px-6 py-2.5 rounded-full font-medium text-sm hover:bg-accent-light transition-colors"
        >
          <ArrowLeft className={`w-4 h-4 ${isRtl ? "rotate-180" : ""}`} />
          {isRtl ? "تسوق الآن" : "Shop Now"}
        </Link>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-6">{t("wishlist")}</h2>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {items.map((item) => {
          const product = item.products
          if (!product) return null
          return (
            <div key={item.id} className="bg-white rounded-2xl border border-zinc-100 overflow-hidden group">
              <Link href={`/product/${product.id}`} className="block aspect-square bg-gradient-to-br from-zinc-200 to-zinc-300 flex items-center justify-center relative">
                {product.images?.[0] ? (
                  <Image src={product.images[0]} alt={isRtl ? product.name_ar || "" : product.name_en || ""} fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 33vw" className="object-cover" />
                ) : (
                  <span className="text-zinc-400 text-sm">{isRtl ? "صورة" : "Image"}</span>
                )}
              </Link>
              <div className="p-4">
                <Link href={`/product/${product.id}`}>
                  <h3 className="font-medium text-sm group-hover:text-accent transition-colors truncate">
                    {isRtl ? product.name_ar : product.name_en}
                  </h3>
                </Link>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-accent font-bold">${product.price}</p>
                  {product.compare_price && (
                    <p className="text-xs text-zinc-400 line-through">${product.compare_price}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={() => handleAddToCart(item)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-full bg-accent text-white text-xs font-medium hover:bg-accent-light transition-colors"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    {t("add_to_cart")}
                  </button>
                  <button
                    onClick={() => handleRemove(item.product_id)}
                    disabled={removing === item.product_id}
                    className="p-2 rounded-full bg-red-50 text-red-400 hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
