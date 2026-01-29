import { redirect } from "next/navigation";
import { supabaseRouteClient } from "@/lib/supabaseRoute";
import LogoutButton from "@/app/components/LogoutButton";


export default async function EmployerDashboard() {
  const supaAuth = supabaseRouteClient();
  const { data } = await supaAuth.auth.getUser();
  if (!data.user) redirect("/sign-in");

  return (
    <div className="p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Employer Dashboard</h1>
        <LogoutButton />
      </div>

      <p className="mt-2 text-sm text-gray-600">
        Next: verification checklist + create first job + browse candidates.
      </p>
    </div>
  );
}
