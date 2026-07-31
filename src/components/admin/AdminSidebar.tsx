"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Tags,
  TicketPercent,
  Settings,
  Image,
  Truck,
  ArrowLeftFromLine,
  Menu,
  X,
} from "lucide-react"

const navItems = [
  { href: "", labelEn: "Dashboard", labelAr: "لوحة التحكم", icon: LayoutDashboard },
  { href: "/products", labelEn: "Products", labelAr: "المنتجات", icon: Package },
  { href: "/orders", labelEn: "Orders", labelAr: "الطلبات", icon: ShoppingCart },
  { href: "/users", labelEn: "Users", labelAr: "المستخدمين", icon: Users },
  { href: "/categories", labelEn: "Categories", labelAr: "التصنيفات", icon: Tags },
  { href: "/shipping", labelEn: "Shipping Fees", labelAr: "رسوم الشحن", icon: Truck },
  { href: "/coupons", labelEn: "Coupons", labelAr: "كوبونات الخصم", icon: TicketPercent },
  { href: "/settings", labelEn: "Settings", labelAr: "الإعدادات", icon: Settings },
  { href: "/media", labelEn: "Media Library", labelAr: "مكتبة الصور", icon: Image },
]

export default function AdminSidebar({ locale }: { locale: string }) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const isRtl = locale === "ar"

  const basePath = `/${locale}/admin`
  const isActive = (href: string) => {
    if (href === "") return pathname === basePath
    return pathname.startsWith(basePath + href)
  }

  return (
    <>
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-3 left-3 z-50 lg:hidden bg-zinc-900 text-white p-2 rounded-lg"
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-zinc-900 text-white flex flex-col transition-transform duration-200 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        <div className="p-5 border-b border-zinc-800">
          <Link href={`/${locale}`} className="text-lg font-bold tracking-wider">
            SNEAKERS <span className="text-[#f97316]">CLUB</span>
          </Link>
          <p className="text-xs text-zinc-500 mt-0.5">Admin Panel</p>
        </div>

        <nav className="flex-1 py-4 space-y-1 px-3 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={`${basePath}${item.href}`}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  active
                    ? "bg-[#f97316]/10 text-[#f97316] font-medium"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span>{isRtl ? item.labelAr : item.labelEn}</span>
              </Link>
            )
          })}
        </nav>

        <div className="p-3 border-t border-zinc-800">
          <Link
            href={`/${locale}`}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeftFromLine className="w-5 h-5 shrink-0" />
            <span>{isRtl ? "العودة للمتجر" : "Back to Store"}</span>
          </Link>
        </div>
      </aside>
    </>
  )
}
