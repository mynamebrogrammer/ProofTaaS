"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function SignUpPage() {
  const router = useRouter();
  const supabase = supabaseBrowser();

  const [role, setRole] = useState<"EMPLOYER" | "CANDIDATE">("EMPLOYER");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { role } },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    // Sign in immediately so /post-signup has a session cookie
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    router.push(`/post-signup?role=${role}`);
    setLoading(false);
  }

  return (
    <div className="p-6 max-w-md">
      <h1 className="text-2xl font-semibold">Create an account</h1>

      <form onSubmit={onSubmit} className="mt-6 space-y-3">
        <input
          className="w-full rounded border p-2"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />

        <input
          className="w-full rounded border p-2"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
        />

        <div className="flex gap-4 pt-2">
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

        {error && <div className="text-red-600 text-sm">{error}</div>}

        <button
          disabled={loading}
          className="rounded bg-black text-white px-4 py-2 disabled:opacity-50"
        >
          {loading ? "Creating..." : "Sign up"}
        </button>

        <div className="text-sm">
          Already have an account?{" "}
          <a className="underline" href="/sign-in">
            Sign in
          </a>
        </div>
      </form>
    </div>
  );
}
