"use client";

// PROTOTYPE — ticket 09. The opposite of NoCopyWrapper on purpose: fix
// commands here are one-off environment fixes, not lesson code, so
// copy-paste is invited rather than blocked (ticket 07 decision #9).

import { useState } from "react";

export function CopyButton({ code, label, className }: { code: string; label: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // clipboard unavailable — no-op, the code is still selectable/visible
    }
  }

  return (
    <button type="button" className={`htp-copy-btn${className ? ` ${className}` : ""}`} onClick={handleCopy}>
      {copied ? "✓" : label}
    </button>
  );
}
