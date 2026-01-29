import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabaseServer";
import { supabaseRouteClient } from "@/lib/supabaseRoute";

type Role = "EMPLOYER" | "CANDIDATE";

export default async function AppEntry() {
  const supaAuth = supabaseRouteClient();
  const { data: userData, error: userErr } = await supaAuth.auth.getUser();
  const user = userData.user;

  if (userErr || !user) redirect("/sign-in");

  const { data: profile, error: profileErr } = await supabaseServer
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  // If profile doesn't exist yet, send them to bootstrap/onboarding
  if (profileErr || !profile) {
    const metaRole = (user.user_metadata?.role as Role | undefined) ?? "EMPLOYER";
    redirect(`/post-signup?role=${metaRole}`);
  }

  if (profile.role === "EMPLOYER") redirect("/app/employer");
  redirect("/app/candidate");
}
