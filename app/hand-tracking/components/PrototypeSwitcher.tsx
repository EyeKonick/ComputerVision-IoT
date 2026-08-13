"use client";

// PROTOTYPE — ticket 09 (.scratch/hand-tracking-deploy/issues/09-prototype-troubleshooting-pages.md).
// Floating bottom-centre variant switcher, per the /prototype skill's
// UI-prototype convention. Hidden in production builds. Drop this whole
// file once a variant wins and is folded into real code.

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

const VARIANTS = ["A", "B", "C"] as const;
const VARIANT_LABELS: Record<(typeof VARIANTS)[number], string> = {
  A: "A — Rail-nav reference",
  B: "B — Stacked banner cards",
  C: "C — Dense terminal reference",
};

export function PrototypeSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = (searchParams.get("variant") as (typeof VARIANTS)[number]) ?? "A";
  const index = VARIANTS.indexOf(current) === -1 ? 0 : VARIANTS.indexOf(current);

  function go(next: (typeof VARIANTS)[number]) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("variant", next);
    router.replace(`${pathname}?${params.toString()}`);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) return;
      if (target?.isContentEditable) return;
      if (e.key === "ArrowLeft") go(VARIANTS[(index - 1 + VARIANTS.length) % VARIANTS.length]);
      if (e.key === "ArrowRight") go(VARIANTS[(index + 1) % VARIANTS.length]);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (process.env.NODE_ENV === "production") return null;

  return (
    <div className="htp-switcher">
      <button
        type="button"
        className="htp-switcher-btn"
        onClick={() => go(VARIANTS[(index - 1 + VARIANTS.length) % VARIANTS.length])}
        aria-label="Previous variant"
      >
        ←
      </button>
      <span className="htp-switcher-label">
        PROTOTYPE · {VARIANT_LABELS[current] ?? current}
      </span>
      <button
        type="button"
        className="htp-switcher-btn"
        onClick={() => go(VARIANTS[(index + 1) % VARIANTS.length])}
        aria-label="Next variant"
      >
        →
      </button>
    </div>
  );
}
