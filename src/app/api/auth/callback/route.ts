import { NextRequest, NextResponse } from "next/server"
import { createServerSupabase } from "@/lib/supabase/server"

const LOCALES = ["en", "ar"]
const DEFAULT_LOCALE = "en"

function isSafeLocalPath(value: string, origin: string) {
  if (!value.startsWith("/") || value.startsWith("//")) return false
  try {
    const resolved = new URL(value, origin)
    return resolved.origin === origin && !resolved.href.includes("\\")
  } catch {
    return false
  }
}

function detectLocale(value: string): string {
  const first = value.split("/")[1]
  return LOCALES.includes(first) ? first : DEFAULT_LOCALE
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/"

  const safeNext = isSafeLocalPath(next, origin) ? next : "/"
  const locale = detectLocale(safeNext)

  if (code) {
    const supabase = await createServerSupabase()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("blocked")
          .eq("id", user.id)
          .single()
        if (profile?.blocked) {
          await supabase.auth.signOut()
          return NextResponse.redirect(new URL(`/${locale}/auth?blocked=1`, origin))
        }
      }
      return NextResponse.redirect(new URL(safeNext, origin))
    }
  }

  return NextResponse.redirect(new URL(`/${locale}`, origin))
}
