import type { MetadataRoute } from "next"

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://shop-two-steel.vercel.app"
  const locales = ["en", "ar"]

  const staticPages = [
    "", "/products", "/cart", "/checkout", "/auth", "/orders", "/order-confirmed",
    "/account", "/account/addresses", "/account/wishlist", "/account/orders",
    "/admin", "/admin/products", "/admin/orders", "/admin/users",
    "/admin/categories", "/admin/coupons", "/admin/settings", "/admin/media",
  ]

  return staticPages.flatMap((page) =>
    locales.map((locale) => ({
      url: `${baseUrl}/${locale}${page}`,
      lastModified: new Date(),
      changeFrequency: page === "" || page === "/products" ? "daily" : "weekly",
      priority: page === "" ? 1.0 : page === "/products" ? 0.9 : 0.5,
    }))
  )
}
