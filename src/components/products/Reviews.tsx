"use client"

import { useCallback, useEffect, useState } from "react"
import { useTranslations, useLocale } from "next-intl"
import { Link } from "@/lib/i18n/navigation"
import toast from "react-hot-toast"
import { fetchCached } from "@/lib/fetch-cache"
import { Star } from "lucide-react"

export default function Reviews({ productId }: { productId: string }) {
  const t = useTranslations("product")
  const locale = useLocale()
  const isRtl = locale === "ar"
  const [reviews, setReviews] = useState<any[]>([])
  const [auth, setAuth] = useState<{
    loggedIn: boolean
    canReview: boolean
    alreadyReviewed: boolean
  } | null>(null)
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadReviews = useCallback(async () => {
    try {
      const json = await fetchCached<{ success: boolean; data?: any[] }>(`/api/reviews?product_id=${productId}`, 60_000)
      if (json.success) setReviews(json.data || [])
    } catch {}
    setLoading(false)
  }, [productId])

  const loadAuth = useCallback(async () => {
    try {
      const res = await fetch(`/api/reviews/eligible?product_id=${productId}`)
      const json = await res.json()
      if (json.success) {
        setAuth({
          loggedIn: json.loggedIn,
          canReview: json.canReview,
          alreadyReviewed: json.alreadyReviewed,
        })
      }
    } catch {}
  }, [productId])

  useEffect(() => {
    loadReviews()
    loadAuth()
  }, [loadReviews, loadAuth])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (rating === 0) {
      toast.error(isRtl ? "اختر تقييمًا من 1 إلى 5" : "Select a rating from 1 to 5")
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: productId, rating, comment }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || "Error")
      toast.success(isRtl ? "تم إرسال تقييمك" : "Review submitted")
      setRating(0)
      setComment("")
      await loadReviews()
      await loadAuth()
    } catch (err: any) {
      const m = err?.message || ""
      toast.error(isRtl && /delivered/i.test(m) ? "يمكنك التقييم فقط بعد استلام (توصيل) المنتج" : m)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="mt-16">
      <h2 className="text-2xl font-bold mb-8">{t("reviews")}</h2>

      {loading ? (
        <p className="text-zinc-400 text-sm">{isRtl ? "جارٍ التحميل..." : "Loading..."}</p>
      ) : reviews.length === 0 ? (
        <p className="text-zinc-400">{t("no_reviews")}</p>
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => (
            <div key={r.id} className="border border-zinc-100 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">{r.user?.full_name || "مستخدم"}</span>
                <span className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${i < r.rating ? "fill-accent text-accent" : "text-zinc-200"}`}
                    />
                  ))}
                </span>
              </div>
              {r.comment && <p className="text-sm text-zinc-600 mt-2">{r.comment}</p>}
              <p className="text-xs text-zinc-400 mt-2">
                {new Date(r.created_at).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}

      {auth && !auth.loggedIn && (
        <div className="mt-8 border border-zinc-100 rounded-2xl p-5 text-center text-sm text-zinc-500">
          <Link href="/auth" className="text-accent font-medium hover:underline">
            {isRtl ? "سجّل الدخول لتقييم المنتج" : "Log in to review this product"}
          </Link>
        </div>
      )}

      {auth?.loggedIn && auth.alreadyReviewed && (
        <div className="mt-8 border border-zinc-100 rounded-2xl p-5 text-sm text-zinc-500 text-center">
          {isRtl ? "قمت بتقييم هذا المنتج مسبقًا" : "You have already reviewed this product"}
        </div>
      )}

      {auth?.loggedIn && !auth.alreadyReviewed && !auth.canReview && (
        <div className="mt-8 border border-zinc-100 rounded-2xl p-5 text-sm text-zinc-500 text-center">
          {isRtl
            ? "يمكنك التقييم فقط بعد استلام (توصيل) المنتج"
            : "You can only review products that have been delivered to you"}
        </div>
      )}

      {auth?.loggedIn && auth.canReview && (
        <form onSubmit={submit} className="mt-8 border border-zinc-100 rounded-2xl p-5 space-y-4">
          <div>
            <p className="text-sm font-medium mb-2">{t("your_rating")}</p>
            <div className="flex gap-1">
              {Array.from({ length: 5 }).map((_, i) => {
                const n = i + 1
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n)}
                    onMouseEnter={() => setHover(n)}
                    onMouseLeave={() => setHover(0)}
                    className="p-1"
                  >
                    <Star
                      className={`w-6 h-6 transition-colors ${
                        n <= (hover || rating) ? "fill-accent text-accent" : "text-zinc-200"
                      }`}
                    />
                  </button>
                )
              })}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium block mb-2">{t("your_review")}</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="w-full p-3 rounded-xl border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-accent text-sm"
              placeholder={isRtl ? "شارك تجربتك مع هذا المنتج..." : "Share your experience with this product..."}
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 rounded-xl bg-accent text-white font-medium hover:bg-accent-light transition-colors disabled:opacity-50"
          >
            {submitting ? (isRtl ? "جارٍ الإرسال..." : "Submitting...") : t("submit_review")}
          </button>
        </form>
      )}
    </section>
  )
}
