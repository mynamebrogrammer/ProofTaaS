import { supabaseRouteClient } from "@/lib/supabaseRoute";
import { supabaseServer } from "@/lib/supabaseServer";

export async function POST(req: Request) {
  const supaAuth = supabaseRouteClient();
  const { data: userData, error: userErr } = await supaAuth.auth.getUser();
  const user = userData.user;

  if (userErr || !user) return new Response("Not signed in", { status: 401 });

  // Ensure employer
  const { data: employerProfile, error: empErr } = await supabaseServer
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();

  if (empErr || !employerProfile) return new Response("Profile not found", { status: 404 });
  if (employerProfile.role !== "EMPLOYER") return new Response("Forbidden", { status: 403 });

  const body = await req.json().catch(() => ({}));
  const candidateProfileId = String(body?.candidateProfileId ?? "").trim();
  const message = typeof body?.message === "string" ? body.message.trim() : null;

  if (!candidateProfileId) {
    return new Response("Missing candidateProfileId", { status: 400 });
  }

  // 1) Employer phase gate (must be able to ENGAGE)
  const { data: evRows, error: evErr } = await supabaseServer
    .from("verifications")
    .select("vtype,status")
    .eq("profile_id", employerProfile.id);

  if (evErr) return new Response("Employer verification lookup failed", { status: 500 });

  const statusByVtype = new Map<string, string>();
  for (const r of evRows ?? []) statusByVtype.set(r.vtype, r.status);

  const access = employerAccessFromStatuses(statusByVtype);
  if (!access.canEngage) {
    return new Response("Employer not eligible for outreach yet", { status: 403 });
  }

  // 2) Candidate PHONE gate (must be APPROVED to receive outreach)
  const { data: candPhone, error: cErr } = await supabaseServer
    .from("verifications")
    .select("status")
    .eq("profile_id", candidateProfileId)
    .eq("vtype", "PHONE")
    .maybeSingle();

  if (cErr) return new Response("Candidate verification lookup failed", { status: 500 });

  if (!candPhone || String(candPhone.status).toUpperCase() !== "APPROVED") {
    return new Response("Candidate must be phone verified", { status: 403 });
  }

  // 3) Create outreach record (assumes you created outreach table + unique index)
  const { error: insErr } = await supabaseServer.from("outreach").insert({
    employer_profile_id: employerProfile.id,
    candidate_profile_id: candidateProfileId,
    message,
  });

  if (insErr) {
    // unique constraint (already reached out)
    if ((insErr as { code?: string })?.code === "23505") {
      return new Response("Already contacted this candidate", { status: 409 });
    }
    return new Response("Failed to create outreach", { status: 500 });
  }

  return Response.json({ ok: true });
}
export function employerAccessFromStatuses(statusByVtype: Map<string, string>) {
    return {
        canEngage: statusByVtype.get("EMAIL") === "APPROVED" && 
                             statusByVtype.get("PHONE") === "APPROVED",
    };
}

