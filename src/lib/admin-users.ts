import { createAdminClient } from "@/lib/supabase/admin"

export type VerifiedUserInfo = {
  email: string
  provider: "google" | "otp" | "unverified"
}

export async function fetchVerifiedAuthUsers(): Promise<{
  providersByEmail: Map<string, "google" | "otp" | "unverified">
  verified: VerifiedUserInfo[]
}> {
  const admin = createAdminClient()
  const { data: authUsers, error: authError } = await admin.auth.admin.listUsers({ perPage: 1000 })
  if (authError) throw new Error(authError.message)

  const providersByEmail = new Map<string, "google" | "otp" | "unverified">()
  const verified: VerifiedUserInfo[] = []
  for (const u of authUsers?.users || []) {
    if (!u.email) continue
    const provider =
      u.app_metadata?.provider === "google" ||
      (Array.isArray(u.identities) && u.identities.some((i: any) => i.provider === "google"))
        ? "google"
        : u.email_confirmed_at
          ? "otp"
          : "unverified"
    providersByEmail.set(u.email.toLowerCase(), provider)
    if (provider !== "unverified") verified.push({ email: u.email.toLowerCase(), provider })
  }
  return { providersByEmail, verified }
}
