import { getTranslations } from "next-intl/server"
import { createServerSupabase } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"

type Props = { params: Promise<{ locale: string }> }

export default async function AdminUsersPage({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "admin" })
  const isRtl = locale === "ar"

  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth")

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "admin") redirect("/")

  const { data: users } = await supabase.from("profiles").select("*").order("created_at", { ascending: false })

  return (
    <div className="min-h-screen bg-zinc-50">
      <AdminHeader locale={locale} />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-8">{t("users")}</h1>

        <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-zinc-500">{isRtl ? "الاسم" : "Name"}</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500">Email</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500">{isRtl ? "الدور" : "Role"}</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500">{isRtl ? "التاريخ" : "Date"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {(!users || users.length === 0) ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-zinc-400">
                    {isRtl ? "لا توجد نتائج" : "No results"}
                  </td>
                </tr>
              ) : (
                users.map((u: any) => (
                  <tr key={u.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3 font-medium">{u.full_name || "-"}</td>
                    <td className="px-4 py-3 text-zinc-500">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.role === "admin" ? "bg-accent/10 text-accent" : "bg-zinc-100 text-zinc-600"}`}>
                        {u.role === "admin" ? (isRtl ? "مدير" : "Admin") : (isRtl ? "مستخدم" : "User")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-500">
                      {new Date(u.created_at).toLocaleDateString(isRtl ? "ar" : "en-US")}
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

function AdminHeader({ locale }: { locale: string }) {
  return (
    <header className="bg-primary text-white">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/admin" className="font-bold">
          SNEAKERS <span className="text-accent">CLUB</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/admin" className="hover:text-accent transition-colors">
            {locale === "ar" ? "لوحة التحكم" : "Dashboard"}
          </Link>
          <Link href="/admin/products" className="hover:text-accent transition-colors">
            {locale === "ar" ? "المنتجات" : "Products"}
          </Link>
          <Link href="/admin/orders" className="hover:text-accent transition-colors">
            {locale === "ar" ? "الطلبات" : "Orders"}
          </Link>
          <Link href="/admin/users" className="text-accent font-medium">
            {locale === "ar" ? "المستخدمين" : "Users"}
          </Link>
          <Link href={`/${locale}`} className="text-zinc-400 hover:text-white transition-colors">
            {locale === "ar" ? "المتجر" : "Store"}
          </Link>
        </nav>
      </div>
    </header>
  )
}
