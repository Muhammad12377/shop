"use client"

import { useTranslations, useLocale } from "next-intl"
import { Link } from "@/lib/i18n/navigation"
import { Globe, Mail, MapPin } from "lucide-react"

export default function Footer({ locale }: { locale: string }) {
  const t = useTranslations("nav")
  const ht = useTranslations("home")
  const ctxLocale = useLocale()
  const isRtl = (locale || ctxLocale) === "ar"

  return (
    <footer className="bg-primary text-zinc-400 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-white text-lg font-bold mb-4">
              <span className="text-accent">SNEAKERS</span> TAKE OFF
            </h3>
            <p className="text-sm leading-relaxed">
              {isRtl
                ? "متجرك الموثوق لأحدث وأفضل الأحذية الرياضية. نوفر لك الجودة والأناقة بأفضل الأسعار."
                : "Your trusted store for the latest and greatest sneakers. Quality and style at the best prices."}
            </p>
          </div>

          <div>
            <h4 className="text-white font-medium mb-4">{t("products")}</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/products?category=men" className="hover:text-accent transition-colors">{ht("men")}</Link></li>
              <li><Link href="/products?category=women" className="hover:text-accent transition-colors">{ht("women")}</Link></li>
              <li><Link href="/products?category=kids" className="hover:text-accent transition-colors">{ht("kids")}</Link></li>
              <li><Link href="/products?category=sports" className="hover:text-accent transition-colors">{ht("sports")}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-medium mb-4">{t("home")}</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/cart" className="hover:text-accent transition-colors">{t("cart")}</Link></li>
              <li><Link href="/orders" className="hover:text-accent transition-colors">{t("orders")}</Link></li>
              <li><Link href="/help" className="hover:text-accent transition-colors">{t("help")}</Link></li>
              <li><Link href="/auth" className="hover:text-accent transition-colors">{t("login")}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-medium mb-4">Contact</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                <a href="https://www.instagram.com/sneakerstakeoff_syria" target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors">
                  @sneakerstakeoff_syria
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                <span>info@sneakerstakeoff.com</span>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>Syria</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-zinc-800 mt-8 pt-8 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} Sneakers Take Off. {isRtl ? "جميع الحقوق محفوظة." : "All rights reserved."}</p>
        </div>
      </div>
    </footer>
  )
}
