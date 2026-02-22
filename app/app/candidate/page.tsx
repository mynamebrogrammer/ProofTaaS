import { redirect } from "next/navigation";
import { supabaseRouteClient } from "@/lib/supabaseRoute";
import { supabaseServer } from "@/lib/supabaseServer";
import LogoutButton from "@/app/components/LogoutButton";
import Link from "next/link";

export default async function CandidateDashboard() {
  const supaAuth = supabaseRouteClient();
  const { data } = await supaAuth.auth.getUser();
  const user = data.user;

  if (!user) redirect("/sign-in");

  const { data: profile } = await supabaseServer
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "CANDIDATE") {
    redirect("/app");
  }

  const { data: verifs } = await supabaseServer
    .from("verifications")
    .select("vtype,status")
    .eq("profile_id", user.id);

  const phoneStatus =
    verifs?.find((v) => v.vtype === "PHONE")?.status ?? "PENDING";

  const isVerified = phoneStatus.toUpperCase() === "APPROVED";

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Candidate Dashboard</h1>
        <LogoutButton />
      </div>

      {isVerified ? (
        <div className="mt-6 rounded border border-gray-800 p-4">
          <div className="text-green-400 font-semibold">
            Phone Verified ✅
          </div>
          <div className="mt-2 text-sm text-gray-400">
            You are eligible to receive employer outreach.
          </div>
          <Link
            className="inline-block mt-3 underline"
            href="/app/candidate/verifications"
          >
            View verification details
          </Link>
        </div>
      ) : (
        <div className="mt-6 rounded border border-gray-800 p-4">
          <div className="text-yellow-300 font-semibold">
            Verification Required
          </div>
          <div className="mt-2 text-sm text-gray-400">
            Verify your phone to become eligible for employer outreach.
          </div>
          <Link
            className="inline-block mt-3 underline"
            href="/app/candidate/verifications"
          >
            Verify your account
          </Link>
        </div>
      )}
    </div>
  );
}