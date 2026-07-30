"use client"

import { useState, useEffect } from "react"
import { useTranslations, useLocale } from "next-intl"
import { createClient } from "@/lib/supabase/client"
import toast from "react-hot-toast"
import { User, Mail, Phone, MapPin, Building, Camera, Lock, Eye, EyeOff } from "lucide-react"

export default function ProfilePage() {
  const t = useTranslations("account")
  const ct = useTranslations("common")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState({
    full_name: "",
    phone: "",
    address: "",
    city: "",
    avatar_url: "",
  })
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  })
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  })
  const [changingPassword, setChangingPassword] = useState(false)

  const locale = useLocale()
  const isRtl = locale === "ar"

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single()
          .then(({ data }) => {
            if (data) {
              setProfile({
                full_name: data.full_name || "",
                phone: data.phone || "",
                address: data.address || "",
                city: data.city || "",
                avatar_url: data.avatar_url || "",
              })
            }
            setLoading(false)
          })
      } else {
        setLoading(false)
      }
    })
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error("Not logged in"); setSaving(false); return }
    const { error } = await supabase
      .from("profiles")
      .update(profile)
      .eq("id", user.id)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success(t("update_success"))
    }
    setSaving(false)
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error("Passwords do not match")
      return
    }
    if (passwordForm.new_password.length < 6) {
      toast.error("Password must be at least 6 characters")
      return
    }
    setChangingPassword(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({
      password: passwordForm.new_password,
    })
    if (error) {
      toast.error(error.message)
    } else {
      toast.success(t("password_updated"))
      setPasswordForm({ current_password: "", new_password: "", confirm_password: "" })
    }
    setChangingPassword(false)
  }

  const updateField = (field: string, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-zinc-100 p-6">
        <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
          <User className="w-5 h-5 text-accent" />
          {t("edit_profile")}
        </h2>
        <div className="space-y-4">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-zinc-100 flex items-center justify-center overflow-hidden">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="w-6 h-6 text-zinc-400" />
              )}
            </div>
            <button type="button" className="text-sm text-accent hover:underline flex items-center gap-1">
              <Camera className="w-4 h-4" />
              {t("avatar")}
            </button>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t("full_name")}</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                value={profile.full_name}
                onChange={(e) => updateField("full_name", e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-accent text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t("phone")}</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="tel"
                value={profile.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-accent text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t("address")}</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                value={profile.address}
                onChange={(e) => updateField("address", e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-accent text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t("city")}</label>
            <div className="relative">
              <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                value={profile.city}
                onChange={(e) => updateField("city", e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-accent text-sm"
              />
            </div>
          </div>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="mt-6 px-8 py-2.5 rounded-full bg-accent text-white font-medium hover:bg-accent-light transition-colors disabled:opacity-50 text-sm"
        >
          {saving ? ct("loading") : t("save_changes")}
        </button>
      </form>

      <form onSubmit={handlePasswordChange} className="bg-white rounded-2xl border border-zinc-100 p-6">
        <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
          <Lock className="w-5 h-5 text-accent" />
          {t("change_password")}
        </h2>
        <div className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium mb-1">{t("current_password")}</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type={showPasswords.current ? "text" : "password"}
                value={passwordForm.current_password}
                onChange={(e) => setPasswordForm((p) => ({ ...p, current_password: e.target.value }))}
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-accent text-sm"
                required
              />
              <button
                type="button"
                onClick={() => setShowPasswords((p) => ({ ...p, current: !p.current }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400"
              >
                {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t("new_password")}</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type={showPasswords.new ? "text" : "password"}
                value={passwordForm.new_password}
                onChange={(e) => setPasswordForm((p) => ({ ...p, new_password: e.target.value }))}
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-accent text-sm"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPasswords((p) => ({ ...p, new: !p.new }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400"
              >
                {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t("confirm_password")}</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type={showPasswords.confirm ? "text" : "password"}
                value={passwordForm.confirm_password}
                onChange={(e) => setPasswordForm((p) => ({ ...p, confirm_password: e.target.value }))}
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-accent text-sm"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPasswords((p) => ({ ...p, confirm: !p.confirm }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400"
              >
                {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
        <button
          type="submit"
          disabled={changingPassword}
          className="mt-6 px-8 py-2.5 rounded-full bg-primary text-white font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50 text-sm"
        >
          {changingPassword ? ct("loading") : t("change_password")}
        </button>
      </form>
    </div>
  )
}
