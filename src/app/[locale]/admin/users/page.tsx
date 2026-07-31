"use client"

import { useEffect, useState, useCallback } from "react"
import { Shield, ShieldOff, Loader2 } from "lucide-react"
import toast from "react-hot-toast"
import type { UserProfile } from "@/types"

export default function AdminUsersPage({ params: paramsPromise }: { params: Promise<{ locale: string }> }) {
  const [locale, setLocale] = useState("en")
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [togglingId, setTogglingId] = useState<string | null>(null)

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

  const toggleRole = async (user: UserProfile) => {
    const newRole = user.role === "admin" ? "user" : "admin"
    if (!confirm(newRole === "admin" ? "Make this user an admin?" : "Remove admin role from this user?")) return
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
                        onClick={() => toggleRole(u)}
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
    </div>
  )
}
