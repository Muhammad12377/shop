"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "@/lib/i18n/navigation"
import { createClient } from "@/lib/supabase/client"
import toast from "react-hot-toast"
import Header from "@/components/layout/Header"
import { Mail, Lock, User, Eye, EyeOff } from "lucide-react"

type AuthMode = "login" | "register"

export default function AuthPage() {
  const t = useTranslations("auth")
  const router = useRouter()
  const [mode, setMode] = useState<AuthMode>("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

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

  const isRtl = document.dir === "rtl"

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
