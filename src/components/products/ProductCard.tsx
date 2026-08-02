"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { splitColors, colorLabel } from "@/lib/colors"

export default function ProductCard({
  variants,
  locale,
  priority = false,
}: {
  variants: any[]
  locale: string
  priority?: boolean
}) {
  const isRtl = locale === "ar"
  const list = (variants && variants.length ? variants : []).filter(Boolean)
  const [activeIdx, setActiveIdx] = useState(0)
  const active = list[Math.min(activeIdx, list.length - 1)] || list[0]
  const name = isRtl ? active?.name_ar : active?.name_en
  const discount =
    active?.compare_price && active?.price
      ? Math.round((1 - active.price / active.compare_price) * 100)
      : 0
  const hasMore = list.length > 1

  const hasPerSize = !!(active?.size_stock && Object.keys(active.size_stock).length > 0)
  const sizeQty = (s: string) => (hasPerSize ? Number(active?.size_stock?.[s] ?? 0) : active?.stock ?? 0)
  const sizes: string[] = (active?.sizes || []).filter(Boolean)

  return (
    <div className="group bg-white rounded-2xl overflow-hidden border border-zinc-100 hover:border-accent/40 hover:shadow-xl hover:shadow-accent/10 hover:-translate-y-1.5 transition-all duration-300 will-change-transform">
      <Link
        href={`/product/${active?.id}`}
        locale={locale}
        className="relative block aspect-[4/5] bg-gradient-to-br from-zinc-200 to-zinc-300 overflow-hidden"
      >
        {active?.images?.[0] ? (
          <>
            <Image
              src={active.images[0]}
              alt={name || ""}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1280px) 50vw, 33vw"
              className="object-cover transition-all duration-500 ease-out group-hover:scale-110"
              priority={priority}
            />
            {active?.images?.[1] && (
              <Image
                src={active.images[1]}
                alt=""
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1280px) 50vw, 33vw"
                className="object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              />
            )}
          </>
        ) : (
          <span className="text-zinc-400 text-sm">{isRtl ? "صورة المنتج" : "Product Image"}</span>
        )}
        {discount > 0 && (
          <span className="absolute top-3 start-3 bg-accent text-white text-xs px-2 py-1 rounded-full font-medium group-hover:scale-110 transition-transform">
            {discount}% OFF
          </span>
        )}
      </Link>

      <div className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2 mb-2">
          <p className="text-xs text-zinc-400 truncate">
            {active?.category ? (isRtl ? active.category.name_ar : active.category.name_en) : ""}
          </p>
          <p className="text-accent font-bold text-base sm:text-lg">${active?.price}</p>
        </div>
        <Link href={`/product/${active?.id}`} locale={locale} className="block">
          <h3 className="font-medium text-sm sm:text-lg group-hover:text-accent transition-colors truncate">
            {name}
          </h3>
        </Link>
        <div className="flex items-center gap-2 mt-1 mb-2.5">
          {active?.compare_price && (
            <p className="text-xs text-zinc-400 line-through">${active?.compare_price}</p>
          )}
        </div>

        {sizes.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 mb-2">
            <span className="text-[11px] text-zinc-400 me-0.5">
              {isRtl ? "المقاسات:" : "Sizes:"}
            </span>
            {sizes.map((s) => {
              const qty = sizeQty(s)
              return (
                <span
                  key={s}
                  className={`px-2 py-0.5 rounded-md text-[11px] border ${
                    qty <= 0
                      ? "text-zinc-300 border-zinc-100 line-through"
                      : "text-zinc-600 border-zinc-200"
                  }`}
                >
                  {s}
                </span>
              )
            })}
          </div>
        )}

        {hasMore && (
          <div className="flex items-center gap-1.5">
            {list.map((v: any, i: number) => {
              const hexes = splitColors(v?.colors?.[0])
              return (
                <button
                  key={v?.id || i}
                  type="button"
                  onClick={() => setActiveIdx(i)}
                  title={colorLabel(v?.colors?.[0], isRtl ? "ar" : "en") || undefined}
                  aria-label={`color ${i + 1}`}
                  className={`w-4 h-4 rounded-full border border-zinc-300 transition-transform hover:scale-125 ${
                    i === activeIdx ? "ring-2 ring-accent ring-offset-1 scale-110" : ""
                  }`}
                  style={{
                    background:
                      hexes.length > 1
                        ? `linear-gradient(90deg, ${hexes.join(",")})`
                        : hexes[0] || "#ffffff",
                  }}
                />
              )
            })}
            <span className="text-[11px] text-zinc-400 ms-1">
              {list.length} {isRtl ? "ألوان" : "colors"}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
