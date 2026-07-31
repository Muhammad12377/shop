import { redirect } from "next/navigation"
import { createServerSupabase } from "@/lib/supabase/server"
import AdminShell from "./AdminShell"
import { Toaster } from "react-hot-toast"

type Props = {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export default async function AdminLayout({ children, params }: Props) {
  const { locale } = await params
  const isRtl = locale === "ar"

  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "admin") redirect("/")

  return (
    <>
      <AdminShell locale={locale}>{children}</AdminShell>
      <Toaster
        position={isRtl ? "top-left" : "top-right"}
        toastOptions={{
          duration: 3000,
          style: { direction: isRtl ? "rtl" : "ltr" },
        }}
      />
    </>
  )
}
