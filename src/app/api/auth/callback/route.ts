import { NextRequest, NextResponse } from "next/server"
import { createServerSupabase } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/"

  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/"

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
          return NextResponse.redirect(new URL("/auth?blocked=1", origin))
        }
      }
      return NextResponse.redirect(new URL(safeNext, origin))
    }
  }

  return NextResponse.redirect(new URL("/", origin))
}
