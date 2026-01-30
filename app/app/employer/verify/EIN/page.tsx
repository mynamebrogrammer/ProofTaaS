"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function VerifyEinPage() {
  const router = useRouter();
  const [einLast4, setEinLast4] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const val = einLast4.trim();
    if (!/^\d{4}$/.test(val)) {
      setError("Please enter exactly 4 digits (EIN last 4).");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/verification/submit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ vtype: "EIN_LAST4", value: val }),
    });

    if (!res.ok) {
      const txt = await res.text();
      setError(txt || "Submission failed.");
      setLoading(false);
      return;
    }

    router.push("/app/employer");
  }

  return (
    <div className="p-6 max-w-md">
      <h1 className="text-2xl font-semibold">Submit EIN (last 4)</h1>
      <p className="mt-2 text-sm text-gray-600">
        We only need the last 4 digits. This is used to verify your business.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-3">
        <input
          className="w-full rounded border p-2"
          placeholder="EIN last 4 (e.g., 1234)"
          inputMode="numeric"
          value={einLast4}
          onChange={(e) => setEinLast4(e.target.value)}
        />

        {error && <div className="text-red-600 text-sm">{error}</div>}

        <div className="flex gap-2">
          <button
            disabled={loading}
            className="rounded bg-black text-white px-4 py-2 disabled:opacity-50"
            type="submit"
          >
            {loading ? "Submitting..." : "Submit"}
          </button>

          <button
            type="button"
            className="rounded border px-4 py-2"
            onClick={() => router.push("/app/employer")}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
