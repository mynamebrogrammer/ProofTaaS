import { redirect } from "next/navigation";
import { supabaseRouteClient } from "@/lib/supabaseRoute";
import { supabaseServer } from "@/lib/supabaseServer";
import LogoutButton from "@/app/components/LogoutButton";
import { employerAccessFromStatuses } from "@/lib/employerAccess";
import OutreachButton from "@/app/components/OutreachButton";

type VRow = { vtype: string; status: string };
type CandidateRow = { id: string; display_name: string | null };
type OutreachRow = { candidate_profile_id: string };
type PhoneVerifRow = { profile_id: string; status: string };

export default async function EmployerCandidatesPage() {
  const supaAuth = supabaseRouteClient();
  const { data } = await supaAuth.auth.getUser();
  const user = data.user;
  if (!user) redirect("/sign-in");

  // Employer verification statuses (Explore/Engage gating)
  const { data: verifs, error } = await supabaseServer
    .from("verifications")
    .select("vtype,status")
    .eq("profile_id", user.id);

  if (error) redirect("/app/employer?blocked=candidates");

  const map = new Map<string, string>();
  (verifs ?? []).forEach((v: VRow) => map.set(v.vtype, v.status));
  const access = employerAccessFromStatuses(map);

  // Phase 1 gate (browse allowed)
  if (!access.canExplore) redirect("/app/employer?blocked=candidates");

  // Fetch candidates
  const { data: candidates, error: candErr } = await supabaseServer
    .from("profiles")
    .select("id,display_name")
    .eq("role", "CANDIDATE")
    .order("created_at", { ascending: false })
    .limit(50);

  if (candErr) {
    return (
      <div className="p-6 max-w-3xl">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold">Browse Candidates</h1>
          <LogoutButton />
        </div>
        <div className="mt-6 text-red-300">Failed to load candidates.</div>
      </div>
    );
  }

  const candidateIds = (candidates ?? []).map((c: CandidateRow) => c.id);

  // Candidate PHONE verification statuses
  const { data: phoneVerifs } = await supabaseServer
    .from("verifications")
    .select("profile_id,status")
    .in(
      "profile_id",
      candidateIds.length
        ? candidateIds
        : ["00000000-0000-0000-0000-000000000000"]
    )
    .eq("vtype", "PHONE");

  const phoneApproved = new Set<string>();
  (phoneVerifs ?? []).forEach((r: PhoneVerifRow) => {
    if (String(r.status).toUpperCase() === "APPROVED") {
      phoneApproved.add(r.profile_id);
    }
  });

  // Existing outreach (disable if already sent)
  const { data: alreadyOutreach } = await supabaseServer
    .from("outreach")
    .select("candidate_profile_id")
    .eq("employer_profile_id", user.id)
    .in(
      "candidate_profile_id",
      candidateIds.length
        ? candidateIds
        : ["00000000-0000-0000-0000-000000000000"]
    );

  const alreadySent = new Set<string>(
    (alreadyOutreach ?? []).map((r: OutreachRow) => r.candidate_profile_id)
  );

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Browse Candidates</h1>
        <LogoutButton />
      </div>

      <p className="mt-2 text-sm text-gray-400">
        {access.canEngage
          ? "Outreach is enabled. You can contact phone-verified candidates."
          : "Explore mode enabled. Outreach is locked until EIN + SOS are approved."}
      </p>

      {!access.canEngage && (
        <div className="mt-6 rounded border border-gray-700 p-4">
          <p className="text-sm text-gray-300">
            Complete your employer verification to unlock outreach.
          </p>
        </div>
      )}

      <div className="mt-8 space-y-4">
        {(candidates ?? []).map((candidate: CandidateRow) => {
          const isPhoneVerified = phoneApproved.has(candidate.id);
          const isSent = alreadySent.has(candidate.id);

          const disabled = !access.canEngage || !isPhoneVerified || isSent;

          return (
            <div
              key={candidate.id}
              className="border border-gray-700 rounded p-4 flex justify-between items-center"
            >
              <div>
                <h3 className="font-semibold">
                  {candidate.display_name || "Anonymous"}
                </h3>

                <p className="text-xs mt-1">
                  {isPhoneVerified ? (
                    <span className="text-green-400">✓ Phone Verified</span>
                  ) : (
                    <span className="text-gray-500">Phone not verified</span>
                  )}
                  {isSent ? (
                    <span className="text-blue-300 ml-2">• Sent</span>
                  ) : null}
                </p>
              </div>

              <OutreachButton
                candidateProfileId={candidate.id}
                disabled={disabled}
                initialLabel={isSent ? "Sent" : undefined}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
