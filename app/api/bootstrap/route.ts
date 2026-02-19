import { supabaseRouteClient } from "@/lib/supabaseRoute";
import { supabaseServer } from "@/lib/supabaseServer";

type Role = "EMPLOYER" | "CANDIDATE";

export async function POST(req: Request) {
  const supaAuth = supabaseRouteClient();
  const { data: userData, error: userErr } = await supaAuth.auth.getUser();
  const user = userData.user;

  if (userErr || !user) return new Response("Not signed in", { status: 401 });

  const body = await req.json().catch(() => ({}));
  const role = body?.role as Role;

  if (role !== "EMPLOYER" && role !== "CANDIDATE") {
    return new Response("Invalid role", { status: 400 });
  }

  // 1) Ensure profile exists
  const { error: profileErr } = await supabaseServer
    .from("profiles")
    .upsert({ id: user.id, role }, { onConflict: "id" });

  if (profileErr) return Response.json(profileErr, { status: 500 });

  // 2) Role-specific row + seed verifications
  if (role === "EMPLOYER") {
    const company_name = String(body?.company_name ?? "").trim();
    if (!company_name) return new Response("company_name is required", { status: 400 });
    if (!user.email) return new Response("Missing user.email", { status: 400 });

    const email_domain = user.email.split("@")[1]?.toLowerCase() ?? null;

    const { data: existing, error: selErr } = await supabaseServer
      .from("employers")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (selErr) return Response.json(selErr, { status: 500 });

    let employerId: string;

    if (!existing) {
      const { data: created, error: insErr } = await supabaseServer
        .from("employers")
        .insert({
          owner_id: user.id,
          company_name,
          company_email: user.email,
          email_domain,
        })
        .select("id")
        .single();

      if (insErr) return Response.json(insErr, { status: 500 });
      employerId = created.id;
    } else {
      employerId = existing.id;
    }

    // ✅ Seed verifications (idempotent) — ALWAYS include status
    const now = new Date().toISOString();

    const { error: vErr } = await supabaseServer.from("verifications").upsert(
      [
        {
          profile_id: user.id,
          vtype: "EMAIL_DOMAIN",
          status: "APPROVED",
          verified_at: now,
          verified_by: null, // system
        },
        { profile_id: user.id, vtype: "WEBSITE", status: "PENDING" },
        { profile_id: user.id, vtype: "EIN_LAST4", status: "PENDING" },
        { profile_id: user.id, vtype: "SOS_REGISTRATION", status: "PENDING" },
        { profile_id: user.id, vtype: "MANUAL_REVIEW", status: "PENDING" },
      ],
      { onConflict: "profile_id,vtype" }
    );

    if (vErr) return Response.json(vErr, { status: 500 });

    return Response.json({ ok: true, role, employerId });
  }

  // Candidate
  const { data: existingCand, error: selErr } = await supabaseServer
    .from("candidates")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (selErr) return Response.json(selErr, { status: 500 });

  let candidateId: string;

  if (!existingCand) {
    const full_name = String(body?.full_name ?? "New Candidate").trim();

    const { data: created, error: insErr } = await supabaseServer
      .from("candidates")
      .insert({ owner_id: user.id, full_name })
      .select("id")
      .single();

    if (insErr) return Response.json(insErr, { status: 500 });
    candidateId = created.id;
  } else {
    candidateId = existingCand.id;
  }

  // ✅ Seed candidate verifications (idempotent)
  const { error: vErr } = await supabaseServer.from("verifications").upsert(
    [
      { profile_id: user.id, vtype: "GOV_ID", status: "PENDING" },
      { profile_id: user.id, vtype: "PHONE", status: "PENDING" },
      { profile_id: user.id, vtype: "MANUAL_REVIEW", status: "PENDING" },
    ],
    { onConflict: "profile_id,vtype" }
  );

  if (vErr) return Response.json(vErr, { status: 500 });

  return Response.json({ ok: true, role, candidateId });
}
