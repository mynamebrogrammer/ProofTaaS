import { supabaseRouteClient } from "@/lib/supabaseRoute";
import { supabaseServer } from "@/lib/supabaseServer";
import { requireAdmin } from "@/lib/adminGuard";

function bad(msg: string, status = 400) {
  return new Response(msg, { status });
}

export async function POST(req: Request) {
  const supaAuth = supabaseRouteClient();
  const { data } = await supaAuth.auth.getUser();
  const user = data.user;
  if (!user) return bad("Not signed in", 401);

  const admin = await requireAdmin(user.id);
  if (!admin.ok) return bad("Forbidden", 403);

  const form = await req.formData();
  const id = String(form.get("id") ?? "");
  const decision = String(form.get("decision") ?? "").toUpperCase();

  if (!id) return bad("Missing id", 400);
  if (decision !== "APPROVED" && decision !== "REJECTED") {
    return bad("Invalid decision", 400);
  }

  const { error } = await supabaseServer
    .from("verifications")
    .update({
      status: decision,
      verified_at: new Date().toISOString(),
      verified_by: user.id,
    })
    .eq("id", id);

  if (error) return Response.json(error, { status: 500 });

  // Redirect back to admin list
  return new Response(null, {
    status: 303,
    headers: { Location: "/app/admin/verifications" },
  });
}
