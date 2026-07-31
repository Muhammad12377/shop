import { notFound } from "next/navigation"
import { getCachedProduct, getCachedSiblingProducts } from "@/lib/home-data"
import ProductView from "./ProductView"

export const revalidate = 60

type Props = {
  params: Promise<{ locale: string; id: string }>
}

export async function generateMetadata({ params }: Props) {
  const { locale, id } = await params
  const product = await getCachedProduct(id)
  if (!product) return { title: "Sneakers Club Syria" }
  return {
    title: `${locale === "ar" ? product.name_ar || product.name_en : product.name_en || product.name_ar} - Sneakers Club Syria`,
    description: locale === "ar" ? product.description_ar || undefined : product.description_en || undefined,
  }
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params
  const product = await getCachedProduct(id)

  if (!product) {
    notFound()
  }

  const siblings = await getCachedSiblingProducts(id, product.name_en, product.name_ar)

  return <ProductView product={product} siblings={siblings} />
}
