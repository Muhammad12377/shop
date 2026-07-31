"use client"

import { useTranslations } from "next-intl"
import { Link, usePathname } from "@/lib/i18n/navigation"
import { User, MapPin, Heart, Package } from "lucide-react"

const links = [
  { key: "profile", href: "/account", icon: User },
  { key: "addresses", href: "/account/addresses", icon: MapPin },
  { key: "orders", href: "/account/orders", icon: Package },
  { key: "wishlist", href: "/account/wishlist", icon: Heart },
]

export default function AccountNav() {
  const t = useTranslations("account")
  const pathname = usePathname()

  return (
    <nav className="flex md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0">
      {links.map((link) => {
        const active = pathname === link.href
        return (
          <Link
            key={link.key}
            href={link.href}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap md:whitespace-normal transition-colors ${
              active ? "bg-accent/10 text-accent" : "hover:bg-accent/10 hover:text-accent"
            }`}
          >
            <link.icon className="w-4 h-4 shrink-0" />
            {t(link.key)}
          </Link>
        )
      })}
    </nav>
  )
}
