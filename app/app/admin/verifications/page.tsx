import { redirect } from "next/navigation";
import { supabaseRouteClient } from "@/lib/supabaseRoute";
import { supabaseServer } from "@/lib/supabaseServer";
import LogoutButton from "@/app/components/LogoutButton";
import { requireAdmin } from "@/lib/adminGuard";

type Row = {
  id: string;
  profile_id: string;
  vtype: string;
  status: string;
  submitted_at: string | null;
};

export default async function AdminVerificationsPage() {
  const supaAuth = supabaseRouteClient();
  const { data } = await supaAuth.auth.getUser();
  const user = data.user;
  if (!user) redirect("/sign-in");

  const admin = await requireAdmin(user.id);
  if (!admin.ok) {
    return (
      <div className="p-6 max-w-2xl">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold">Admin</h1>
          <LogoutButton />
        </div>
        <p className="mt-4 text-red-500">Forbidden</p>
      </div>
    );
  }

  const { data: rows, error } = await supabaseServer
    .from("verifications")
    .select("id,profile_id,vtype,status,submitted_at")
    .in("status", ["SUBMITTED", "PENDING"])
    .order("submitted_at", { ascending: false });

  if (error) {
    return (
      <div className="p-6">
        <pre className="text-red-400 whitespace-pre-wrap">
          {JSON.stringify(error, null, 2)}
        </pre>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Admin Verifications</h1>
        <LogoutButton />
      </div>

      <p className="mt-2 text-sm text-gray-500">
        Approve/reject submitted items to unlock Phase 2.
      </p>

      <div className="mt-6 space-y-3">
        {(rows ?? []).map((r: Row) => (
          <div
            key={r.id}
            className="rounded border border-gray-700 p-4 flex items-center justify-between"
          >
            <div>
              <div className="font-semibold">{r.vtype}</div>
              <div className="text-sm text-gray-500">
                profile: {r.profile_id}
              </div>
              <div className="text-sm text-gray-500">
                status: {r.status}{" "}
                {r.submitted_at ? `• submitted ${r.submitted_at}` : ""}
              </div>
            </div>

            <div className="flex gap-2">
              <form action="/api/admin/verification/decision" method="POST">
                <input type="hidden" name="id" value={r.id} />
                <input type="hidden" name="decision" value="APPROVED" />
                <button className="rounded bg-black text-white px-3 py-2 text-sm">
                  Approve
                </button>
              </form>

              <form action="/api/admin/verification/decision" method="POST">
                <input type="hidden" name="id" value={r.id} />
                <input type="hidden" name="decision" value="REJECTED" />
                <button className="rounded border px-3 py-2 text-sm">
                  Reject
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
