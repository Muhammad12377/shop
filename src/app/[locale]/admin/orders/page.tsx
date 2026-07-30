import { getTranslations } from "next-intl/server"
import { createServerSupabase } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"

type Props = { params: Promise<{ locale: string }> }

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  shipped: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
}

export default async function AdminOrdersPage({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "admin" })
  const ot = await getTranslations({ locale, namespace: "orders" })
  const isRtl = locale === "ar"

  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth")

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "admin") redirect("/")

  const { data: orders } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })

  return (
    <div className="min-h-screen bg-zinc-50">
      <AdminHeader locale={locale} />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-8">{t("orders")}</h1>

        <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-zinc-500">ID</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500">{isRtl ? "العميل" : "Customer"}</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500">{t("total")}</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500">{t("status")}</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500">{isRtl ? "التاريخ" : "Date"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {(!orders || orders.length === 0) ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-zinc-400">
                    {isRtl ? "لا توجد طلبات" : "No orders"}
                  </td>
                </tr>
              ) : (
                orders.map((order: any) => (
                  <tr key={order.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3 font-medium">#{order.id.slice(0, 8)}</td>
                    <td className="px-4 py-3">{order.full_name}</td>
                    <td className="px-4 py-3">${order.total?.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[order.status] || "bg-zinc-100"}`}>
                        {ot(order.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-500">
                      {new Date(order.created_at).toLocaleDateString(isRtl ? "ar" : "en-US")}
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
          <Link href="/admin/products" className="hover:text-accent transition-colors">
            {locale === "ar" ? "المنتجات" : "Products"}
          </Link>
          <Link href="/admin/orders" className="text-accent font-medium">
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
