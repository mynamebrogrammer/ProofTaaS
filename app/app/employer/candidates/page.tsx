import { redirect } from "next/navigation";
import { supabaseRouteClient } from "@/lib/supabaseRoute";
import { supabaseServer } from "@/lib/supabaseServer";
import LogoutButton from "@/app/components/LogoutButton";
import { employerAccessFromStatuses } from "@/lib/employerAccess";

type VRow = { vtype: string; status: string };

export default async function EmployerCandidatesPage() {
  const supaAuth = supabaseRouteClient();
  const { data } = await supaAuth.auth.getUser();
  const user = data.user;
  if (!user) redirect("/sign-in");

  const { data: verifs, error } = await supabaseServer
    .from("verifications")
    .select("vtype,status")
    .eq("profile_id", user.id);

  if (error) redirect("/app/employer?blocked=candidates");

  const map = new Map<string, string>();
  (verifs ?? []).forEach((v: VRow) => map.set(v.vtype, v.status));

  const access = employerAccessFromStatuses(map);

  // ✅ Phase 1 gate
  if (!access.canExplore) {
    redirect("/app/employer?blocked=candidates");
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Browse Candidates</h1>
        <LogoutButton />
      </div>

      <p className="mt-2 text-sm text-gray-400">
        Explore mode enabled. Next step: show candidate cards (resume + tags).
      </p>

      <div className="mt-6 rounded border border-gray-700 p-4">
        <div className="text-yellow-300 font-semibold">Read-only browsing ✅</div>
        <div className="mt-1 text-sm text-gray-400">
          Messaging is locked until EIN + SOS are approved.
        </div>
      </div>
    </div>
  );
}
