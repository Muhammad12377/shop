"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { splitColors } from "@/lib/colors"

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
  const images = list.map((v: any) => v?.images?.[0]).filter(Boolean)
  const hasMore = list.length > 1

  return (
    <div className="group bg-white rounded-2xl overflow-hidden border border-zinc-100 hover:border-accent/40 hover:shadow-xl hover:shadow-accent/10 hover:-translate-y-1.5 transition-all duration-300 will-change-transform">
      <Link
        href={`/product/${active?.id}`}
        locale={locale}
        className="relative block aspect-square bg-gradient-to-br from-zinc-200 to-zinc-300 overflow-hidden"
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
            {hasMore && images[(activeIdx + 1) % images.length] && (
              <Image
                src={images[(activeIdx + 1) % images.length]}
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
        {hasMore && (
          <div className="flex items-center gap-1.5 mb-2.5">
            {list.map((v: any, i: number) => {
              const hexes = splitColors(v?.colors?.[0])
              return (
                <button
                  key={v?.id || i}
                  type="button"
                  onClick={() => setActiveIdx(i)}
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
        <p className="text-xs text-zinc-400 mb-1 truncate">
          {active?.category ? (isRtl ? active.category.name_ar : active.category.name_en) : ""}
        </p>
        <Link href={`/product/${active?.id}`} locale={locale} className="block">
          <h3 className="font-medium text-sm sm:text-lg group-hover:text-accent transition-colors truncate">
            {name}
          </h3>
        </Link>
        <div className="flex items-center gap-2 mt-1.5">
          <p className="text-accent font-bold text-base sm:text-xl">${active?.price}</p>
          {active?.compare_price && (
            <p className="text-xs text-zinc-400 line-through">${active?.compare_price}</p>
          )}
        </div>
      </div>
    </div>
  )
}
