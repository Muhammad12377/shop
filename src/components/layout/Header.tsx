"use client"

import { useState } from "react"
import { useTranslations, useLocale } from "next-intl"
import { ShoppingCart, Menu, X, Search, User, Package, Heart, ChevronDown, LogOut, LayoutDashboard, Home, Globe, HelpCircle } from "lucide-react"
import { Link, usePathname, useRouter } from "@/lib/i18n/navigation"
import { useCartStore } from "@/stores/cart"
import { createClient } from "@/lib/supabase/client"
import { useEffect } from "react"

export default function Header() {
  const t = useTranslations("nav")
  const locale = useLocale()
  const pathname = usePathname()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const cartCount = useCartStore((s) => s.items.reduce((a, b) => a + b.quantity, 0))

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser(data.user)
        supabase
          .from("profiles")
          .select("full_name, avatar_url, role")
          .eq("id", data.user.id)
          .single()
          .then(({ data: prof }) => setProfile(prof))
      }
    })
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/products?q=${encodeURIComponent(searchQuery.trim())}`)
      setSearchQuery("")
    }
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setMenuOpen(false)
    router.push("/")
    router.refresh()
  }

  const isRtl = locale === "ar"

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-zinc-200">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight">
              <span className="text-accent">SNEAKERS</span>
              <span className="text-primary"> CLUB</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-sm font-medium hover:text-accent transition-colors">
              {t("home")}
            </Link>
            <Link href="/products" className="text-sm font-medium hover:text-accent transition-colors">
              {t("products")}
            </Link>
            <Link href="/help" className="text-sm font-medium hover:text-accent transition-colors">
              {t("help")}
            </Link>
            {user && (
              <Link href="/account/orders" className="text-sm font-medium hover:text-accent transition-colors">
                {t("orders")}
              </Link>
            )}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("search")}
                className="w-40 lg:w-56 pl-8 pr-3 py-1.5 text-sm rounded-full bg-zinc-100 border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
            </form>

            <Link
              href={pathname}
              locale={locale === "en" ? "ar" : "en"}
              className="px-2 py-1 text-xs font-medium rounded bg-zinc-100 hover:bg-zinc-200 transition-colors"
            >
              {locale === "en" ? "AR" : "EN"}
            </Link>

            {user && (
              <Link href="/account/wishlist" className="relative p-2 hover:bg-zinc-100 rounded-full transition-colors">
                <Heart className="w-5 h-5" />
              </Link>
            )}

            <Link href="/cart" className="relative p-2 hover:bg-zinc-100 rounded-full transition-colors">
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-accent text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-medium">
                  {cartCount}
                </span>
              )}
            </Link>

            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-full hover:bg-zinc-100 transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center">
                    <User className="w-4 h-4 text-accent" />
                  </div>
                  <span className="text-sm font-medium max-w-[100px] truncate">
                    {profile?.full_name || user.email?.split("@")[0] || ""}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                </button>
                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                    <div className={`absolute ${isRtl ? "left-0" : "right-0"} top-full mt-2 w-56 bg-white rounded-2xl border border-zinc-100 shadow-lg py-2 z-20`}>
                      <Link
                        href="/account"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-zinc-50 transition-colors"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <User className="w-4 h-4 text-zinc-400" />
                        {t("account")}
                      </Link>
                      <Link
                        href="/account/orders"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-zinc-50 transition-colors"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <Package className="w-4 h-4 text-zinc-400" />
                        {t("orders")}
                      </Link>
                      <Link
                        href="/account/wishlist"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-zinc-50 transition-colors"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <Heart className="w-4 h-4 text-zinc-400" />
                        {t("wishlist")}
                      </Link>
                      {profile?.role === "admin" && (
                        <Link
                          href="/admin"
                          className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-zinc-50 transition-colors"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <LayoutDashboard className="w-4 h-4 text-zinc-400" />
                          {t("admin")}
                        </Link>
                      )}
                      <hr className="border-zinc-100 my-2" />
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors w-full text-left"
                      >
                        <LogOut className="w-4 h-4" />
                        {t("logout")}
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Link
                href="/auth"
                className="p-2 hover:bg-zinc-100 rounded-full transition-colors"
              >
                <User className="w-5 h-5" />
              </Link>
            )}
          </div>

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 hover:bg-zinc-100 rounded-full transition-colors"
          >
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {menuOpen && (
          <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setMenuOpen(false)} />
        )}
        <div
          className={`fixed inset-y-0 start-0 z-40 w-[85%] max-w-xs bg-white shadow-2xl md:hidden flex flex-col transition-transform duration-300 ${
            menuOpen ? "translate-x-0" : isRtl ? "translate-x-full" : "-translate-x-full"
          } ${menuOpen ? "" : "pointer-events-none"}`}
        >
          <div className="flex items-center justify-between p-4 border-b border-zinc-100">
            <Link href="/" onClick={() => setMenuOpen(false)} className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight">
                <span className="text-accent">SNEAKERS</span>
                <span className="text-primary"> CLUB</span>
              </span>
            </Link>
            <button
              onClick={() => setMenuOpen(false)}
              className="p-2 -me-1 rounded-full hover:bg-zinc-100 transition-colors"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 border-b border-zinc-100">
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("search")}
                className="w-full pl-9 pr-3 py-2.5 text-sm rounded-full bg-zinc-100 border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            </form>
          </div>

          <nav className="flex-1 overflow-y-auto py-2">
            <Link
              href="/"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-zinc-50 transition-colors"
            >
              <Home className="w-4 h-4 text-zinc-400 shrink-0" />
              {t("home")}
            </Link>
            <Link
              href="/products"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-zinc-50 transition-colors"
            >
              <Package className="w-4 h-4 text-zinc-400 shrink-0" />
              {t("products")}
            </Link>
            <Link
              href="/cart"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-zinc-50 transition-colors"
            >
              <ShoppingCart className="w-4 h-4 text-zinc-400 shrink-0" />
              {t("cart")}
              {cartCount > 0 && (
                <span className="bg-accent text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-medium">
                  {cartCount}
                </span>
              )}
            </Link>
            <Link
              href="/help"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-zinc-50 transition-colors"
            >
              <HelpCircle className="w-4 h-4 text-zinc-400 shrink-0" />
              {t("help")}
            </Link>
            {user && (
              <>
                <Link
                  href="/account"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-zinc-50 transition-colors"
                >
                  <User className="w-4 h-4 text-zinc-400 shrink-0" />
                  {t("account")}
                </Link>
                <Link
                  href="/account/orders"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-zinc-50 transition-colors"
                >
                  <Package className="w-4 h-4 text-zinc-400 shrink-0" />
                  {t("orders")}
                </Link>
                <Link
                  href="/account/wishlist"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-zinc-50 transition-colors"
                >
                  <Heart className="w-4 h-4 text-zinc-400 shrink-0" />
                  {t("wishlist")}
                </Link>
                {profile?.role === "admin" && (
                  <Link
                    href="/admin"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-zinc-50 transition-colors"
                  >
                    <LayoutDashboard className="w-4 h-4 text-zinc-400 shrink-0" />
                    {t("admin")}
                  </Link>
                )}
              </>
            )}
          </nav>

          <div className="border-t border-zinc-100 p-4 space-y-2">
            <Link
              href={pathname}
              locale={locale === "en" ? "ar" : "en"}
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium hover:bg-zinc-50 rounded-xl transition-colors"
            >
              <Globe className="w-4 h-4 text-zinc-400 shrink-0" />
              {t("language")}: {locale === "en" ? "العربية" : "English"}
            </Link>
            {user ? (
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 rounded-xl transition-colors"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                {t("logout")}
              </button>
            ) : (
              <Link
                href="/auth"
                onClick={() => setMenuOpen(false)}
                className="flex items-center justify-center gap-2 bg-accent text-white py-3 rounded-full text-sm font-medium hover:bg-accent-light transition-colors"
              >
                {t("login")}
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
