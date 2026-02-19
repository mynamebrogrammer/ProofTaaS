"use client";

import { useState } from "react";
import Link from "next/link";

export default function CandidatePhoneVerifyPage() {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"idle" | "sent" | "verified">("idle");
  const [last4, setLast4] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function sendCode() {
    setMsg(null);
    setLoading(true);
    try {
      const res = await fetch("/api/candidate/verify/phone/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });

      const text = await res.text();
      if (!res.ok) {
        setMsg(text || "Failed to send code");
        return;
      }

      // If your start returns JSON with last4:
      try {
        const j = JSON.parse(text);
        if (j?.last4) setLast4(j.last4);
      } catch {
        // ignore
      }

      setStage("sent");
      setMsg("Code sent.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode() {
    setMsg(null);
    setLoading(true);
    try {
      const res = await fetch("/api/candidate/verify/phone/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      const text = await res.text();
      if (!res.ok) {
        setMsg(text || "Verification failed");
        return;
      }

      setStage("verified");
      setMsg("Phone verified ✅");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-md">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Verify phone</h1>
        <Link className="underline" href="/app/candidate/verifications">
          Back
        </Link>
      </div>

      <p className="mt-2 text-sm text-gray-400">
        Enter your phone in E.164 format (example: +18185551234).
      </p>

      {stage !== "verified" && (
        <>
          <div className="mt-6 space-y-3">
            <input
              className="w-full rounded border border-gray-700 bg-transparent p-2"
              placeholder="+18185551234"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={stage !== "idle"}
            />

            <button
              onClick={sendCode}
              disabled={loading || stage !== "idle"}
              className="rounded bg-white/10 px-4 py-2 disabled:opacity-50"
            >
              {loading && stage === "idle" ? "Sending..." : "Send code"}
            </button>
          </div>

          {stage === "sent" && (
            <div className="mt-6 space-y-3">
              <div className="text-sm text-gray-400">
                {last4 ? `Code sent to ****${last4}` : "Enter the code you received."}
              </div>

              <input
                className="w-full rounded border border-gray-700 bg-transparent p-2"
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />

              <button
                onClick={verifyCode}
                disabled={loading || !code.trim()}
                className="rounded bg-white/10 px-4 py-2 disabled:opacity-50"
              >
                {loading ? "Verifying..." : "Verify"}
              </button>

              <button
                onClick={sendCode}
                disabled={loading}
                className="text-sm underline text-gray-300"
              >
                Resend code
              </button>
            </div>
          )}
        </>
      )}

      {stage === "verified" && (
        <div className="mt-8 rounded border border-gray-800 p-4">
          <div className="text-green-400 font-semibold">Verified ✅</div>
          <div className="mt-2 text-sm text-gray-400">
            You’re now eligible to receive employer outreach.
          </div>
          <Link className="inline-block mt-3 underline" href="/app/candidate/verifications">
            Back to verifications
          </Link>
        </div>
      )}

      {msg && (
        <div className="mt-4 text-sm text-gray-300 whitespace-pre-wrap">
          {msg}
        </div>
      )}
    </div>
  );
}
