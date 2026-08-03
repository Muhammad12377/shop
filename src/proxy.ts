import { NextRequest, NextResponse } from "next/server"

const SUPABASE_AUTH_COOKIE = "sb-abuhwixkskepdpqtsdsg-auth-token"
const SUPABASE_AUTH_COOKIE_REGEX = /^sb-abuhwixkskepdpqtsdsg-auth-token(\.\d+)?$/
const LOCALES = ["en", "ar"]
const DEFAULT_LOCALE = "en"

function isAdminPath(pathname: string): boolean {
  return pathname.includes("/admin")
}

function isAdminApi(pathname: string): boolean {
  return pathname.startsWith("/api/admin") || pathname.startsWith("/admin/")
}

function detectLocale(pathname: string): string {
  const first = pathname.split("/")[1]
  return LOCALES.includes(first) ? first : DEFAULT_LOCALE
}

function hasSessionCookie(request: NextRequest): boolean {
  return request.cookies.getAll().some((cookie) =>
    SUPABASE_AUTH_COOKIE_REGEX.test(cookie.name)
  )
}

function buildAuthRedirect(request: NextRequest, locale: string): NextResponse {
  const { pathname, origin, search } = request.nextUrl
  const nextPath = pathname.startsWith(`/${locale}`) ? pathname : `/${locale}${pathname}`
  const next = `${nextPath}${search || ""}`
  return NextResponse.redirect(
    new URL(`/${locale}/auth?next=${encodeURIComponent(next)}`, origin)
  )
}

export function proxy(request: NextRequest) {
  const { pathname, origin } = request.nextUrl

  if (!isAdminPath(pathname) && !isAdminApi(pathname)) {
    return NextResponse.next()
  }

  if (!hasSessionCookie(request)) {
    const isApi = pathname.startsWith("/api/admin")
    if (isApi) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: { "content-type": "application/json" } }
      )
    }
    const locale = detectLocale(pathname)
    return buildAuthRedirect(request, locale)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*", "/:locale/admin/:path*", "/api/admin/:path*"],
}
