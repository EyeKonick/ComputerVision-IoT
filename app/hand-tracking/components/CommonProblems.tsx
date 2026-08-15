"use client";

import { useState } from "react";
import Link from "next/link";
import type { CommonProblem } from "../data/types";

/** A "Fix this" troubleshooting-page link attached to one entry, by index
 * into `problems`. Passed as plain data (not a render function) since
 * this component is a Client Component and can't accept functions from
 * the Server Component tree above it. */
export interface CommonProblemExtraLink {
  index: number;
  href: string;
  label: string;
}

/** Collapsible, single-open-at-a-time list of a step's common problems.
 * Collapsed rows show only the error/symptom line so a long list (e.g.
 * Setup Step 7's 10 entries) doesn't overwhelm the reader; clicking a row
 * reveals its fix and closes whichever other row was open. See ticket 11
 * (.scratch/hand-tracking-deploy/issues/11-collapsible-common-problems-accordion.md). */
export function CommonProblems({
  problems,
  extraLinks,
}: {
  problems: CommonProblem[];
  extraLinks?: CommonProblemExtraLink[];
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <ul className="ht-problems">
      {problems.map((p, i) => {
        const open = openIndex === i;
        const extra = extraLinks?.find((e) => e.index === i);
        return (
          <li key={i} className="ht-problem">
            <button
              type="button"
              className="ht-problem-toggle"
              aria-expanded={open}
              onClick={() => setOpenIndex(open ? null : i)}
            >
              <span className="ht-chevron">{open ? "▾" : "▸"}</span>
              <span className="ht-problem-error">{p.error}</span>
            </button>
            {open && (
              <div className="ht-problem-solution">
                <p>{p.solution}</p>
                {extra && (
                  <Link href={extra.href} className="htp-stuck-link-a">
                    {extra.label}
                  </Link>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
