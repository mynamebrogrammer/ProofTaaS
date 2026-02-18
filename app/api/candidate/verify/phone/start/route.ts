import { supabaseRouteClient } from "@/lib/supabaseRoute";
import { supabaseServer } from "@/lib/supabaseServer";
import { twilio, verifySid } from "@/lib/twilioVerify";

function normalizePhone(phone: string) {
  // MVP: basic trim; you can improve with libphonenumber-js later
  return (phone ?? "").trim();
}

export async function POST(req: Request) {
  const supaAuth = supabaseRouteClient();
  const { data: userData, error: userErr } = await supaAuth.auth.getUser();
  const user = userData.user;
  if (userErr || !user) return new Response("Not signed in", { status: 401 });

  // Ensure role is CANDIDATE
  const { data: profile, error: profErr } = await supabaseServer
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profErr || !profile) return new Response("Profile not found", { status: 404 });
  if (profile.role !== "CANDIDATE") return new Response("Forbidden", { status: 403 });

  const body = await req.json().catch(() => ({}));
  const phone = normalizePhone(body?.phone);
  if (!phone || !phone.startsWith("+")) {
    return new Response("Phone must be E.164 (e.g. +1818...)", { status: 400 });
  }

  // Ensure PHONE verification row exists / mark submitted
  const { data: vrow, error: vUpErr } = await supabaseServer
    .from("verifications")
    .upsert(
      { user_id: user.id, vtype: "PHONE", status: "SUBMITTED" },
      { onConflict: "user_id,vtype" }
    )
    .select("id")
    .single();

  if (vUpErr || !vrow) return new Response("Verification upsert failed", { status: 500 });

  // Request OTP from Twilio Verify
  try {
    const result = await twilio.verify.v2
      .services(verifySid)
      .verifications.create({ to: phone, channel: "sms" });

    // Optional: store evidence that OTP was requested (no PII beyond last4)
    const last4 = phone.slice(-4);
    await supabaseServer.from("verification_evidence").insert({
      verification_id: vrow.id,
      kind: "OTP_REQUEST",
      data: { provider: "twilio", channel: "sms", last4, sid: result.sid },
    });

    return Response.json({ ok: true });
  } catch {
    // Twilio errors can be user-facing but keep it generic
    return new Response("Failed to send code", { status: 400 });
  }
}
