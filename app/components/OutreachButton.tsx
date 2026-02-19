"use client";

import { useState } from "react";

export default function OutreachButton({
  candidateProfileId,
  disabled,
  initialLabel,
}: {
  candidateProfileId: string;
  disabled?: boolean;
  initialLabel?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(initialLabel === "Sent");

  async function onSend() {
    if (disabled || loading || sent) return;
    setLoading(true);
    try {
      const res = await fetch("/api/employer/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateProfileId }),
      });

      if (res.ok) {
        setSent(true);
        return;
      }

      const msg = await res.text();
      alert(msg);
    } finally {
      setLoading(false);
    }
  }

  const label = sent ? "Sent" : loading ? "Sending..." : "Outreach";

  return (
    <button
      onClick={onSend}
      disabled={disabled || loading || sent}
      className={`rounded px-3 py-1 text-sm border border-gray-700 ${
        disabled || sent
          ? "opacity-50 cursor-not-allowed"
          : "hover:bg-white/10"
      }`}
    >
      {label}
    </button>
  );
}
