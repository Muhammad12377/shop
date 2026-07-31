"use client"

import { useState } from "react"
import { Link } from "@/lib/i18n/navigation"
import { SlidersHorizontal, X, RotateCcw } from "lucide-react"

type Props = {
  categories: any[]
  sizes: string[]
  activeCategory?: string
  activeSizes: string[]
  sort?: string
  q?: string
  isRtl: boolean
}

type Overrides = { category?: string; size?: string; sort?: string }

export default function ProductFilters({
  categories,
  sizes,
  activeCategory,
  activeSizes,
  sort,
  q,
  isRtl,
}: Props) {
  const [open, setOpen] = useState(false)
  const sizeParam = activeSizes.join(",")
  const activeCount = (activeCategory ? 1 : 0) + activeSizes.length + (sort && sort !== "newest" ? 1 : 0)

  const buildUrl = (o: Overrides = {}) => {
    const sp = new URLSearchParams()
    if (q) sp.set("q", q)
    const cat = o.category !== undefined ? o.category : activeCategory
    if (cat && cat !== "all") sp.set("category", cat)
    const sz = o.size !== undefined ? o.size : sizeParam
    if (sz) sp.set("size", sz)
    const srt = o.sort !== undefined ? o.sort : sort
    if (srt && srt !== "newest") sp.set("sort", srt)
    const qs = sp.toString()
    return qs ? `/products?${qs}` : "/products"
  }

  const toggleSizeUrl = (s: string) => {
    const next = activeSizes.includes(s) ? activeSizes.filter((x) => x !== s) : [...activeSizes, s]
    return buildUrl({ size: next.join(",") })
  }

  const sectionTitle = "text-xs font-medium text-zinc-400 uppercase mb-2"

  const categoryList = (onNavigate?: () => void) => (
    <div className="space-y-1">
      <Link
        href={buildUrl({ category: "" })}
        onClick={onNavigate}
        className={`block px-3 py-1.5 text-sm rounded-lg transition-colors ${
          !activeCategory ? "bg-accent/10 text-accent font-medium" : "hover:bg-zinc-100 text-zinc-600"
        }`}
      >
        {isRtl ? "الكل" : "All"}
      </Link>
      {(categories || []).map((cat: any) => (
        <Link
          key={cat.id}
          href={buildUrl({ category: cat.slug })}
          onClick={onNavigate}
          className={`block px-3 py-1.5 text-sm rounded-lg transition-colors ${
            activeCategory === cat.slug
              ? "bg-accent/10 text-accent font-medium"
              : "hover:bg-zinc-100 text-zinc-600"
          }`}
        >
          {isRtl ? cat.name_ar : cat.name_en}
        </Link>
      ))}
    </div>
  )

  const sizeList = (onNavigate?: () => void) => (
    <div className="flex flex-wrap gap-2">
      {(sizes || []).map((s) => {
        const active = activeSizes.includes(s)
        return (
          <Link
            key={s}
            href={toggleSizeUrl(s)}
            onClick={onNavigate}
            className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
              active
                ? "bg-accent text-white border-accent font-medium"
                : "border-zinc-200 text-zinc-600 hover:border-accent hover:text-accent"
            }`}
          >
            {s}
          </Link>
        )
      })}
      {(!sizes || sizes.length === 0) && (
        <span className="text-sm text-zinc-400">{isRtl ? "لا توجد مقاسات" : "No sizes available"}</span>
      )}
    </div>
  )

  const sortList = (onNavigate?: () => void) => (
    <div className="space-y-1">
      {[
        { key: "newest", label: isRtl ? "الأحدث" : "Newest" },
        { key: "price-asc", label: isRtl ? "السعر: من الأقل" : "Price: Low to High" },
        { key: "price-desc", label: isRtl ? "السعر: من الأعلى" : "Price: High to Low" },
      ].map((s) => (
        <Link
          key={s.key}
          href={buildUrl({ sort: s.key })}
          onClick={onNavigate}
          className={`block px-3 py-1.5 text-sm rounded-lg transition-colors ${
            (s.key === "newest" && !sort) || sort === s.key
              ? "bg-accent/10 text-accent font-medium"
              : "hover:bg-zinc-100 text-zinc-600"
          }`}
        >
          {s.label}
        </Link>
      ))}
    </div>
  )

  return (
    <>
      <div className="md:hidden mb-4 flex items-center justify-between gap-3">
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-zinc-200 bg-white text-sm font-medium transition active:scale-95"
        >
          <SlidersHorizontal className="w-4 h-4" />
          {isRtl ? "تصفية" : "Filters"}
          {activeCount > 0 && (
            <span className="bg-accent text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-semibold">
              {activeCount}
            </span>
          )}
        </button>
        {activeCount > 0 && (
          <Link
            href={buildUrl({ category: "", size: "", sort: "" })}
            className="flex items-center gap-1 text-xs font-medium text-accent"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {isRtl ? "إزالة الكل" : "Reset"}
          </Link>
        )}
      </div>

      <aside className="hidden md:block md:w-56 shrink-0">
        <div className="flex items-center gap-2 mb-4">
          <SlidersHorizontal className="w-4 h-4" />
          <span className="font-medium text-sm">{isRtl ? "تصفية" : "Filters"}</span>
        </div>
        <div className="space-y-6">
          <div>
            <h4 className={sectionTitle}>{isRtl ? "التصنيف" : "Category"}</h4>
            {categoryList()}
          </div>
          <div>
            <h4 className={sectionTitle}>{isRtl ? "المقاس" : "Size"}</h4>
            {sizeList()}
          </div>
          <div>
            <h4 className={sectionTitle}>{isRtl ? "الترتيب" : "Sort"}</h4>
            {sortList()}
          </div>
        </div>
      </aside>

      <div className={`fixed inset-0 z-50 md:hidden ${open ? "" : "pointer-events-none"}`}>
        <div
          className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${open ? "opacity-100" : "opacity-0"}`}
          onClick={() => setOpen(false)}
        />
        <div
          className={`absolute bottom-0 inset-x-0 bg-white rounded-t-3xl shadow-xl max-h-[85vh] overflow-y-auto p-5 pb-10 transition-transform duration-300 ${
            open ? "translate-y-0" : "translate-y-full"
          }`}
        >
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-lg">{isRtl ? "تصفية المنتجات" : "Filter products"}</h3>
            <button
              onClick={() => setOpen(false)}
              className="p-2 rounded-full hover:bg-zinc-100 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="space-y-6">
            <div>
              <h4 className={sectionTitle}>{isRtl ? "التصنيف" : "Category"}</h4>
              {categoryList(() => setOpen(false))}
            </div>
            <div>
              <h4 className={sectionTitle}>{isRtl ? "المقاس" : "Size"}</h4>
              {sizeList(() => setOpen(false))}
            </div>
            <div>
              <h4 className={sectionTitle}>{isRtl ? "الترتيب" : "Sort"}</h4>
              {sortList(() => setOpen(false))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
