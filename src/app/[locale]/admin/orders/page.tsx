"use client"

import { useEffect, useState, useCallback } from "react"
import { Search, ChevronDown, ChevronUp, Loader2 } from "lucide-react"
import { colorLabel } from "@/lib/colors"
import toast from "react-hot-toast"
import type { Order } from "@/types"

const statuses = ["all", "pending", "confirmed", "shipped", "delivered", "cancelled", "fake"]

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  shipped: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  fake: "bg-orange-100 text-orange-800",
}

const statusLabels: Record<string, { en: string; ar: string }> = {
  all: { en: "All Statuses", ar: "جميع الحالات" },
  pending: { en: "Pending", ar: "معلق" },
  confirmed: { en: "Confirmed", ar: "مؤكد" },
  shipped: { en: "Shipped", ar: "تم الشحن" },
  delivered: { en: "Delivered", ar: "تم التوصيل" },
  cancelled: { en: "Cancelled", ar: "ملغي" },
  fake: { en: "Fake", ar: "كاذب" },
}

export default function AdminOrdersPage({ params: paramsPromise }: { params: Promise<{ locale: string }> }) {
  const [locale, setLocale] = useState("en")
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [newStatus, setNewStatus] = useState("")
  const [note, setNote] = useState("")

  useEffect(() => { paramsPromise.then((p) => setLocale(p.locale)) }, [paramsPromise])
  const isRtl = locale === "ar"

  const fetchOrders = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (statusFilter !== "all") params.set("status", statusFilter)
      if (dateFrom) params.set("from", dateFrom)
      if (dateTo) params.set("to", dateTo)
      if (search) params.set("search", search)
      const res = await fetch(`/api/admin/orders?${params}`)
      const data = await res.json()
      if (Array.isArray(data)) setOrders(data)
    } catch {
      toast.error(isRtl ? "خطأ في تحميل الطلبات" : "Failed to load orders")
    } finally {
      setLoading(false)
    }
  }, [statusFilter, search, dateFrom, dateTo, isRtl])

  useEffect(() => {
    setLoading(true)
    const timer = setTimeout(fetchOrders, 300)
    return () => clearTimeout(timer)
  }, [fetchOrders])

  const updateStatus = async (orderId: string) => {
    if (!newStatus) return
    setUpdatingId(orderId)
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, note }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      toast.success(isRtl ? "تم تحديث الحالة" : "Status updated")
      setExpandedId(null)
      setNewStatus("")
      setNote("")
      fetchOrders()
    } catch (err: any) {
      toast.error(err.message || (isRtl ? "خطأ" : "Error"))
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{isRtl ? "الطلبات" : "Orders"}</h1>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isRtl ? "بحث بمعرف الطلب أو اسم العميل..." : "Search by order ID or customer..."}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 bg-white border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316]"
        >
          {statuses.map((s) => (
            <option key={s} value={s}>
              {isRtl ? statusLabels[s].ar : statusLabels[s].en}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            title={isRtl ? "من تاريخ" : "From date"}
            className="px-3 py-2.5 bg-white border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316]"
          />
          <span className="text-zinc-400 text-sm">{isRtl ? "إلى" : "to"}</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            title={isRtl ? "إلى تاريخ" : "To date"}
            className="px-3 py-2.5 bg-white border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316]"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-[#f97316] border-t-transparent rounded-full" />
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-xl border border-zinc-200 p-12 text-center text-zinc-400">
          {isRtl ? "لا توجد طلبات" : "No orders found"}
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-xl border border-zinc-200">
              <button
                onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                className="w-full flex items-center justify-between p-4 gap-3 text-left cursor-pointer hover:bg-zinc-50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-medium">#{order.id.slice(0, 8)}</span>
                    <span className="text-sm text-zinc-600 truncate">{order.full_name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[order.status] || "bg-zinc-100"}`}>
                      {isRtl ? statusLabels[order.status]?.ar || order.status : statusLabels[order.status]?.en || order.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap mt-1">
                    {order.user_email && (
                      <span className="text-xs text-zinc-400 truncate max-w-full">{order.user_email}</span>
                    )}
                    <span className="text-xs text-zinc-400">{(order.items?.length || 0)} {isRtl ? "منتج" : "items"}</span>
                    <span className="text-sm font-medium">${order.total?.toFixed(2)}</span>
                    {order.status === "cancelled" && order.cancelled_by && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-600">
                        {order.cancelled_by === "customer"
                          ? isRtl ? "ألغى الزبون" : "Cancelled by customer"
                          : isRtl ? "ألغاه الإدمن" : "Cancelled by admin"}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 md:hidden">
                    <span className="text-xs text-zinc-400" title={order.created_at}>
                      {new Date(order.created_at).toLocaleString(isRtl ? "ar" : "en-US")}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="hidden md:inline text-xs text-zinc-400" title={order.created_at}>
                    {new Date(order.created_at).toLocaleString(isRtl ? "ar" : "en-US")}
                  </span>
                  {expandedId === order.id ? <ChevronUp className="w-4 h-4 text-zinc-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0" />}
                </div>
              </button>

              {expandedId === order.id && (
                <div className="border-t border-zinc-100 p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <h4 className="text-xs font-medium text-zinc-500 uppercase mb-1">{isRtl ? "معلومات العميل" : "Customer Info"}</h4>
                      <p className="text-sm">{order.full_name}</p>
                      <p className="text-sm text-zinc-500">{order.user_email || order.user_id}</p>
                      <p className="text-sm text-zinc-500">{order.phone}</p>
                    </div>
                    <div>
                      <h4 className="text-xs font-medium text-zinc-500 uppercase mb-1">{isRtl ? "عنوان الشحن" : "Shipping Address"}</h4>
                      <p className="text-sm">{order.address}</p>
                      <p className="text-sm text-zinc-500">{order.city}</p>
                      <p className="text-sm text-zinc-500">
                        {[order.shipping_country, order.shipping_zone].filter(Boolean).join(" - ")}
                      </p>
                    </div>
                  </div>

                  {order.items && order.items.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-xs font-medium text-zinc-500 uppercase mb-2">{isRtl ? "المنتجات" : "Items"}</h4>
                      <div className="space-y-2">
                        {order.items.map((item: any) => (
                          <div key={item.id} className="flex items-center justify-between text-sm py-1">
                            <span>
                              {item.product_name} {item.size && `- ${item.size}`} {item.color && `- ${colorLabel(item.color)}`}
                              <span className="text-zinc-400"> x{item.quantity}</span>
                            </span>
                            <span>${(item.price * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="border-t border-zinc-100 mt-2 pt-2 flex justify-between text-sm font-medium">
                        <span>{isRtl ? "الإجمالي" : "Total"}</span>
                        <span>${order.total?.toFixed(2)}</span>
                      </div>
                    </div>
                  )}

                  {order.status === "cancelled" && (
                    <div className="mb-4 bg-red-50 rounded-lg p-4 text-sm">
                      <p className="font-medium text-red-700">
                        {order.cancelled_by === "customer"
                          ? isRtl ? "أُلغي بواسطة الزبون" : "Cancelled by customer"
                          : isRtl ? "أُلغي بواسطة الإدمن" : "Cancelled by admin"}
                      </p>
                      {order.cancel_reason ? (
                        <p className="text-red-600 mt-1">
                          {isRtl ? "سبب الإلغاء" : "Cancellation reason"}: {order.cancel_reason}
                        </p>
                      ) : (
                        <p className="text-red-400 mt-1">
                          {isRtl ? "لم يُذكر سبب للإلغاء" : "No cancellation reason provided"}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="bg-zinc-50 rounded-lg p-4">
                    <h4 className="text-xs font-medium text-zinc-500 uppercase mb-3">
                      {isRtl ? "تحديث الحالة" : "Update Status"}
                    </h4>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <select
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value)}
                        className="px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316]"
                      >
                        <option value="">{isRtl ? "اختر حالة" : "Select status"}</option>
                        {statuses.filter((s) => s !== "all").map((s) => (
                          <option key={s} value={s}>
                            {isRtl ? statusLabels[s].ar : statusLabels[s].en}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder={isRtl ? "ملاحظة (اختياري)" : "Note (optional)"}
                        className="flex-1 px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316]"
                      />
                      <button
                        onClick={() => updateStatus(order.id)}
                        disabled={!newStatus || updatingId === order.id}
                        className="px-4 py-2 bg-[#f97316] text-white rounded-lg text-sm font-medium hover:bg-[#fb923c] disabled:opacity-50 transition-colors inline-flex items-center gap-2 cursor-pointer"
                      >
                        {updatingId === order.id && <Loader2 className="w-4 h-4 animate-spin" />}
                        {isRtl ? "تحديث" : "Update"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
