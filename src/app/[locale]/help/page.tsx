import { getTranslations } from "next-intl/server"
import Header from "@/components/layout/Header"
import Footer from "@/components/layout/Footer"
import { getCachedSettings } from "@/lib/home-data"
import { AtSign, Phone, Mail } from "lucide-react"

export const revalidate = 60
export const dynamic = "force-static"

type Props = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "help" })
  return { title: `${t("title")} - Sneakers Take Off` }
}

export default async function HelpPage({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "help" })
  const isRtl = locale === "ar"
  const settings = await getCachedSettings()

  const instagram = settings?.social_instagram || ""
  const phone = settings?.contact_phone || ""
  const email = settings?.contact_email || ""

  const instagramUrl = instagram
    ? /^https?:\/\//i.test(instagram)
      ? instagram
      : `https://instagram.com/${instagram.replace(/^@/, "")}`
    : ""

  const cards = [
    {
      icon: AtSign,
      title: t("instagram"),
      desc: t("instagram_desc"),
      href: instagramUrl || undefined,
      display: instagram || undefined,
    },
    {
      icon: Phone,
      title: t("phone"),
      desc: t("phone_desc"),
      href: phone ? `tel:${phone.replace(/[^+\d]/g, "")}` : undefined,
      display: phone || undefined,
    },
    {
      icon: Mail,
      title: t("email"),
      desc: t("email_desc"),
      href: email ? `mailto:${email}` : undefined,
      display: email || undefined,
    },
  ]

  return (
    <>
      <Header />
      <main>
        <section className="bg-zinc-50 py-16">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h1 className="text-3xl md:text-4xl font-bold mb-3">{t("title")}</h1>
            <p className="text-zinc-500">{t("subtitle")}</p>
          </div>
        </section>
        <section className="py-12 bg-white">
          <div className="max-w-4xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-6">
            {cards.map((c) => (
              <div key={c.title} className="bg-zinc-50 rounded-2xl border border-zinc-200 p-6 text-center flex flex-col items-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-accent/10 text-accent mb-4">
                  <c.icon className="w-6 h-6" />
                </div>
                <h2 className="font-semibold text-lg mb-1">{c.title}</h2>
                <p className="text-sm text-zinc-500 mb-4">{c.desc}</p>
                {c.href && c.display ? (
                  <a
                    href={c.href}
                    target={c.href.startsWith("http") ? "_blank" : undefined}
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-[#f97316] text-white px-5 py-2.5 rounded-full text-sm font-medium hover:bg-[#ea580c] transition-colors"
                  >
                    {c.display}
                  </a>
                ) : (
                  <p className="text-sm text-zinc-400">
                    {isRtl ? "غير متوفر حالياً" : "Not available yet"}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer locale={locale} />
    </>
  )
}
