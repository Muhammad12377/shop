"use client"

import { useState, useEffect } from "react"
import { useTranslations, useLocale } from "next-intl"
import { useRouter } from "@/lib/i18n/navigation"
import { createClient } from "@/lib/supabase/client"
import toast from "react-hot-toast"
import Header from "@/components/layout/Header"
import Turnstile from "@/components/auth/Turnstile"
import { Mail, Lock, User, Eye, EyeOff, Loader2, ShieldCheck, ArrowRight } from "lucide-react"

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

type AuthMode = "login" | "register" | "otp" | "forgot" | "newpassword"
type OtpOrigin = "register" | "forgot"

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
  const locale = useLocale()
  const isRtl = locale === "ar"
  const [mode, setMode] = useState<AuthMode>("login")
  const [otpOrigin, setOtpOrigin] = useState<OtpOrigin>("register")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [blockedNotice, setBlockedNotice] = useState(false)
  const [otpEmail, setOtpEmail] = useState("")
  const [otpCode, setOtpCode] = useState("")
  const [otpTimer, setOtpTimer] = useState(0)
  const [verifying, setVerifying] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [captchaResetKey, setCaptchaResetKey] = useState(0)
  const [otpSentAt, setOtpSentAt] = useState<string | null>(null)

  useEffect(() => {
    setCaptchaToken(null)
  }, [mode])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const m = params.get("mode")
    if (m === "register" || m === "forgot") setMode(m)
    if (params.has("blocked")) setBlockedNotice(true)
  }, [])

  useEffect(() => {
    if (otpTimer <= 0) return
    const timer = setInterval(() => setOtpTimer((s) => s - 1), 1000)
    return () => clearInterval(timer)
  }, [otpTimer])

  const cooldownSeconds = (err: any): number => {
    const m = (err?.message || "").match(/after (\d+) seconds?/i)
    return m ? Math.max(1, parseInt(m[1], 10)) : 60
  }

  const isCooldownError = (err: any) => /only request this after (\d+) seconds?/i.test(err?.message || "")

  const friendlyError = (err: any) => {
    const m = err?.message || ""
    const code = err?.code || ""
    const match = m.match(/only request this after (\d+) seconds?/i)
    if (match) {
      return isRtl
        ? `أعد المحاولة بعد ${match[1]} ثانية`
        : `Try again in ${match[1]} seconds`
    }
    if (code === "captcha_failed" || m === "captcha_failed") {
      return isRtl ? "فشل التحقق الأمني، حاول مجددًا" : "Security check failed, try again"
    }
    if (code === "password_space") {
      return isRtl ? "كلمة المرور لا يجب أن تحتوي على مسافات" : "Password must not contain spaces"
    }
    if (code === "password_too_short") {
      return isRtl ? "كلمة المرور يجب أن تكون 8 أحرف على الأقل" : "Password must be at least 8 characters"
    }
    if (code === "password_letters") {
      return isRtl ? "يجب أن تحتوي كلمة المرور على حرف إنجليزي واحد على الأقل" : "Password must contain at least one letter"
    }
    if (code === "password_numbers") {
      return isRtl ? "يجب أن تحتوي كلمة المرور على رقم واحد على الأقل" : "Password must contain at least one number"
    }
    if (code === "over_email_send_rate_limit" || /rate limit exceeded/i.test(m)) {
      return isRtl
        ? "وصلت إلى الحد الأقصى لإرسال الرموز. حاول مجددًا بعد مرور ساعة تقريبًا."
        : "You've reached the maximum number of codes. Try again in about an hour."
    }
    if (code === "over_request_rate_limit" || /too many requests/i.test(m)) {
      return isRtl
        ? "عدد كبير جدًا من الطلبات من جهازك. حاول مجددًا بعد بضع دقائق."
        : "Too many requests from your device. Please try again in a few minutes."
    }
    if (code === "email_domain") {
      return isRtl ? "يُسمح فقط ببريد Gmail (@gmail.com)" : "Only @gmail.com emails are allowed"
    }
    if (code === "name_taken") {
      return isRtl ? "هذا الاسم مستخدم بالفعل في حساب آخر" : "This name is already used by another account"
    }
    return m
  }

  const passwordIssue = (pw: string): string | null => {
    if (/\s/.test(pw)) {
      return isRtl ? "كلمة المرور لا يجب أن تحتوي على مسافات" : "Password must not contain spaces"
    }
    if (pw.length < 8) {
      return isRtl ? "كلمة المرور يجب أن تكون 8 أحرف على الأقل" : "Password must be at least 8 characters"
    }
    if (!/[A-Za-z]/.test(pw)) {
      return isRtl ? "يجب أن تحتوي كلمة المرور على حرف إنجليزي واحد على الأقل" : "Password must contain at least one letter"
    }
    if (!/\d/.test(pw)) {
      return isRtl ? "يجب أن تحتوي كلمة المرور على رقم واحد على الأقل" : "Password must contain at least one number"
    }
    return null
  }

  const gotoOtpScreen = (target: string, origin: OtpOrigin, seconds: number) => {
    setOtpEmail(target)
    setOtpCode("")
    setOtpTimer(seconds)
    setOtpOrigin(origin)
    setMode("otp")
  }

  const sendOtp = async (target: string, origin: OtpOrigin) => {
    const res = await fetch("/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: target,
        mode: origin,
        name: origin === "register" ? name : undefined,
        captchaToken,
      }),
    })
    const data = await res.json()
    if (!data.ok) {
      const err = new Error(data.error || "Failed to send code")
      ;(err as any).code = data.code
      throw err
    }
    gotoOtpScreen(target, origin, 60)
  }

  const sendRegisterOtp = async (target: string, fullName: string) => {
    const res = await fetch("/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: target, mode: "register", name: fullName, captchaToken }),
    })
    const data = await res.json()
    if (!data.ok) {
      const err = new Error(data.error || "Failed to send code")
      ;(err as any).code = data.code
      if (isCooldownError(err)) {
        if (!otpSentAt) setOtpSentAt(new Date(Date.now() - 70000).toISOString())
        gotoOtpScreen(target, "register", cooldownSeconds(err))
        return
      }
      throw err
    }
    setOtpSentAt(new Date(Date.now() - 5000).toISOString())
    gotoOtpScreen(target, "register", 60)
  }

  const handleResendOtp = async () => {
    try {
      await sendOtp(otpEmail, otpOrigin)
      toast.success(isRtl ? "تم إعادة إرسال الرمز" : "Code resent")
    } catch (err: any) {
      toast.error(friendlyError(err))
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (otpCode.trim().length !== 8) {
      toast.error(isRtl ? "أدخل الرمز المكوّن من 8 أرقام" : "Enter the 8-digit code")
      return
    }
    if (!captchaToken) {
      toast.error(isRtl ? "أكمل التحقق الأمني أولاً" : "Complete the security check first")
      return
    }
    setVerifying(true)
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: otpEmail,
          code: otpCode.trim(),
          origin: otpOrigin,
          name: otpOrigin === "register" ? name : undefined,
          password: otpOrigin === "register" ? password : undefined,
          otpSentAt: otpOrigin === "register" ? otpSentAt : undefined,
          captchaToken,
        }),
      })
      const data = await res.json()
      if (!data.ok) {
        const err = new Error(data.error || "Verification failed")
        ;(err as any).code = data.code
        throw err
      }
      if (otpOrigin === "forgot") {
        setMode("newpassword")
        setCaptchaToken(null)
        setCaptchaResetKey((k) => k + 1)
        toast.success(isRtl ? "تم التحقق! أدخل كلمة مرور جديدة" : "Verified! Enter a new password")
      } else {
        if (data.created) {
          fetch("/api/notify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "new_user", email: otpEmail, name: name || null }),
          }).catch(() => {})
        }
        toast.success(isRtl ? "تم التحقق بنجاح" : "Verified successfully")
        router.push("/")
        router.refresh()
      }
    } catch (err: any) {
      toast.error(friendlyError(err))
    } finally {
      setVerifying(false)
    }
  }

  const handleSubmitNewPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    const issue = passwordIssue(newPassword)
    if (issue) {
      toast.error(issue)
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error(isRtl ? "كلمتا المرور غير متطابقتين" : "Passwords do not match")
      return
    }
    if (!captchaToken) {
      toast.error(isRtl ? "أكمل التحقق الأمني أولاً" : "Complete the security check first")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/auth/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword, confirmPassword, captchaToken }),
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error || "Failed to update password")
      toast.success(isRtl ? "تم تغيير كلمة المرور بنجاح" : "Password changed successfully")
      router.push("/")
      router.refresh()
    } catch (err: any) {
      toast.error(friendlyError(err))
    } finally {
      setLoading(false)
    }
  }

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      toast.error(isRtl ? "أدخل بريدك الإلكتروني" : "Enter your email")
      return
    }
    if (!captchaToken) {
      toast.error(isRtl ? "أكمل التحقق الأمني أولاً" : "Complete the security check first")
      return
    }
    setLoading(true)
    try {
      await sendOtp(email.trim(), "forgot")
      toast.success(isRtl ? "أرسلنا رمز التحقق إلى بريدك" : "Verification code sent to your email")
    } catch (err: any) {
      if (isCooldownError(err)) {
        gotoOtpScreen(email.trim(), "forgot", cooldownSeconds(err))
        return
      }
      toast.error(friendlyError(err))
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setGoogleLoading(true)
    const supabase = createClient()
    try {
      const l = window.location.pathname.split("/")[1] === "ar" ? "ar" : "en"
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback?next=/${l}/account`,
        },
      })
      if (error) throw error
    } catch (err: any) {
      if (err.message?.toLowerCase().includes("not enabled")) {
        toast.error(isRtl ? "تسجيل الدخول بغوغل غير مفعل بعد" : "Google sign-in is not enabled yet")
      } else {
        toast.error(err.message)
      }
      setGoogleLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (TURNSTILE_SITE_KEY) {
        if (!captchaToken) {
          toast.error(isRtl ? "أكمل التحقق الأمني أولاً" : "Complete the security check first")
          return
        }
      }
      if (mode === "register") {
        const issue = passwordIssue(password)
        if (issue) {
          toast.error(issue)
          return
        }
        if (password !== confirmPassword) {
          toast.error(isRtl ? "كلمتا المرور غير متطابقتين" : "Passwords do not match")
          return
        }
        if (!name.trim()) {
          toast.error(isRtl ? "أدخل الاسم" : "Enter your name")
          return
        }
        if (!email.trim().toLowerCase().endsWith("@gmail.com")) {
          toast.error(isRtl ? "يُسمح فقط ببريد Gmail (@gmail.com)" : "Only @gmail.com emails are allowed")
          return
        }
        await sendRegisterOtp(email.trim(), name)
        toast.success(
          isRtl ? "تم إنشاء الحساب! أدخل رمز التحقق المرسل إلى بريدك" : "Account created! Enter the code sent to your email"
        )
      } else {
        const res = await fetch("/api/auth/signin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim(), password, captchaToken }),
        })
        const data = await res.json()
        if (!data.ok) {
          if (data.blocked) {
            toast.error(isRtl ? "تم حظر حسابك" : "Your account has been blocked")
            return
          }
          const err = new Error(data.error || "Sign in failed")
          ;(err as any).code = data.code
          throw err
        }
        toast.success("Welcome back!")
        router.push("/")
        router.refresh()
      }
    } catch (err: any) {
      toast.error(friendlyError(err))
      setCaptchaToken(null)
      setCaptchaResetKey((k) => k + 1)
    } finally {
      setLoading(false)
    }
  }

  const switchMode = (m: "login" | "register" | "forgot") => {
    const url = new URL(window.location.href)
    url.searchParams.set("mode", m)
    window.location.href = url.toString()
  }

  const otpBack = () => switchMode(otpOrigin === "forgot" ? "forgot" : "login")

  return (
    <>
      <Header />
      <div className="flex-1 flex items-center justify-center py-16 px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-8">
            <h1 className="text-2xl font-bold text-center mb-2">
              {mode === "otp"
                ? isRtl ? "رمز التحقق" : "Verification Code"
                : mode === "forgot"
                  ? isRtl ? "نسيت كلمة المرور" : "Forgot Password"
                  : mode === "newpassword"
                    ? isRtl ? "كلمة مرور جديدة" : "New Password"
                    : mode === "login" ? t("login_title") : t("register_title")}
            </h1>
            <p className="text-zinc-500 text-sm text-center mb-8">
              {mode === "otp"
                ? isRtl ? "أدخل الرمز المكوّن من 8 أرقام" : "Enter the 8-digit code"
                : mode === "forgot"
                  ? isRtl ? "أدخل بريدك وسنرسل لك رمز تحقق" : "Enter your email and we'll send a code"
                  : mode === "newpassword"
                    ? isRtl ? "اختر كلمة مرور جديدة لحسابك" : "Choose a new password for your account"
                    : "Sneakers Take Off"}
            </p>

            {blockedNotice && (mode === "login" || mode === "register") && (
              <div className="mb-6 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 text-center">
                {isRtl
                  ? "تم حظر حسابك. تواصل مع الإدارة للمزيد من المعلومات."
                  : "Your account has been blocked. Contact support for more information."}
              </div>
            )}

            {mode === "otp" && (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="p-3 rounded-xl bg-[#f97316]/5 border border-[#f97316]/15 text-sm text-zinc-600 text-center">
                  <ShieldCheck className="w-4 h-4 inline-block text-[#f97316] mb-1" />
                  <p className="break-all" dir="ltr">{otpEmail}</p>
                  <p className="text-xs text-zinc-400 mt-1">
                    {isRtl ? "أرسلنا رمزًا مكوّنًا من 8 أرقام إلى بريدك" : "We sent an 8-digit code to your email"}
                  </p>
                </div>

                <input
                  type="text"
                  inputMode="numeric"
                  autoFocus
                  maxLength={8}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="••••••••"
                  className="w-full text-center text-2xl font-bold tracking-[0.5em] pl-9 pr-9 py-3 rounded-xl border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-accent"
                />

                <Turnstile onToken={setCaptchaToken} resetKey={captchaResetKey} className="w-full [&>iframe]:w-full" />

                <button
                  type="submit"
                  disabled={verifying || otpCode.length !== 8}
                  className="w-full py-2.5 rounded-xl bg-accent text-white font-medium hover:bg-accent-light transition-colors disabled:opacity-50"
                >
                  {verifying ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {isRtl ? "جارٍ التحقق..." : "Verifying..."}
                    </span>
                  ) : (
                    isRtl ? "تحقق" : "Verify"
                  )}
                </button>

                <div className="flex items-center justify-between text-sm">
                  <button
                    type="button"
                    onClick={otpBack}
                    className="inline-flex items-center gap-1 text-zinc-500 hover:text-zinc-700 hover:underline"
                  >
                    <ArrowRight className={`w-3.5 h-3.5 ${isRtl ? "rotate-180" : ""}`} />
                    {isRtl ? "رجوع" : "Back"}
                  </button>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={otpTimer > 0}
                    className="text-accent font-medium hover:underline disabled:text-zinc-400 disabled:hover:no-underline disabled:cursor-not-allowed"
                  >
                    {otpTimer > 0
                      ? isRtl ? `إعادة الإرسال بعد ${otpTimer} ثانية` : `Resend in ${otpTimer}s`
                      : isRtl ? "إعادة إرسال الرمز" : "Resend code"}
                  </button>
                </div>
              </form>
            )}

            {mode === "forgot" && (
              <form onSubmit={handleForgot} className="space-y-4">
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
                <Turnstile onToken={setCaptchaToken} resetKey={captchaResetKey} className="w-full [&>iframe]:w-full" />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-accent text-white font-medium hover:bg-accent-light transition-colors disabled:opacity-50"
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {isRtl ? "جارٍ الإرسال..." : "Sending..."}
                    </span>
                  ) : (
                    isRtl ? "إرسال رمز التحقق" : "Send verification code"
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  className="w-full text-center text-sm text-zinc-500 hover:text-zinc-700 hover:underline"
                >
                  {isRtl ? "رجوع لتسجيل الدخول" : "Back to login"}
                </button>
              </form>
            )}

            {mode === "newpassword" && (
              <form onSubmit={handleSubmitNewPassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">{t("password")}</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-accent text-sm"
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="mt-1.5 text-xs text-zinc-400">
                    {isRtl
                      ? "8 أحرف على الأقل، بلا مسافات، وتحتوي على حرف إنجليزي ورقم"
                      : "At least 8 chars, no spaces, with a letter and a number"}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    {isRtl ? "تأكيد كلمة المرور" : "Confirm password"}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-accent text-sm"
                      required
                      minLength={8}
                    />
                  </div>
                </div>
                <Turnstile onToken={setCaptchaToken} resetKey={captchaResetKey} className="w-full [&>iframe]:w-full" />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-accent text-white font-medium hover:bg-accent-light transition-colors disabled:opacity-50"
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {isRtl ? "جارٍ الحفظ..." : "Saving..."}
                    </span>
                  ) : (
                    isRtl ? "حفظ كلمة المرور" : "Save password"
                  )}
                </button>
              </form>
            )}

            {(mode === "login" || mode === "register") && (
              <>
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

                  {(mode === "login" || mode === "register") && (
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
                          minLength={8}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {mode === "register" && (
                        <p className="mt-1.5 text-xs text-zinc-400">
                          {isRtl
                            ? "8 أحرف على الأقل، بلا مسافات، وتحتوي على حرف إنجليزي ورقم"
                            : "At least 8 chars, no spaces, with a letter and a number"}
                        </p>
                      )}
                    </div>
                  )}

                  {mode === "register" && (
                    <div>
                      <label className="block text-sm font-medium mb-1.5">
                        {isRtl ? "تأكيد كلمة المرور" : "Confirm password"}
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                        <input
                          type={showPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-accent text-sm"
                          required
                          minLength={8}
                        />
                      </div>
                    </div>
                  )}

                  {(mode === "login" || mode === "register") && (
                    <Turnstile onToken={setCaptchaToken} resetKey={captchaResetKey} className="w-full [&>iframe]:w-full" />
                  )}

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
                      <button
                        onClick={() => switchMode("forgot")}
                        className="block w-full mb-3 text-accent font-medium hover:underline"
                      >
                        {isRtl ? "نسيت كلمة المرور؟" : "Forgot password?"}
                      </button>
                      {t("no_account")}{" "}
                      <button onClick={() => switchMode("register")} className="text-accent font-medium hover:underline">
                        {t("register_btn")}
                      </button>
                    </>
                  ) : (
                    <>
                      {t("have_account")}{" "}
                      <button onClick={() => switchMode("login")} className="text-accent font-medium hover:underline">
                        {t("login_btn")}
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
