import { getTranslations } from "next-intl/server"
import { createServerSupabase } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ShoppingBag, DollarSign, Package, Users, ArrowRight } from "lucide-react"

type Props = {
  params: Promise<{ locale: string }>
}

export default async function AdminDashboard({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "admin" })
  const isRtl = locale === "ar"

  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "admin") redirect("/")

  const { count: totalOrders } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true })

  const { count: totalProducts } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true })

  const { count: totalUsers } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })

  const { data: recentOrders } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5)

  const stats = [
    { label: t("total_orders"), value: totalOrders || 0, icon: ShoppingBag, color: "bg-blue-500" },
    { label: t("total_revenue"), value: `$${0}`, icon: DollarSign, color: "bg-green-500" },
    { label: t("total_products"), value: totalProducts || 0, icon: Package, color: "bg-accent" },
    { label: t("total_users"), value: totalUsers || 0, icon: Users, color: "bg-purple-500" },
  ]

  return (
    <div className="min-h-screen bg-zinc-50">
      <AdminHeader locale={locale} />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-8">{t("dashboard")}</h1>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl border border-zinc-100 p-5">
              <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${stat.color} text-white mb-3`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-sm text-zinc-500">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-zinc-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">{t("recent_orders")}</h2>
            <Link href="/admin/orders" className="text-sm text-accent hover:underline flex items-center gap-1">
              {isRtl ? "عرض الكل" : "View All"}
              <ArrowRight className={`w-3 h-3 ${isRtl ? "rotate-180" : ""}`} />
            </Link>
          </div>
          {(!recentOrders || recentOrders.length === 0) ? (
            <p className="text-zinc-400 text-sm py-8 text-center">
              {isRtl ? "لا توجد طلبات بعد" : "No orders yet"}
            </p>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order: any) => (
                <div key={order.id} className="flex items-center justify-between py-2 border-b border-zinc-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium">#{order.id.slice(0, 8)}</p>
                    <p className="text-xs text-zinc-400">{order.full_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">${order.total?.toFixed(2)}</p>
                    <p className="text-xs text-zinc-400 capitalize">{order.status}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function AdminHeader({ locale }: { locale: string }) {
  const t = { dashboard: locale === "ar" ? "لوحة التحكم" : "Dashboard" }
  return (
    <header className="bg-primary text-white">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/admin" className="font-bold">
          SNEAKERS <span className="text-accent">CLUB</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/admin" className="hover:text-accent transition-colors">{t.dashboard}</Link>
          <Link href="/admin/products" className="hover:text-accent transition-colors">{locale === "ar" ? "المنتجات" : "Products"}</Link>
          <Link href="/admin/orders" className="hover:text-accent transition-colors">{locale === "ar" ? "الطلبات" : "Orders"}</Link>
          <Link href={`/${locale}`} className="text-zinc-400 hover:text-white transition-colors">
            {locale === "ar" ? "المتجر" : "Store"}
          </Link>
        </nav>
      </div>
    </header>
  )
}
