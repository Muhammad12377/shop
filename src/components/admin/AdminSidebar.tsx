"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
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
  LogOut,
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

export default function AdminSidebar({
  locale,
  mobileOpen,
  onClose,
}: {
  locale: string
  mobileOpen: boolean
  onClose: () => void
}) {
  const pathname = usePathname()
  const router = useRouter()
  const isRtl = locale === "ar"

  const basePath = `/${locale}/admin`
  const isActive = (href: string) => {
    if (href === "") return pathname === basePath
    return pathname.startsWith(basePath + href)
  }

  const hiddenClass = mobileOpen
    ? "translate-x-0"
    : isRtl
      ? "translate-x-full"
      : "-translate-x-full"

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    onClose()
    router.push(`/${locale}`)
  }

  return (
    <aside
      className={`fixed inset-y-0 start-0 z-50 w-64 bg-zinc-900 text-white flex flex-col transition-transform duration-200 ${hiddenClass} lg:translate-x-0 lg:z-30`}
    >
      <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
        <div>
          <Link href={`/${locale}`} className="text-lg font-bold tracking-wider">
            SNEAKERS <span className="text-[#f97316]">CLUB</span>
          </Link>
          <p className="text-xs text-zinc-500 mt-0.5">Admin Panel</p>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 py-4 space-y-1 px-3 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={`${basePath}${item.href}`}
              onClick={onClose}
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

      <div className="p-3 border-t border-zinc-800 space-y-1">
        <Link
          href={`/${locale}`}
          onClick={onClose}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <ArrowLeftFromLine className="w-5 h-5 shrink-0" />
          <span>{isRtl ? "العودة للمتجر" : "Back to Store"}</span>
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-400 hover:text-red-300 hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          <span>{isRtl ? "تسجيل الخروج" : "Logout"}</span>
        </button>
      </div>
    </aside>
  )
}
