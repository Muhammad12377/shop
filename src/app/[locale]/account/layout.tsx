import { getTranslations } from "next-intl/server"
import { createServerSupabase } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Link } from "@/lib/i18n/navigation"
import AccountNav from "@/components/account/AccountNav"
import { ArrowLeft } from "lucide-react"

type Props = {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export default async function AccountLayout({ children, params }: Props) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "account" })
  const isRtl = locale === "ar"

  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth")

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-accent transition-colors mb-4"
        >
          <ArrowLeft className={`w-4 h-4 ${isRtl ? "rotate-180" : ""}`} />
          {isRtl ? "العودة للمتجر" : "Back to store"}
        </Link>
        <h1 className="text-2xl font-bold mb-8">{t("title")}</h1>
        <div className="flex flex-col md:flex-row gap-8">
          <aside className="md:w-56 shrink-0">
            <AccountNav />
          </aside>
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </div>
  )
}
