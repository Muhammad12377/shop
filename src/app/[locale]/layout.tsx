import type { Metadata } from "next"
import { NextIntlClientProvider } from "next-intl"
import { getMessages, getTranslations } from "next-intl/server"
import { Geist } from "next/font/google"
import { notFound } from "next/navigation"
import { routing } from "@/lib/i18n/routing"
import { Toaster } from "react-hot-toast"
import BlockedWatcher from "@/components/auth/BlockedWatcher"
import "../globals.css"

const geist = Geist({
  subsets: ["latin"],
  display: "swap",
})

type Props = {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "nav" })

  return {
    title: "Sneakers Club Syria",
    description: t("home"),
  }
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params

  if (!routing.locales.includes(locale as "en" | "ar")) {
    notFound()
  }

  const messages = await getMessages({ locale })
  const isRtl = locale === "ar"

  return (
    <html lang={locale} dir={isRtl ? "rtl" : "ltr"} className={geist.className}>
      <body className="min-h-screen flex flex-col">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <BlockedWatcher />
          {children}
          <Toaster
            position={isRtl ? "top-left" : "top-right"}
            toastOptions={{
              duration: 3000,
              style: {
                direction: isRtl ? "rtl" : "ltr",
              },
            }}
          />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
