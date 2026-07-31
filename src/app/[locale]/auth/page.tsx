"use client"

import { useState } from "react"
import { useTranslations, useLocale } from "next-intl"
import { useRouter } from "@/lib/i18n/navigation"
import { createClient } from "@/lib/supabase/client"
import toast from "react-hot-toast"
import Header from "@/components/layout/Header"
import { Mail, Lock, User, Eye, EyeOff, Loader2 } from "lucide-react"

type AuthMode = "login" | "register"

const GoogleIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
    <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A11 11 0 0 0 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52Z" />
  </svg>
)

export default function AuthPage() {
  const t = useTranslations("auth")
  const router = useRouter()
  const [mode, setMode] = useState<AuthMode>("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const handleGoogle = async () => {
    setGoogleLoading(true)
    const supabase = createClient()
    try {
      const locale = window.location.pathname.split("/")[1] === "ar" ? "ar" : "en"
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback?next=/${locale}/account`,
        },
      })
      if (error) throw error
    } catch (err: any) {
      if (err.message?.toLowerCase().includes("not enabled")) {
        toast.error(locale === "ar" ? "تسجيل الدخول بغوغل غير مفعل بعد" : "Google sign-in is not enabled yet")
      } else {
        toast.error(err.message)
      }
      setGoogleLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()

    try {
      if (mode === "register") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } },
        })
        if (error) throw error
        toast.success("Account created! Check your email to verify.")
        router.push("/auth")
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        toast.success("Welcome back!")
        router.push("/")
        router.refresh()
      }
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const locale = useLocale()
  const isRtl = locale === "ar"

  return (
    <>
      <Header />
      <div className="flex-1 flex items-center justify-center py-16 px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-8">
            <h1 className="text-2xl font-bold text-center mb-2">
              {mode === "login" ? t("login_title") : t("register_title")}
            </h1>
            <p className="text-zinc-500 text-sm text-center mb-8">
              {mode === "login" ? "Sneakers Club Syria" : "Sneakers Club Syria"}
            </p>

            <button
              type="button"
              onClick={handleGoogle}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-2.5 py-2.5 rounded-xl border border-zinc-200 bg-white text-zinc-700 font-medium hover:bg-zinc-50 transition-colors disabled:opacity-50"
            >
              {googleLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <GoogleIcon />}
              {t("continue_with_google")}
            </button>

            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-zinc-200" />
              <span className="text-xs text-zinc-400">{isRtl ? "أو" : "or"}</span>
              <div className="flex-1 h-px bg-zinc-200" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <div>
                  <label className="block text-sm font-medium mb-1.5">{t("name")}</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-accent text-sm"
                      required
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1.5">{t("email")}</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-accent text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">{t("password")}</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-accent text-sm"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-accent text-white font-medium hover:bg-accent-light transition-colors disabled:opacity-50"
              >
                {loading ? t("common.loading")?.replace("...", "") || "Loading..." : mode === "login" ? t("login_btn") : t("register_btn")}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-zinc-500">
              {mode === "login" ? (
                <>
                  {t("no_account")}{" "}
                  <button onClick={() => setMode("register")} className="text-accent font-medium hover:underline">
                    {t("register_btn")}
                  </button>
                </>
              ) : (
                <>
                  {t("have_account")}{" "}
                  <button onClick={() => setMode("login")} className="text-accent font-medium hover:underline">
                    {t("login_btn")}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
