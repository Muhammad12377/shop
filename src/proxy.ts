import { NextRequest, NextResponse } from "next/server"

const SUPABASE_AUTH_COOKIE = "sb-abuhwixkskepdpqtsdsg-auth-token"

function isAdminPath(pathname: string): boolean {
  return pathname.includes("/admin")
}

function isAdminApi(pathname: string): boolean {
  return pathname.startsWith("/api/admin") || pathname.startsWith("/admin/")
}

export function proxy(request: NextRequest) {
  const { pathname, origin } = request.nextUrl

  if (!isAdminPath(pathname) && !isAdminApi(pathname)) {
    return NextResponse.next()
  }

  const sessionCookie = request.cookies.get(SUPABASE_AUTH_COOKIE)?.value
  if (!sessionCookie) {
    const isApi = pathname.startsWith("/api/admin")
    if (isApi) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: { "content-type": "application/json" } }
      )
    }
    return NextResponse.redirect(new URL("/auth", origin))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*", "/:locale/admin/:path*", "/api/admin/:path*"],
}