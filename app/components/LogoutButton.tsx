"use client";

import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function LogoutButton() {
  const router = useRouter();

  return (
    <button
      className="rounded border px-3 py-2 text-sm"
      onClick={async () => {
        await supabaseBrowser().auth.signOut();
        router.push("/sign-in");
      }}
    >
      Log out
    </button>
  );
}
