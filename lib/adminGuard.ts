import { supabaseServer } from "@/lib/supabaseServer";

export async function requireAdmin(userId: string) {
  const { data: profile, error } = await supabaseServer
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .maybeSingle();

  if (error) return { ok: false as const, status: 500 as const, error };
  if (!profile) return { ok: false as const, status: 403 as const, error: { message: "Profile not found" } };
  if (!profile.is_admin) return { ok: false as const, status: 403 as const, error: { message: "Forbidden" } };

  return { ok: true as const };
}
