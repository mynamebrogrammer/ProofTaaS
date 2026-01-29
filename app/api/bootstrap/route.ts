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

  if (profileErr) {
    return Response.json(profileErr, { status: 500 });
  }

  // 2) Role-specific row + seed verifications
  if (role === "EMPLOYER") {
    const company_name = String(body?.company_name ?? "").trim();
    if (!company_name) return new Response("company_name is required", { status: 400 });
    if (!user.email) return new Response("Missing user.email", { status: 400 });

    const { data: existing, error: selErr } = await supabaseServer
      .from("employers")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (selErr) return Response.json(selErr, { status: 500 });

    if (!existing) {
      const email_domain = user.email.split("@")[1]?.toLowerCase() ?? null;

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

      const { error: vErr } = await supabaseServer.from("verifications").upsert(
    [
      { profile_id: user.id, vtype: "EMAIL_DOMAIN" },
      { profile_id: user.id, vtype: "WEBSITE" },
      { profile_id: user.id, vtype: "EIN_LAST4" },
      { profile_id: user.id, vtype: "SOS_REGISTRATION" },
      { profile_id: user.id, vtype: "MANUAL_REVIEW" },
    ],
    { onConflict: "profile_id,vtype" }
  );

  if (vErr) return Response.json(vErr, { status: 500 });


      return Response.json({ ok: true, role, employerId: created.id });
    }

    const { error: vErr } = await supabaseServer.from("verifications").upsert(
    [
      { profile_id: user.id, vtype: "EMAIL_DOMAIN" },
      { profile_id: user.id, vtype: "WEBSITE" },
      { profile_id: user.id, vtype: "EIN_LAST4" },
      { profile_id: user.id, vtype: "SOS_REGISTRATION" },
      { profile_id: user.id, vtype: "MANUAL_REVIEW" },
    ],
    { onConflict: "profile_id,vtype" }
  );

  if (vErr) return Response.json(vErr, { status: 500 });

    return Response.json({ ok: true, role, employerId: existing.id });
  }

  // Candidate
  const { data: existingCand, error: selErr } = await supabaseServer
    .from("candidates")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (selErr) return Response.json(selErr, { status: 500 });

  if (!existingCand) {
    const full_name = String(body?.full_name ?? "New Candidate").trim();

    const { data: created, error: insErr } = await supabaseServer
      .from("candidates")
      .insert({ owner_id: user.id, full_name })
      .select("id")
      .single();

    if (insErr) return Response.json(insErr, { status: 500 });

    const { error: vErr } = await supabaseServer.from("verifications").upsert(
  [
    { profile_id: user.id, vtype: "GOV_ID" },
    { profile_id: user.id, vtype: "PHONE" },
    { profile_id: user.id, vtype: "MANUAL_REVIEW" },
  ],
  { onConflict: "profile_id,vtype" }
);

if (vErr) return Response.json(vErr, { status: 500 });


    return Response.json({ ok: true, role, candidateId: created.id });
  }

  const { error: vErr } = await supabaseServer.from("verifications").upsert(
  [
    { profile_id: user.id, vtype: "GOV_ID" },
    { profile_id: user.id, vtype: "PHONE" },
    { profile_id: user.id, vtype: "MANUAL_REVIEW" },
  ],
  { onConflict: "profile_id,vtype" }
);

if (vErr) return Response.json(vErr, { status: 500 });


  return Response.json({ ok: true, role, candidateId: existingCand.id });
}
