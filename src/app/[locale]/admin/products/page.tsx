import { getTranslations } from "next-intl/server"
import { createServerSupabase } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Plus, Pencil, Trash2 } from "lucide-react"

type Props = { params: Promise<{ locale: string }> }

export default async function AdminProductsPage({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "admin" })
  const isRtl = locale === "ar"

  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth")

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "admin") redirect("/")

  const { data: products } = await supabase.from("products").select("*").order("created_at", { ascending: false })

  return (
    <div className="min-h-screen bg-zinc-50">
      <AdminHeader locale={locale} />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">{t("products")}</h1>
          <Link
            href="/admin/products/new"
            className="inline-flex items-center gap-2 bg-accent text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-accent-light transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t("add_product")}
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-zinc-500">{t("name")}</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500">{t("price")}</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500">{t("stock")}</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500">{t("status")}</th>
                <th className="text-right px-4 py-3 font-medium text-zinc-500">{t("actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {(!products || products.length === 0) ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-zinc-400">
                    {isRtl ? "لا توجد منتجات" : "No products"}
                  </td>
                </tr>
              ) : (
                products.map((product: any) => (
                  <tr key={product.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3 font-medium">
                      {isRtl ? product.name_ar : product.name_en}
                    </td>
                    <td className="px-4 py-3">${product.price}</td>
                    <td className="px-4 py-3">{product.stock}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${product.active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {product.active ? (isRtl ? "نشط" : "Active") : (isRtl ? "غير نشط" : "Inactive")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/products/${product.id}/edit`}
                          className="p-1.5 rounded-lg hover:bg-zinc-100 transition-colors"
                        >
                          <Pencil className="w-4 h-4 text-zinc-400" />
                        </Link>
                        <button className="p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function AdminHeader({ locale }: { locale: string }) {
  return (
    <header className="bg-primary text-white">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/admin" className="font-bold">
          SNEAKERS <span className="text-accent">CLUB</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/admin" className="hover:text-accent transition-colors">
            {locale === "ar" ? "لوحة التحكم" : "Dashboard"}
          </Link>
          <Link href="/admin/products" className="text-accent font-medium">
            {locale === "ar" ? "المنتجات" : "Products"}
          </Link>
          <Link href="/admin/orders" className="hover:text-accent transition-colors">
            {locale === "ar" ? "الطلبات" : "Orders"}
          </Link>
          <Link href={`/${locale}`} className="text-zinc-400 hover:text-white transition-colors">
            {locale === "ar" ? "المتجر" : "Store"}
          </Link>
        </nav>
      </div>
    </header>
  )
}
