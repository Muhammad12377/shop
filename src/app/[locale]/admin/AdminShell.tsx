"use client"

import { useState } from "react"
import AdminSidebar from "@/components/admin/AdminSidebar"
import AdminHeader from "./AdminHeader"

export default function AdminShell({
  locale,
  children,
}: {
  locale: string
  children: React.ReactNode
}) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const isRtl = locale === "ar"

  return (
    <div className="min-h-screen bg-zinc-50">
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}
      <AdminSidebar locale={locale} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className={`flex flex-col ${isRtl ? "lg:mr-64" : "lg:ml-64"}`}>
        <AdminHeader
          locale={locale}
          mobileOpen={mobileOpen}
          onToggleMenu={() => setMobileOpen((v) => !v)}
        />
        <main className="flex-1 p-3 sm:p-6">{children}</main>
      </div>
    </div>
  )
}
