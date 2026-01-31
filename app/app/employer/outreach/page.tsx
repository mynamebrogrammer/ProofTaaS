import { redirect } from "next/navigation";
import { supabaseRouteClient } from "@/lib/supabaseRoute";
import { supabaseServer } from "@/lib/supabaseServer";
import LogoutButton from "@/app/components/LogoutButton";
import { employerAccessFromStatuses } from "@/lib/employerAccess";

type VRow = { vtype: string; status: string };

export default async function EmployerOutreachPage() {
  const supaAuth = supabaseRouteClient();
  const { data } = await supaAuth.auth.getUser();
  const user = data.user;
  if (!user) redirect("/sign-in");

  const { data: verifs, error } = await supabaseServer
    .from("verifications")
    .select("vtype,status")
    .eq("profile_id", user.id);

  if (error) redirect("/app/employer?blocked=outreach");

  const map = new Map<string, string>();
  (verifs ?? []).forEach((v: VRow) => map.set(v.vtype, v.status));

  const access = employerAccessFromStatuses(map);

  // ✅ Phase 2 gate
  if (!access.canEngage) {
    redirect("/app/employer?blocked=outreach");
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Outreach</h1>
        <LogoutButton />
      </div>

      <p className="mt-2 text-sm text-gray-400">
        Outreach is enabled. Next step: messaging UI + candidate outreach limits.
      </p>

      <div className="mt-6 rounded border border-gray-700 p-4">
        <div className="text-green-400 font-semibold">Phase 2 verified ✅</div>
        <div className="mt-1 text-sm text-gray-400">
          You can now message candidates (coming soon).
        </div>
      </div>
    </div>
  );
}
