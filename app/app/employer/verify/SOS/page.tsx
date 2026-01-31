"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
];

export default function VerifySosPage() {
  const router = useRouter();
  const [state, setState] = useState("CA");
  const [regNumber, setRegNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const st = state.trim().toUpperCase();
    const rn = regNumber.trim();

    if (!STATES.includes(st)) {
      setError("Please select a valid state.");
      return;
    }
    if (!rn || rn.length < 4) {
      setError("Please enter your SOS/registration number (at least 4 characters).");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/verification/submit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        vtype: "SOS_REGISTRATION",
        value: `${st}|${rn}`,
      }),
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
      <h1 className="text-2xl font-semibold">Submit SOS Registration</h1>
      <p className="mt-2 text-sm text-gray-600">
        Provide the state and your registration number (Secretary of State / business registry).
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-3">
        <label className="block text-sm">
          <div className="mb-1 text-gray-700">State of registration</div>
          <select
            className="w-full rounded border p-2"
            value={state}
            onChange={(e) => setState(e.target.value)}
          >
            {STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <div className="mb-1 text-gray-700">Registration number</div>
          <input
            className="w-full rounded border p-2"
            placeholder="e.g. C1234567"
            value={regNumber}
            onChange={(e) => setRegNumber(e.target.value)}
          />
        </label>

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
