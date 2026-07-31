import { NextResponse } from "next/server"
import { revalidateTag } from "next/cache"
import { createServerSupabase } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
    if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const { data, error } = await supabase.from("settings").select("*").single()
    if (error && error.code !== "PGRST116") return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data || {})
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
    if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const body = await req.json()
    const { data: existing } = await supabase.from("settings").select("id").single()

    let result
    if (existing) {
      result = await supabase.from("settings").update(body).eq("id", existing.id).select().single()
    } else {
      result = await supabase.from("settings").insert(body).select().single()
    }

    if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 })
    revalidateTag("home", "max")
    return NextResponse.json(result.data)
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
