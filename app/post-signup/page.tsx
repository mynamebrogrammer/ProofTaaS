"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

type Role = "EMPLOYER" | "CANDIDATE";

export default function PostSignupPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const roleFromQuery = useMemo(() => {
    const r = sp.get("role");
    if (r === "CANDIDATE") return "CANDIDATE";
    if (r === "EMPLOYER") return "EMPLOYER";
    return null;
  }, [sp]);

  const [role, setRole] = useState<Role | null>(roleFromQuery);
  const [companyName, setCompanyName] = useState("");
  const [fullName, setFullName] = useState("");

  const [stage, setStage] = useState<"checking" | "form" | "bootstrapping">(
    "checking"
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = supabaseBrowser();

      let { data } = await supabase.auth.getUser();
      if (!data.user) {
        await new Promise((r) => setTimeout(r, 250));
        data = (await supabase.auth.getUser()).data;
      }

      if (!data.user) {
        router.push("/sign-in");
        return;
      }

      // If role wasn’t in query (e.g. user signed in later), try user metadata
      if (!roleFromQuery) {
        const metaRole = (data.user.user_metadata?.role ?? null) as Role | null;
        setRole(metaRole ?? "EMPLOYER"); // default employer if missing
      }

      setStage("form");
    })();
  }, [router, roleFromQuery]);

  async function runBootstrap() {
    setError(null);

    if (!role) {
      setError("Missing role. Please go back and select Employer or Candidate.");
      return;
    }

    const payload: any = { role };

    if (role === "EMPLOYER") {
      if (!companyName.trim()) {
        setError("Company name is required.");
        return;
      }
      payload.company_name = companyName.trim();
    } else {
      payload.full_name = fullName.trim() || "New Candidate";
    }

    setStage("bootstrapping");

    const res = await fetch("/api/bootstrap", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const txt = await res.text();
      if (res.status === 401) router.push("/sign-in");
      setError(txt || "Bootstrap failed.");
      setStage("form");
      return;
    }

    const json = await res.json();

    if (json.role === "EMPLOYER") router.push(`/employer/${json.employerId}`);
    else router.push(`/candidate/${json.candidateId}`);
  }

  if (stage === "checking") return <div className="p-6">Setting up…</div>;

  return (
    <div className="p-6 max-w-md">
      <h1 className="text-2xl font-semibold">Finish setup</h1>

      {!roleFromQuery && (
        <div className="mt-4 flex gap-4">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={role === "EMPLOYER"}
              onChange={() => setRole("EMPLOYER")}
            />
            Employer
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={role === "CANDIDATE"}
              onChange={() => setRole("CANDIDATE")}
            />
            Candidate
          </label>
        </div>
      )}

      <div className="mt-4 space-y-3">
        {role === "EMPLOYER" ? (
          <input
            className="w-full rounded border p-2"
            placeholder="Company name"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
          />
        ) : (
          <input
            className="w-full rounded border p-2"
            placeholder="Full name (optional)"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        )}

        <button
          onClick={runBootstrap}
          disabled={stage === "bootstrapping"}
          className="rounded bg-black text-white px-4 py-2 disabled:opacity-50"
        >
          {stage === "bootstrapping" ? "Creating..." : "Continue"}
        </button>

        {error && (
          <pre className="whitespace-pre-wrap text-sm text-red-600">
            {error}
          </pre>
        )}
      </div>
    </div>
  );
}
