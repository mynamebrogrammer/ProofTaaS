import { redirect } from "next/navigation";
import LogoutButton from "@/app/components/LogoutButton";
import { supabaseRouteClient } from "@/lib/supabaseRoute";
import { supabaseServer } from "@/lib/supabaseServer";
import Link from "next/link";

type VRow = { vtype: string; status: string };

const ORDER = ["PHONE", "GOV_ID", "MANUAL_REVIEW"] as const;

function label(vtype: string) {
  switch (vtype) {
    case "PHONE":
      return "Phone";
    case "GOV_ID":
      return "Government ID";
    case "MANUAL_REVIEW":
      return "Manual review";
    default:
      return vtype;
  }
}

export default async function CandidateVerificationsPage() {
  const supaAuth = supabaseRouteClient();
  const { data } = await supaAuth.auth.getUser();
  const user = data.user;
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabaseServer
    .from("profiles")
    .select("role, display_name")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "CANDIDATE") redirect("/app");

  const { data: verifs } = await supabaseServer
    .from("verifications")
    .select("vtype,status")
    .eq("profile_id", user.id);

  const map = new Map<string, string>();
  (verifs ?? []).forEach((v: VRow) => map.set(v.vtype, v.status));

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Candidate Verification</h1>
        <LogoutButton />
      </div>

      <p className="mt-2 text-sm text-gray-400">
        Verify your phone to become eligible for employer outreach.
      </p>

      <div className="mt-6 rounded border border-gray-800 overflow-hidden">
        {ORDER.map((k) => {

          const status = (map.get(k) ?? "PENDING").toUpperCase();


          const action =
            k === "PHONE" ? (
                status === "APPROVED" ? (
                    <span className="text-green-400">Verified</span>
                ) : (
              <Link className="underline" href="/app/candidate/verify/phone">
                Verify
              </Link>
                )
            ) : (
              <span className="text-gray-500">Coming soon</span>
            );

          return (
            <div key={k} className="flex items-center justify-between px-4 py-3 border-b border-gray-800 last:border-b-0">
              <div>{label(k)}</div>
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-300">{action}</div>
                <div className="text-sm">
                  {status === "APPROVED" ? (
                    <span className="text-green-400">Approved</span>
                  ) : status === "SUBMITTED" ? (
                    <span className="text-yellow-300">Submitted</span>
                  ) : (
                    <span className="text-gray-400">Pending</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
