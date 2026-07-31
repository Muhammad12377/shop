"use client"

import { useState } from "react"
import { useTranslations, useLocale } from "next-intl"
import { ShoppingCart, Menu, X, Search, User, Package, Heart, ChevronDown, LogOut, LayoutDashboard } from "lucide-react"
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
              href="/"
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
          <div className="md:hidden pb-4 border-t border-zinc-100 pt-4">
            <form onSubmit={handleSearch} className="relative mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("search")}
                className="w-full pl-8 pr-3 py-2 text-sm rounded-full bg-zinc-100 border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            </form>

            <nav className="flex flex-col gap-2">
              <Link href="/" className="py-2 text-sm font-medium" onClick={() => setMenuOpen(false)}>
                {t("home")}
              </Link>
              <Link href="/products" className="py-2 text-sm font-medium" onClick={() => setMenuOpen(false)}>
                {t("products")}
              </Link>
              <Link href="/cart" className="py-2 text-sm font-medium" onClick={() => setMenuOpen(false)}>
                {t("cart")} ({cartCount})
              </Link>
              {user && (
                <>
                  <Link href="/account" className="py-2 text-sm font-medium" onClick={() => setMenuOpen(false)}>
                    {t("account")}
                  </Link>
                  <Link href="/account/orders" className="py-2 text-sm font-medium" onClick={() => setMenuOpen(false)}>
                    {t("orders")}
                  </Link>
                  <Link href="/account/wishlist" className="py-2 text-sm font-medium" onClick={() => setMenuOpen(false)}>
                    {t("wishlist")}
                  </Link>
                  {profile?.role === "admin" && (
                    <Link href="/admin" className="py-2 text-sm font-medium" onClick={() => setMenuOpen(false)}>
                      {t("admin")}
                    </Link>
                  )}
                </>
              )}
              <hr className="border-zinc-100 my-2" />
              <Link href="/" locale={locale === "en" ? "ar" : "en"} className="py-2 text-sm font-medium text-left" onClick={() => setMenuOpen(false)}>
                {t("language")}: {locale === "en" ? "العربية" : "English"}
              </Link>
              {user ? (
                <button onClick={handleLogout} className="py-2 text-sm font-medium text-left text-red-500">
                  {t("logout")}
                </button>
              ) : (
                <Link href="/auth" className="py-2 text-sm font-medium text-accent" onClick={() => setMenuOpen(false)}>
                  {t("login")}
                </Link>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}
