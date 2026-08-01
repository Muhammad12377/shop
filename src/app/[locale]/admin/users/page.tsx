"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { Shield, ShieldOff, Ban, CheckCircle2, Loader2, X, Search, Crown } from "lucide-react"
import toast from "react-hot-toast"
import type { UserProfile } from "@/types"

type ConfirmState = { user: UserProfile; action: "promote" | "demote" | "block" | "unblock" } | null

const isProtectedUser = (u: UserProfile) => u.is_me || u.is_main_admin

const protectionLabel = (u: UserProfile, isRtl: boolean) =>
  u.is_me
    ? isRtl ? "حسابك الحالي" : "Your account"
    : isRtl ? "المدير الأساسي" : "Main Admin"

export default function AdminUsersPage({ params: paramsPromise }: { params: Promise<{ locale: string }> }) {
  const [locale, setLocale] = useState("en")
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<ConfirmState>(null)
  const [typedName, setTypedName] = useState("")
  const [search, setSearch] = useState("")

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

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return users
    return users.filter((u) =>
      [u.full_name, u.email].filter(Boolean).some((v) => v!.toLowerCase().includes(q))
    )
  }, [users, search])

  const openConfirm = (user: UserProfile, action: "promote" | "demote" | "block" | "unblock") => {
    setTypedName("")
    setConfirming({ user, action })
  }

  const performAction = async () => {
    if (!confirming) return
    const { user, action } = confirming
    setTogglingId(user.id)
    try {
      if (action === "block" || action === "unblock") {
        const blocked = action === "block"
        const res = await fetch(`/api/admin/users/${user.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ blocked }),
        })
        const data = await res.json()
        if (data.error) throw new Error(data.error)
        setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, blocked } : u)))
        toast.success(
          blocked
            ? isRtl ? "تم حظر الحساب" : "Account blocked"
            : isRtl ? "تم فك الحظر" : "Account unblocked"
        )
        setConfirming(null)
        return
      }
      const newRole = action === "promote" ? "admin" : "user"
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
    ? confirming.action === "block" || confirming.action === "unblock"
      ? typedName.trim().toLowerCase() === (isRtl ? "تأكيد" : "confirm")
      : typedName.trim().toLowerCase() === matchText(confirming.user).toLowerCase()
    : false

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{isRtl ? "المستخدمين" : "Users"}</h1>

      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={isRtl ? "ابحث بالاسم أو البريد..." : "Search by name or email..."}
          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316]"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      {search.trim() && (
        <p className="text-xs text-zinc-500 mb-3">
          {isRtl
            ? `${filteredUsers.length} نتيجة`
            : `${filteredUsers.length} result${filteredUsers.length === 1 ? "" : "s"}`}
        </p>
      )}

      <div className="hidden md:block bg-white rounded-xl border border-zinc-200 overflow-hidden">
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
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-zinc-400">
                    {isRtl ? "لا توجد نتائج" : "No results"}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3 font-medium">{u.full_name || "-"}</td>
                    <td className="px-4 py-3 text-zinc-500">{u.email}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
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
                        {u.is_main_admin && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[#f97316]/10 text-[#f97316] border border-[#f97316]/30">
                            <Crown className="w-3 h-3" />
                            {isRtl ? "المدير الأساسي" : "Main Admin"}
                          </span>
                        )}
                        {u.blocked && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                            {isRtl ? "محظور" : "Blocked"}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-500">
                      {new Date(u.created_at).toLocaleDateString(isRtl ? "ar" : "en-US")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openConfirm(u, u.blocked ? "unblock" : "block")}
                          disabled={togglingId === u.id || isProtectedUser(u)}
                          title={isProtectedUser(u) ? protectionLabel(u, isRtl) : undefined}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 ${
                            isProtectedUser(u)
                              ? "bg-zinc-100 text-zinc-400 cursor-not-allowed"
                              : u.blocked
                                ? "bg-green-50 text-green-700 hover:bg-green-100"
                                : "bg-red-50 text-red-600 hover:bg-red-100"
                          }`}
                        >
                          {togglingId === u.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : isProtectedUser(u) ? (
                            <Ban className="w-3 h-3" />
                          ) : u.blocked ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : (
                            <Ban className="w-3 h-3" />
                          )}
                          {isProtectedUser(u)
                            ? protectionLabel(u, isRtl)
                            : u.blocked
                              ? isRtl ? "فك الحظر" : "Unblock"
                              : isRtl ? "حظر الحساب" : "Block"}
                        </button>
                        <button
                          onClick={() => openConfirm(u, u.role === "admin" ? "demote" : "promote")}
                          disabled={togglingId === u.id || isProtectedUser(u)}
                          title={isProtectedUser(u) ? protectionLabel(u, isRtl) : undefined}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 ${
                            isProtectedUser(u)
                              ? "bg-zinc-100 text-zinc-400 cursor-not-allowed"
                              : u.role === "admin"
                                ? "bg-red-50 text-red-600 hover:bg-red-100"
                                : "bg-[#f97316]/10 text-[#f97316] hover:bg-[#f97316]/20"
                          }`}
                        >
                          {togglingId === u.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : isProtectedUser(u) ? (
                            <Shield className="w-3 h-3" />
                          ) : u.role === "admin" ? (
                            <ShieldOff className="w-3 h-3" />
                          ) : (
                            <Shield className="w-3 h-3" />
                          )}
                          {isProtectedUser(u)
                            ? protectionLabel(u, isRtl)
                            : u.role === "admin"
                              ? isRtl ? "إزالة صلاحية المدير" : "Remove Admin"
                              : isRtl ? "تعيين مدير" : "Make Admin"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="md:hidden space-y-3">
        {filteredUsers.length === 0 ? (
          <div className="bg-white rounded-xl border border-zinc-200 p-12 text-center text-zinc-400">
            {isRtl ? "لا توجد نتائج" : "No results"}
          </div>
        ) : (
          filteredUsers.map((u) => (
            <div key={u.id} className="bg-white rounded-xl border border-zinc-200 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium truncate">{u.full_name || "-"}</p>
                  <p className="text-sm text-zinc-500 truncate">{u.email}</p>
                  <p className="text-xs text-zinc-400 mt-1">
                    {new Date(u.created_at).toLocaleDateString(isRtl ? "ar" : "en-US")}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
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
                  {u.is_main_admin && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[#f97316]/10 text-[#f97316] border border-[#f97316]/30">
                      <Crown className="w-3 h-3" />
                      {isRtl ? "المدير الأساسي" : "Main Admin"}
                    </span>
                  )}
                  {u.blocked && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                      {isRtl ? "محظور" : "Blocked"}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => openConfirm(u, u.blocked ? "unblock" : "block")}
                  disabled={togglingId === u.id || isProtectedUser(u)}
                  className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 ${
                    isProtectedUser(u)
                      ? "bg-zinc-100 text-zinc-400 cursor-not-allowed"
                      : u.blocked
                        ? "bg-green-50 text-green-700 hover:bg-green-100"
                        : "bg-red-50 text-red-600 hover:bg-red-100"
                  }`}
                >
                  {togglingId === u.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : isProtectedUser(u) ? (
                    <Ban className="w-3 h-3" />
                  ) : u.blocked ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : (
                    <Ban className="w-3 h-3" />
                  )}
                  {isProtectedUser(u)
                    ? protectionLabel(u, isRtl)
                    : u.blocked
                      ? isRtl ? "فك الحظر" : "Unblock"
                      : isRtl ? "حظر الحساب" : "Block"}
                </button>
                <button
                  onClick={() => openConfirm(u, u.role === "admin" ? "demote" : "promote")}
                  disabled={togglingId === u.id || isProtectedUser(u)}
                  className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 ${
                    isProtectedUser(u)
                      ? "bg-zinc-100 text-zinc-400 cursor-not-allowed"
                      : u.role === "admin"
                        ? "bg-red-50 text-red-600 hover:bg-red-100"
                        : "bg-[#f97316]/10 text-[#f97316] hover:bg-[#f97316]/20"
                  }`}
                >
                  {togglingId === u.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : isProtectedUser(u) ? (
                    <Shield className="w-3 h-3" />
                  ) : u.role === "admin" ? (
                    <ShieldOff className="w-3 h-3" />
                  ) : (
                    <Shield className="w-3 h-3" />
                  )}
                  {isProtectedUser(u)
                    ? protectionLabel(u, isRtl)
                    : u.role === "admin"
                      ? isRtl ? "إزالة صلاحية المدير" : "Remove Admin"
                      : isRtl ? "تعيين مدير" : "Make Admin"}
                </button>
              </div>
            </div>
          ))
        )}
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
                    confirming.action === "block"
                      ? "bg-red-50"
                      : confirming.action === "unblock"
                        ? "bg-green-50"
                        : confirming.action === "demote"
                          ? "bg-red-50"
                          : "bg-[#f97316]/10"
                  }`}
                >
                  {confirming.action === "block" ? (
                    <Ban className="w-5 h-5 text-red-600" />
                  ) : confirming.action === "unblock" ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : confirming.action === "demote" ? (
                    <ShieldOff className="w-5 h-5 text-red-600" />
                  ) : (
                    <Shield className="w-5 h-5 text-[#f97316]" />
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-bold">
                    {confirming.action === "block"
                      ? isRtl ? "حظر الحساب" : "Block Account"
                      : confirming.action === "unblock"
                        ? isRtl ? "فك الحظر" : "Unblock Account"
                        : confirming.action === "demote"
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
              {confirming.action === "block"
                ? isRtl
                  ? "سيتم منع هذا المستخدم من تسجيل الدخول وإتمام الطلبات."
                  : "This user will be prevented from signing in and placing orders."
                : confirming.action === "unblock"
                  ? isRtl
                    ? "سيتم السماح لهذا المستخدم بتسجيل الدخول وإتمام الطلبات مجددًا."
                    : "This user will be allowed to sign in and place orders again."
                : confirming.action === "demote"
                  ? isRtl
                    ? "سيتم إزالة صلاحية المدير من هذا المستخدم."
                    : "This user will lose admin access."
                  : isRtl
                    ? "سيتم منح هذا المستخدم صلاحية المدير."
                    : "This user will gain admin access."}
            </p>

            <label className="block text-sm font-medium text-zinc-700 mb-1.5">
              {confirming.action === "block" || confirming.action === "unblock"
                ? isRtl
                  ? "اكتب كلمة تأكيد للمتابعة"
                  : "Type the word confirm to proceed"
                : isRtl ? "اكتب اسم المستخدم لتأكيد العملية" : "Type the user name to confirm"}
            </label>
            <input
              type="text"
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && isMatch && togglingId === null) performAction() }}
              autoFocus
              placeholder={
                confirming.action === "block" || confirming.action === "unblock"
                  ? isRtl ? "تأكيد" : "confirm"
                  : matchText(confirming.user)
              }
              className={`w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 transition-colors ${
                typedName && !isMatch
                  ? "border-red-300 focus:ring-red-200"
                  : "border-zinc-300 focus:ring-[#f97316]/30 focus:border-[#f97316]"
              }`}
            />
            {typedName && !isMatch && (
              <p className="mt-1.5 text-xs text-red-600">
                {isRtl ? "الكلمة غير مطابقة" : "Text does not match"}
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
                  confirming.action === "block"
                    ? "bg-red-600 hover:bg-red-700"
                    : confirming.action === "unblock"
                      ? "bg-green-600 hover:bg-green-700"
                      : confirming.action === "demote"
                        ? "bg-red-600 hover:bg-red-700"
                        : "bg-[#f97316] hover:bg-[#ea580c]"
                }`}
              >
                {togglingId !== null ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {isRtl ? "جارٍ التنفيذ..." : "Processing..."}
                  </span>
                ) : confirming.action === "block" ? (
                  isRtl ? "تأكيد الحظر" : "Confirm Block"
                ) : confirming.action === "unblock" ? (
                  isRtl ? "تأكيد فك الحظر" : "Confirm Unblock"
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
