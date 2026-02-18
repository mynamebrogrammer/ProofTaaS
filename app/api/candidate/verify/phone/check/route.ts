import { supabaseRouteClient } from "@/lib/supabaseRoute";
import { supabaseServer } from "@/lib/supabaseServer";
import { twilio, verifySid } from "@/lib/twilioVerify";

function normalizePhone(phone: string) {
  return (phone ?? "").trim();
}

function normalizeCode(code: string) {
  return String(code ?? "").trim();
}

export async function POST(req: Request) {
  const supaAuth = supabaseRouteClient();
  const { data: userData, error: userErr } = await supaAuth.auth.getUser();
  const user = userData.user;
  if (userErr || !user) return new Response("Not signed in", { status: 401 });

  const { data: profile } = await supabaseServer
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile) return new Response("Profile not found", { status: 404 });
  if (profile.role !== "CANDIDATE") return new Response("Forbidden", { status: 403 });

  const body = await req.json().catch(() => ({}));
  const phone = normalizePhone(body?.phone);
  const code = normalizeCode(body?.code);

  if (!phone || !phone.startsWith("+")) {
    return new Response("Phone must be E.164", { status: 400 });
  }
  if (!code || code.length < 4) {
    return new Response("Invalid code", { status: 400 });
  }

  // Find PHONE verification row
  const { data: vrow, error: vErr } = await supabaseServer
    .from("verifications")
    .select("id,status")
    .eq("user_id", user.id)
    .eq("vtype", "PHONE")
    .single();

  if (vErr || !vrow) return new Response("PHONE verification missing", { status: 404 });

  try {
    const check = await twilio.verify.v2
      .services(verifySid)
      .verificationChecks.create({ to: phone, code });

    if (check.status !== "approved") {
      await supabaseServer.from("verification_evidence").insert({
        verification_id: vrow.id,
        kind: "OTP_FAILED",
        data: { provider: "twilio", status: check.status },
      });
      return new Response("Incorrect code", { status: 400 });
    }

    // Approve PHONE
    const { error: updErr } = await supabaseServer
      .from("verifications")
      .update({ status: "APPROVED" })
      .eq("id", vrow.id);

    if (updErr) return new Response("Failed to update status", { status: 500 });

    const last4 = phone.slice(-4);
    await supabaseServer.from("verification_evidence").insert({
      verification_id: vrow.id,
      kind: "OTP_VERIFY",
      data: { provider: "twilio", status: "approved", last4, sid: check.sid },
    });

    return Response.json({ ok: true });
  } catch {
    return new Response("Verification failed", { status: 400 });
  }
}
