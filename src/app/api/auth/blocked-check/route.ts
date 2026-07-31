import { NextResponse } from "next/server"
import { createServerSupabase } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ loggedIn: false, blocked: false })

    const { data: profile } = await supabase
      .from("profiles")
      .select("blocked")
      .eq("id", user.id)
      .single()

    return NextResponse.json({ loggedIn: true, blocked: !!profile?.blocked })
  } catch {
    return NextResponse.json({ loggedIn: false, blocked: false })
  }
}
