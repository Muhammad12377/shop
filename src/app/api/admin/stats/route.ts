import { NextResponse } from "next/server"
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth"
import { fetchVerifiedAuthUsers } from "@/lib/admin-users"

export async function GET() {
  try {
    const { supabase } = await requireAdmin()
    const { count: totalOrders } = await supabase.from("orders").select("*", { count: "exact", head: true })
    const { count: totalProducts } = await supabase.from("products").select("*", { count: "exact", head: true })

    let totalUsers = 0
    try {
      const { verified } = await fetchVerifiedAuthUsers()
      const { data: profiles } = await supabase.from("profiles").select("email")
      const profileEmails = new Set((profiles || []).map((p) => (p.email || "").toLowerCase()))
      totalUsers = verified.filter((v) => profileEmails.has(v.email)).length
    } catch {
      totalUsers = 0
    }

    const { count: totalCategories } = await supabase.from("categories").select("*", { count: "exact", head: true })
    const { count: totalCoupons } = await supabase.from("coupons").select("*", { count: "exact", head: true })

    const { data: allOrders } = await supabase.from("orders").select("total, status, created_at")
    const deliveredOrders = allOrders?.filter((o) => o.status === "delivered") || []
    const totalRevenue = deliveredOrders.reduce((sum, o) => sum + (o.total || 0), 0) || 0
    const pendingOrders = allOrders?.filter((o) => o.status === "pending").length || 0

    const stockResult = await supabase.from("products").select("stock")
    const lowStock = stockResult.data?.filter((p) => p.stock !== null && p.stock <= 5).length || 0

    const { data: recentOrders } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5)

    const revenueByMonth: { month: string; revenue: number }[] = []
    const ordersByStatus: { status: string; count: number }[] = []

    if (allOrders) {
      const monthMap: Record<string, number> = {}
      const statusMap: Record<string, number> = {}
      allOrders.forEach((o) => {
        if (o.status === "delivered") {
          const m = o.created_at?.slice(0, 7)
          if (m) monthMap[m] = (monthMap[m] || 0) + (o.total || 0)
        }
        const s = o.status || "unknown"
        statusMap[s] = (statusMap[s] || 0) + 1
      })
      Object.entries(monthMap).forEach(([month, revenue]) => revenueByMonth.push({ month, revenue }))
      Object.entries(statusMap).forEach(([status, count]) => ordersByStatus.push({ status, count }))
    }

    return NextResponse.json({
      total_orders: totalOrders || 0,
      total_revenue: totalRevenue,
      total_products: totalProducts || 0,
      total_users: totalUsers,
      total_categories: totalCategories || 0,
      total_coupons: totalCoupons || 0,
      pending_orders: pendingOrders,
      low_stock_products: lowStock,
      recent_orders: recentOrders || [],
      revenue_by_month: revenueByMonth,
      orders_by_status: ordersByStatus,
    })
  } catch (e) {
    if (e instanceof AdminAuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
