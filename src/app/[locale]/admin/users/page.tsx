"use client"

import { useEffect, useState, useCallback } from "react"
import { Shield, ShieldOff, Loader2, X } from "lucide-react"
import toast from "react-hot-toast"
import type { UserProfile } from "@/types"

type ConfirmState = { user: UserProfile; action: "promote" | "demote" } | null

export default function AdminUsersPage({ params: paramsPromise }: { params: Promise<{ locale: string }> }) {
  const [locale, setLocale] = useState("en")
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<ConfirmState>(null)
  const [typedName, setTypedName] = useState("")

  useEffect(() => { paramsPromise.then((p) => setLocale(p.locale)) }, [paramsPromise])
  const isRtl = locale === "ar"

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/users")
      const data = await res.json()
      if (Array.isArray(data)) setUsers(data)
    } catch {
      toast.error(isRtl ? "خطأ في تحميل المستخدمين" : "Failed to load users")
    } finally {
      setLoading(false)
    }
  }, [isRtl])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const matchText = (user: UserProfile) => {
    const name = user.full_name?.trim()
    return (name ? name : user.email).trim()
  }

  const openConfirm = (user: UserProfile, action: "promote" | "demote") => {
    setTypedName("")
    setConfirming({ user, action })
  }

  const performAction = async () => {
    if (!confirming) return
    const { user, action } = confirming
    const newRole = action === "promote" ? "admin" : "user"
    setTogglingId(user.id)
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, role: newRole as "admin" | "user" } : u)))
      toast.success(
        newRole === "admin"
          ? isRtl ? "تم تعيينه كمدير" : "Promoted to admin"
          : isRtl ? "تم إزالة صلاحية المدير" : "Admin role removed"
      )
      setConfirming(null)
    } catch (err: any) {
      toast.error(err.message || (isRtl ? "خطأ" : "Error"))
    } finally {
      setTogglingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-[#f97316] border-t-transparent rounded-full" />
      </div>
    )
  }

  const isMatch = confirming
    ? typedName.trim().toLowerCase() === matchText(confirming.user).toLowerCase()
    : false

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{isRtl ? "المستخدمين" : "Users"}</h1>

      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-zinc-500">{isRtl ? "الاسم" : "Name"}</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500">Email</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500">{isRtl ? "الدور" : "Role"}</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500">{isRtl ? "تاريخ التسجيل" : "Date Joined"}</th>
                <th className="text-right px-4 py-3 font-medium text-zinc-500">{isRtl ? "الإجراءات" : "Actions"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-zinc-400">
                    {isRtl ? "لا توجد نتائج" : "No results"}
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3 font-medium">{u.full_name || "-"}</td>
                    <td className="px-4 py-3 text-zinc-500">{u.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          u.role === "admin"
                            ? "bg-[#f97316]/10 text-[#f97316]"
                            : "bg-zinc-100 text-zinc-600"
                        }`}
                      >
                        {u.role === "admin"
                          ? isRtl ? "مدير" : "Admin"
                          : isRtl ? "مستخدم" : "User"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-500">
                      {new Date(u.created_at).toLocaleDateString(isRtl ? "ar" : "en-US")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openConfirm(u, u.role === "admin" ? "demote" : "promote")}
                        disabled={togglingId === u.id || u.is_me}
                        title={u.is_me ? "This is your own account" : undefined}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                          u.is_me
                            ? "bg-zinc-100 text-zinc-400 cursor-not-allowed"
                            : u.role === "admin"
                              ? "bg-red-50 text-red-600 hover:bg-red-100"
                              : "bg-[#f97316]/10 text-[#f97316] hover:bg-[#f97316]/20"
                        } disabled:opacity-50`}
                      >
                        {togglingId === u.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : u.is_me ? (
                          <Shield className="w-3 h-3" />
                        ) : u.role === "admin" ? (
                          <ShieldOff className="w-3 h-3" />
                        ) : (
                          <Shield className="w-3 h-3" />
                        )}
                        {u.is_me
                          ? isRtl ? "حسابك الحالي" : "Your account"
                          : u.role === "admin"
                            ? isRtl ? "إزالة صلاحية المدير" : "Remove Admin"
                            : isRtl ? "تعيين مدير" : "Make Admin"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {confirming && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setConfirming(null)}
        >
          <div
            dir={isRtl ? "rtl" : "ltr"}
            className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    confirming.action === "demote" ? "bg-red-50" : "bg-[#f97316]/10"
                  }`}
                >
                  {confirming.action === "demote" ? (
                    <ShieldOff className="w-5 h-5 text-red-600" />
                  ) : (
                    <Shield className="w-5 h-5 text-[#f97316]" />
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-bold">
                    {confirming.action === "demote"
                      ? isRtl ? "إزالة صلاحية المدير" : "Remove Admin Role"
                      : isRtl ? "تعيين كمدير" : "Make Admin"}
                  </h2>
                  <p className="text-sm text-zinc-500">{confirming.user.email}</p>
                </div>
              </div>
              <button
                onClick={() => setConfirming(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm text-zinc-600 mb-4">
              {confirming.action === "demote"
                ? isRtl
                  ? "سيتم إزالة صلاحية المدير من هذا المستخدم."
                  : "This user will lose admin access."
                : isRtl
                  ? "سيتم منح هذا المستخدم صلاحية المدير."
                  : "This user will gain admin access."}
            </p>

            <label className="block text-sm font-medium text-zinc-700 mb-1.5">
              {isRtl ? "اكتب اسم المستخدم لتأكيد العملية" : "Type the user name to confirm"}
            </label>
            <input
              type="text"
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && isMatch && togglingId === null) performAction() }}
              autoFocus
              placeholder={matchText(confirming.user)}
              className={`w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 transition-colors ${
                typedName && !isMatch
                  ? "border-red-300 focus:ring-red-200"
                  : "border-zinc-300 focus:ring-[#f97316]/30 focus:border-[#f97316]"
              }`}
            />
            {typedName && !isMatch && (
              <p className="mt-1.5 text-xs text-red-600">
                {isRtl ? "الاسم غير مطابق" : "Name does not match"}
              </p>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setConfirming(null)}
                disabled={togglingId !== null}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-zinc-600 bg-zinc-100 hover:bg-zinc-200 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isRtl ? "إلغاء" : "Cancel"}
              </button>
              <button
                onClick={performAction}
                disabled={!isMatch || togglingId !== null}
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                  confirming.action === "demote"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-[#f97316] hover:bg-[#ea580c]"
                }`}
              >
                {togglingId !== null ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {isRtl ? "جارٍ التنفيذ..." : "Processing..."}
                  </span>
                ) : confirming.action === "demote" ? (
                  isRtl ? "تأكيد الإزالة" : "Confirm Removal"
                ) : (
                  isRtl ? "تأكيد التعيين" : "Confirm Promotion"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
