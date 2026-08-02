import { createServerSupabase } from "@/lib/supabase/server"

type AdminContext = {
  supabase: Awaited<ReturnType<typeof createServerSupabase>>
  userId: string
}

export class AdminAuthError extends Error {
  constructor(
    public status: number,
    public message: string
  ) {
    super(message)
  }
}

export async function requireAdmin(): Promise<AdminContext> {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new AdminAuthError(401, "Unauthorized")

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "admin") throw new AdminAuthError(403, "Forbidden")

  return { supabase, userId: user.id }
}