import { redirect } from "next/navigation";
import { supabaseRouteClient } from "@/lib/supabaseRoute";
import { supabaseServer } from "@/lib/supabaseServer";
import LogoutButton from "@/app/components/LogoutButton";

type VRow = {
  vtype: string;
  status: string;
};

const ORDER = [
  "EMAIL_DOMAIN",
  "WEBSITE",
  "EIN_LAST4",
  "SOS_REGISTRATION",
  "MANUAL_REVIEW",
];

function labelFor(vtype: string) {
  switch (vtype) {
    case "EMAIL_DOMAIN":
      return "Email domain";
    case "WEBSITE":
      return "Company website";
    case "EIN_LAST4":
      return "EIN (last 4)";
    case "SOS_REGISTRATION":
      return "State registration (SOS)";
    case "MANUAL_REVIEW":
      return "Manual review";
    default:
      return vtype;
  }
}

function badge(status: string) {
  const s = (status ?? "PENDING").toUpperCase();
  if (s === "APPROVED") return { text: "Approved", cls: "text-green-400" };
  if (s === "REJECTED") return { text: "Rejected", cls: "text-red-400" };
  if (s === "SUBMITTED") return { text: "Submitted", cls: "text-yellow-300" };
  return { text: "Pending", cls: "text-gray-300" };
}

export default async function EmployerDashboard() {
  // Auth guard
  const supaAuth = supabaseRouteClient();
  const { data } = await supaAuth.auth.getUser();
  const user = data.user;
  if (!user) redirect("/sign-in");

  // Pull all verification rows for this profile
  const { data: verifs, error } = await supabaseServer
    .from("verifications")
    .select("vtype,status")
    .eq("profile_id", user.id);

  if (error) {
    return (
      <div className="p-6 max-w-2xl">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold">Employer Dashboard</h1>
          <LogoutButton />
        </div>

        <pre className="mt-4 text-sm text-red-400 whitespace-pre-wrap">
          {JSON.stringify(error, null, 2)}
        </pre>
      </div>
    );
  }

  const map = new Map<string, string>();
  (verifs ?? []).forEach((v: any) => map.set(v.vtype, v.status));

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Employer Dashboard</h1>
        <LogoutButton />
      </div>

      <p className="mt-2 text-sm text-gray-400">
        Complete verification to unlock outreach and job posting.
      </p>

      <div className="mt-6 rounded border border-gray-700 p-4">
        <h2 className="text-lg font-semibold">Verification status</h2>

        <ul className="mt-3 space-y-2">
          {ORDER.map((vtype) => {
            const status = map.get(vtype) ?? "PENDING";
            const b = badge(status);
            return (
              <li
                key={vtype}
                className="flex items-center justify-between rounded border border-gray-800 px-3 py-2"
              >
                <span className="text-sm">{labelFor(vtype)}</span>
                <span className={`text-sm font-semibold ${b.cls}`}>
                  {b.text}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
