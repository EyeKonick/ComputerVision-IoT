"use client";

import { useState } from "react";
import type { CommonProblem } from "../data/types";

/** Collapsible, single-open-at-a-time list of a step's common problems.
 * Collapsed rows show only the error/symptom line so a long list doesn't
 * overwhelm the reader; clicking a row reveals its fix and closes whichever
 * other row was open. Mirrors `app/hand-tracking/components/CommonProblems.tsx`
 * minus the troubleshooting-subpage "Fix this" links — QR has no
 * troubleshooting sub-pages; Session 0 links to Hand Tracking's via a
 * step's `links` instead. */
export function CommonProblems({ problems }: { problems: CommonProblem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <ul className="qr-problems">
      {problems.map((p, i) => {
        const open = openIndex === i;
        return (
          <li key={i} className="qr-problem">
            <button
              type="button"
              className="qr-problem-toggle"
              aria-expanded={open}
              onClick={() => setOpenIndex(open ? null : i)}
            >
              <span className="qr-chevron">{open ? "▾" : "▸"}</span>
              <span className="qr-problem-error">{p.error}</span>
            </button>
            {open && (
              <div className="qr-problem-solution">
                <p>{p.solution}</p>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
