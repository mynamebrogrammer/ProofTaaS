import { supabaseRouteClient } from "@/lib/supabaseRoute";
import { supabaseServer } from "@/lib/supabaseServer";
import { twilio, verifySid } from "@/lib/twilioVerify";

function normalizeCode(code: unknown) {
  return String(code ?? "").trim();
}

export async function POST(req: Request) {
  const supaAuth = supabaseRouteClient();
  const { data: userData, error: userErr } = await supaAuth.auth.getUser();
  const user = userData.user;
  if (userErr || !user) return new Response("Not signed in", { status: 401 });

  const { data: profile } = await supabaseServer
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "CANDIDATE") {
    return new Response("Forbidden", { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const code = normalizeCode(body?.code);

  if (!code || code.length < 4) {
    return new Response("Invalid code", { status: 400 });
  }

  const { data: vrow } = await supabaseServer
    .from("verifications")
    .select("id,status")
    .eq("profile_id", profile.id)
    .eq("vtype", "PHONE")
    .single();

  if (!vrow) return new Response("Verification missing", { status: 404 });

  if (vrow.status === "APPROVED") {
    return Response.json({ ok: true });
  }

  // Load latest OTP_REQUEST
  const { data: ev } = await supabaseServer
    .from("verification_evidence")
    .select("value")
    .eq("verification_id", vrow.id)
    .eq("kind", "OTP_REQUEST")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!ev?.value) {
    return new Response("No OTP request found", { status: 400 });
  }

  const parsed = JSON.parse(ev.value);
  const phone = parsed.phone_e164;

  try {
    const check = await twilio.verify.v2
      .services(verifySid)
      .verificationChecks.create({ to: phone, code });

    if (check.status !== "approved") {
      return new Response("Incorrect code", { status: 400 });
    }

    await supabaseServer
      .from("verifications")
      .update({
        status: "APPROVED",
        verified_at: new Date().toISOString(),
        verified_by: user.id,
      })
      .eq("id", vrow.id);

    await supabaseServer.from("verification_evidence").insert({
      verification_id: vrow.id,
      kind: "OTP_VERIFY",
      value: JSON.stringify({ provider: "twilio", sid: check.sid }),
    });

    return Response.json({ ok: true });
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : "Unknown error";
    console.error("Twilio verify failed:", errorMessage);
    return new Response("Verification failed", { status: 400 });
  }
}
