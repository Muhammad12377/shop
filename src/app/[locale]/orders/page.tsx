import { getTranslations } from "next-intl/server"
import Header from "@/components/layout/Header"
import Footer from "@/components/layout/Footer"
import { createServerSupabase } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Package } from "lucide-react"

type Props = {
  params: Promise<{ locale: string }>
}

export default async function OrdersPage({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "orders" })
  const isRtl = locale === "ar"

  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth")

  const { data: orders } = await supabase
    .from("orders")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    confirmed: "bg-blue-100 text-blue-800",
    shipped: "bg-purple-100 text-purple-800",
    delivered: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  }

  return (
    <>
      <Header />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-8">{t("title")}</h1>

        {(!orders || orders.length === 0) ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-zinc-100 mb-6">
              <Package className="w-8 h-8 text-zinc-400" />
            </div>
            <h2 className="text-xl font-bold mb-2">{t("empty")}</h2>
            <p className="text-zinc-500">{isRtl ? "ابدأ بالتسوق الآن" : "Start shopping now"}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order: any) => (
              <div key={order.id} className="bg-white rounded-2xl border border-zinc-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-zinc-500">{t("order_id")}: #{order.id.slice(0, 8)}</p>
                    <p className="text-sm text-zinc-500">
                      {t("date")}: {new Date(order.created_at).toLocaleDateString(isRtl ? "ar" : "en-US")}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[order.status] || "bg-zinc-100 text-zinc-800"}`}>
                    {t(order.status)}
                  </span>
                </div>
                <div className="border-t border-zinc-100 pt-4 flex items-center justify-between">
                  <p className="text-sm text-zinc-500">
                    {order.items?.length || 0} {isRtl ? "منتج" : "items"}
                  </p>
                  <p className="text-lg font-bold text-accent">${order.total?.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <Footer locale={locale} />
    </>
  )
}
