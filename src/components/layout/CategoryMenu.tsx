"use client"

import { useState, useEffect } from "react"
import { useLocale } from "next-intl"
import Image from "next/image"
import { Menu, X, ChevronLeft, ChevronRight, Layers } from "lucide-react"
import { Link, useRouter } from "@/lib/i18n/navigation"
import type { ProductCategory } from "@/types"

const colorMap: Record<string, string> = {
  shoes: "from-blue-900 to-blue-700",
  sweaters: "from-pink-900 to-pink-700",
  pants: "from-green-900 to-green-700",
  "t-shirts": "from-sky-900 to-sky-700",
  jackets: "from-zinc-900 to-zinc-700",
  shorts: "from-amber-900 to-amber-700",
  accessories: "from-violet-900 to-violet-700",
}

export default function CategoryMenu() {
  const locale = useLocale()
  const router = useRouter()
  const isRtl = locale === "ar"
  const [open, setOpen] = useState(false)
  const [categories, setCategories] = useState<ProductCategory[]>([])

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setCategories(data)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : ""
    return () => {
      document.body.style.overflow = ""
    }
  }, [open])

  const sections = categories
    .filter((c) => !c.parent_id)
    .sort((a, b) => a.sort_order - b.sort_order)

  const navigate = (slug: string) => {
    setOpen(false)
    router.push(`/category/${slug}`)
  }

  const Chevron = isRtl ? ChevronLeft : ChevronRight

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-2 rounded-full bg-zinc-100 hover:bg-zinc-200 transition-colors text-sm font-medium"
        aria-label={isRtl ? "الأقسام" : "Categories"}
      >
        <Menu className="w-4 h-4" />
        <span className="hidden lg:inline">{isRtl ? "الأقسام" : "Categories"}</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[60]">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div
            className={`absolute inset-y-0 ${isRtl ? "end-0" : "start-0"} w-full max-w-md bg-white shadow-2xl flex flex-col transition-all`}
          >
            <div className="flex items-center justify-between p-5 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-accent" />
                <h2 className="text-lg font-bold">{isRtl ? "الأقسام" : "Categories"}</h2>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-2 rounded-full hover:bg-zinc-100 transition-colors"
                aria-label={isRtl ? "إغلاق" : "Close"}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {sections.length === 0 ? (
                <div className="text-center py-16 text-zinc-400">
                  <Layers className="w-10 h-10 mx-auto mb-3 text-zinc-300" />
                  <p>{isRtl ? "لا توجد أقسام بعد" : "No categories yet"}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sections.map((cat) => {
                    const name = isRtl ? cat.name_ar || cat.name_en : cat.name_en || cat.name_ar
                    const hasChildren = categories.some((c) => c.parent_id === cat.id)
                    return (
                      <button
                        key={cat.id}
                        onClick={() => navigate(cat.slug)}
                        className="w-full flex items-center gap-3 p-3 rounded-2xl border border-zinc-200 hover:border-accent hover:shadow-md transition-all group text-left"
                      >
                        <div className={`relative w-14 h-14 rounded-xl overflow-hidden shrink-0 ${
                          cat.image_url ? "bg-zinc-200" : `bg-gradient-to-br ${colorMap[cat.slug] || "from-zinc-800 to-zinc-600"}`
                        }`}>
                          {cat.image_url ? (
                            <Image src={cat.image_url} alt={name} fill sizes="56px" className="object-cover" />
                          ) : null}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-zinc-900 truncate">{name}</p>
                          {hasChildren && (
                            <p className="text-xs text-zinc-400">
                              {isRtl ? "تصفح الأصناف" : "Browse subcategories"}
                            </p>
                          )}
                        </div>
                        <Chevron className={`w-4 h-4 text-zinc-300 group-hover:text-accent transition-colors ${isRtl ? "rotate-180" : ""}`} />
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="border-t border-zinc-100 p-4">
              <Link
                href="/products"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-full bg-accent text-white text-sm font-medium hover:bg-accent-light transition-colors"
              >
                {isRtl ? "تصفح كل المنتجات" : "Browse all products"}
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
