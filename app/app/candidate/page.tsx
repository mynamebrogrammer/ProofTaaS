import { redirect } from "next/navigation";
import { supabaseRouteClient } from "@/lib/supabaseRoute";
import LogoutButton from "@/app/components/LogoutButton";
import Link from "next/link";


export default async function CandidateDashboard() {
  const supaAuth = supabaseRouteClient();
  const { data } = await supaAuth.auth.getUser();
  if (!data.user) redirect("/sign-in");

  return (
    <div className="p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Candidate Dashboard</h1>
        <LogoutButton />
</div>

<Link className="underline" href="/app/candidate/verifications">
  Verify your account
</Link>


      <p className="mt-2 text-sm text-gray-600">
        Next: resume upload + verification + profile completion.
      </p>
    </div>
  );
}
