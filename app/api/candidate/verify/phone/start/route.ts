import { supabaseRouteClient } from "@/lib/supabaseRoute";
import { supabaseServer } from "@/lib/supabaseServer";
import { twilio, verifySid } from "@/lib/twilioVerify";

function normalizePhone(phone: unknown) {
  return String(phone ?? "").trim();
}

const RESEND_COOLDOWN_SECONDS = 45;

export async function POST(req: Request) {
  const supaAuth = supabaseRouteClient();
  const { data: userData, error: userErr } = await supaAuth.auth.getUser();
  const user = userData.user;
  if (userErr || !user) return new Response("Not signed in", { status: 401 });

  // Role check
  const { data: profile, error: profErr } = await supabaseServer
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();

  if (profErr || !profile) return new Response("Profile not found", { status: 404 });
  if (profile.role !== "CANDIDATE") return new Response("Forbidden", { status: 403 });

  const body = await req.json().catch(() => ({}));
  const phone = normalizePhone(body?.phone);

  if (!phone || !phone.startsWith("+")) {
    return new Response("Phone must be E.164", { status: 400 });
  }

  // Fetch verification row
  const { data: existing, error: exErr } = await supabaseServer
    .from("verifications")
    .select("id,status")
    .eq("profile_id", profile.id)
    .eq("vtype", "PHONE")
    .maybeSingle();

  if (exErr) return new Response("Verification lookup failed", { status: 500 });

  if (existing && existing.status === "APPROVED") {
    return Response.json({ ok: true, alreadyVerified: true });
  }

  // Cooldown check
  if (existing?.id) {
    const { data: lastEv } = await supabaseServer
      .from("verification_evidence")
      .select("created_at")
      .eq("verification_id", existing.id)
      .eq("kind", "OTP_REQUEST")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastEv?.created_at) {
      const last = new Date(lastEv.created_at).getTime();
      const diffSec = (Date.now() - last) / 1000;
      if (diffSec < RESEND_COOLDOWN_SECONDS) {
        return new Response("Please wait before resending", { status: 429 });
      }
    }
  }

  // Upsert verification
  const { data: vrow, error: upErr } = await supabaseServer
    .from("verifications")
    .upsert(
      {
        profile_id: profile.id,
        vtype: "PHONE",
        status: "SUBMITTED",
        submitted_at: new Date().toISOString(),
      },
      { onConflict: "profile_id,vtype" }
    )
    .select("id")
    .single();

  if (upErr || !vrow) return new Response("Verification upsert failed", { status: 500 });

  try {
    const result = await twilio.verify.v2
      .services(verifySid)
      .verifications.create({ to: phone, channel: "sms" });

    const last4 = phone.slice(-4);

    await supabaseServer.from("verification_evidence").insert({
      verification_id: vrow.id,
      kind: "OTP_REQUEST",
      value: JSON.stringify({
        provider: "twilio",
        sid: result.sid,
        phone_e164: phone,
        last4,
      }),
    });

    return Response.json({ ok: true, last4 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("Twilio send failed:", message);
    return new Response("Failed to send code", { status: 400 });
  }
}
