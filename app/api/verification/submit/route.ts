import { supabaseRouteClient } from "@/lib/supabaseRoute";
import { supabaseServer } from "@/lib/supabaseServer";

type VType = "EIN_LAST4" | "SOS_REGISTRATION" | "WEBSITE";
type Role = "EMPLOYER" | "CANDIDATE";

function bad(msg: string, status = 400) {
  return new Response(msg, { status });
}

export async function POST(req: Request) {
  const supaAuth = supabaseRouteClient();
  const { data: userData, error: userErr } = await supaAuth.auth.getUser();
  const user = userData.user;

  if (userErr || !user) return bad("Not signed in", 401);

  const body = await req.json().catch(() => ({}));
  const vtype = body?.vtype as VType;
  const value = String(body?.value ?? "").trim();

  // Allow EIN + SOS for now (Website later)
  if (vtype !== "EIN_LAST4" && vtype !== "SOS_REGISTRATION") {
    return bad("Unsupported verification type", 400);
  }

  // Validation
  if (vtype === "EIN_LAST4") {
    if (!/^\d{4}$/.test(value)) {
      return bad("EIN_LAST4 must be exactly 4 digits", 400);
    }
  }

  if (vtype === "SOS_REGISTRATION") {
    // Expect "STATE|REGNUMBER"
    const [stRaw, rnRaw] = value.split("|");
    const st = (stRaw ?? "").trim().toUpperCase();
    const rn = (rnRaw ?? "").trim();

    if (!st || !rn) return bad("SOS_REGISTRATION value must be STATE|REGNUMBER", 400);
    if (!/^[A-Z]{2}$/.test(st)) return bad("Invalid state code", 400);
    if (rn.length < 4) return bad("Registration number too short", 400);
  }

  // Ensure employer
  const { data: profile, error: profErr } = await supabaseServer
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profErr) return Response.json(profErr, { status: 500 });
  if (!profile) return bad("Profile not found", 400);
  if ((profile.role as Role) !== "EMPLOYER") {
    return bad("Only employers can submit verification", 403);
  }

  // Ensure verification row exists + mark SUBMITTED (idempotent)
  const now = new Date().toISOString();

  const { data: vRow, error: vErr } = await supabaseServer
    .from("verifications")
    .upsert(
      {
        profile_id: user.id,
        vtype, // ✅ IMPORTANT: use the actual vtype
        status: "SUBMITTED",
        submitted_at: now,
      },
      { onConflict: "profile_id,vtype" }
    )
    .select("id")
    .single();

  if (vErr || !vRow) {
    return Response.json(vErr ?? { message: "Verification upsert failed" }, { status: 500 });
  }

  // Store latest evidence (requires unique(verification_id, kind))
  const { error: evErr } = await supabaseServer.from("verification_evidence").upsert(
    {
      verification_id: vRow.id,
      kind: vtype, // ✅ IMPORTANT: store kind = the same vtype
      value,
    },
    { onConflict: "verification_id,kind" }
  );

  if (evErr) return Response.json(evErr, { status: 500 });

  return Response.json({ ok: true });
}
