"use client";

import { useRef, useState } from "react";

// Blocks copy/cut/right-click on code the student is meant to type
// themselves, with an explanatory toast. Identical to
// `app/hand-tracking/components/NoCopyWrapper.tsx`.
export function NoCopyWrapper({ children }: { children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function flash(e: React.SyntheticEvent) {
    e.preventDefault();
    setShow(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setShow(false), 2200);
  }

  return (
    <div
      style={{ position: "relative", userSelect: "none" }}
      onCopy={flash}
      onCut={flash}
      onContextMenu={flash}
    >
      <div className={`fr-copy-toast${show ? " fr-show" : ""}`}>
        Type it yourself — that&apos;s the point. No copy-paste here.
      </div>
      {children}
    </div>
  );
}
