"use client"

import { useEffect, useState } from "react"
import {
  ShoppingBag,
  DollarSign,
  Package,
  Users,
  Clock,
  AlertTriangle,
} from "lucide-react"
import type { AdminStats, Order } from "@/types"

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  shipped: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
}

const statusColorsChart: string[] = [
  "bg-yellow-500",
  "bg-blue-500",
  "bg-purple-500",
  "bg-green-500",
  "bg-red-500",
]

export default function AdminDashboardPage({ params: paramsPromise }: { params: Promise<{ locale: string }> }) {
  const [locale, setLocale] = useState("en")
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    paramsPromise.then((p) => setLocale(p.locale))
  }, [paramsPromise])

  const isRtl = locale === "ar"

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error)
        else setStats(data)
      })
      .catch(() => setError("Failed to load stats"))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-[#f97316] border-t-transparent rounded-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-red-500">{isRtl ? "حدث خطأ في تحميل البيانات" : "Failed to load data"}</p>
        <button onClick={() => window.location.reload()} className="mt-4 text-[#f97316] hover:underline text-sm">
          {isRtl ? "إعادة المحاولة" : "Retry"}
        </button>
      </div>
    )
  }

  const statCards = [
    { label: isRtl ? "إجمالي الطلبات" : "Total Orders", value: stats?.total_orders ?? 0, icon: ShoppingBag, color: "bg-blue-500" },
    { label: isRtl ? "إجمالي الإيرادات" : "Total Revenue", value: `$${(stats?.total_revenue ?? 0).toFixed(2)}`, icon: DollarSign, color: "bg-green-500" },
    { label: isRtl ? "المنتجات" : "Products", value: stats?.total_products ?? 0, icon: Package, color: "bg-[#f97316]" },
    { label: isRtl ? "المستخدمين" : "Users", value: stats?.total_users ?? 0, icon: Users, color: "bg-purple-500" },
    { label: isRtl ? "طلبات معلقة" : "Pending Orders", value: stats?.pending_orders ?? 0, icon: Clock, color: "bg-yellow-500" },
    { label: isRtl ? "مخزون منخفض" : "Low Stock", value: stats?.low_stock_products ?? 0, icon: AlertTriangle, color: "bg-red-500" },
  ]

  const maxRevenue = Math.max(...(stats?.revenue_by_month?.map((r) => r.revenue) || [0]), 1)
  const totalStatusCount = stats?.orders_by_status?.reduce((s, o) => s + o.count, 0) || 1

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{isRtl ? "لوحة التحكم" : "Dashboard"}</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <div key={card.label} className="bg-white rounded-xl border border-zinc-200 p-4 hover:shadow-sm transition-shadow">
              <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg ${card.color} text-white mb-3`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-xl font-bold">{card.value}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{card.label}</p>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-zinc-200 p-6">
          <h2 className="font-semibold mb-4">{isRtl ? "الإيرادات الشهرية" : "Revenue by Month"}</h2>
          {(!stats?.revenue_by_month || stats.revenue_by_month.length === 0) ? (
            <p className="text-zinc-400 text-sm text-center py-8">{isRtl ? "لا توجد بيانات" : "No data"}</p>
          ) : (
            <div className="flex items-end gap-2 h-40">
              {stats.revenue_by_month.map((r) => (
                <div key={r.month} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-[#f97316] rounded-t-md transition-all"
                    style={{ height: `${(r.revenue / maxRevenue) * 100}%`, minHeight: "4px" }}
                  />
                  <span className="text-[10px] text-zinc-500 -rotate-45 origin-left whitespace-nowrap">
                    {r.month.slice(5)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-zinc-200 p-6">
          <h2 className="font-semibold mb-4">{isRtl ? "الطلبات حسب الحالة" : "Orders by Status"}</h2>
          {(!stats?.orders_by_status || stats.orders_by_status.length === 0) ? (
            <p className="text-zinc-400 text-sm text-center py-8">{isRtl ? "لا توجد بيانات" : "No data"}</p>
          ) : (
            <div className="space-y-3">
              {stats.orders_by_status.map((s, i) => (
                <div key={s.status} className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${statusColorsChart[i] || "bg-zinc-400"}`} />
                  <span className="text-sm capitalize flex-1">
                    {isRtl
                      ? ({ pending: "معلق", confirmed: "مؤكد", shipped: "تم الشحن", delivered: "تم التوصيل", cancelled: "ملغي" } as Record<string, string>)[s.status] || s.status
                      : s.status}
                  </span>
                  <span className="text-sm font-medium">{s.count}</span>
                  <div className="w-24 h-2 bg-zinc-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${statusColorsChart[i] || "bg-zinc-400"}`}
                      style={{ width: `${(s.count / totalStatusCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200 p-6">
        <h2 className="font-semibold mb-4">{isRtl ? "آخر الطلبات" : "Recent Orders"}</h2>
        {(!stats?.recent_orders || stats.recent_orders.length === 0) ? (
          <p className="text-zinc-400 text-sm text-center py-8">{isRtl ? "لا توجد طلبات" : "No orders yet"}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100">
                  <th className="text-left py-3 px-2 font-medium text-zinc-500">ID</th>
                  <th className="text-left py-3 px-2 font-medium text-zinc-500">{isRtl ? "العميل" : "Customer"}</th>
                  <th className="text-left py-3 px-2 font-medium text-zinc-500">{isRtl ? "الإجمالي" : "Total"}</th>
                  <th className="text-left py-3 px-2 font-medium text-zinc-500">{isRtl ? "الحالة" : "Status"}</th>
                  <th className="text-left py-3 px-2 font-medium text-zinc-500">{isRtl ? "التاريخ" : "Date"}</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent_orders.map((order: Order) => (
                  <tr key={order.id} className="border-b border-zinc-50 hover:bg-zinc-50">
                    <td className="py-3 px-2 font-medium">#{order.id.slice(0, 8)}</td>
                    <td className="py-3 px-2 text-zinc-600">{order.full_name}</td>
                    <td className="py-3 px-2">${order.total?.toFixed(2)}</td>
                    <td className="py-3 px-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[order.status] || "bg-zinc-100"}`}>
                        {isRtl
                          ? ({ pending: "معلق", confirmed: "مؤكد", shipped: "تم الشحن", delivered: "تم التوصيل", cancelled: "ملغي" } as Record<string, string>)[order.status] || order.status
                          : order.status}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-zinc-500">
                      {new Date(order.created_at).toLocaleDateString(isRtl ? "ar" : "en-US")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
