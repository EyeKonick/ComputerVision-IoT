"use client";

import type { Step } from "../data/types";
import { computeState } from "../lib/progress";

function ForkCurves({ direction, chosen }: { direction: "in" | "out"; chosen: "A" | "B" | null }) {
  // Branch geometry: two 52px rows with a 14px gap (see .ht-fork-branch /
  // .ht-fork-branches), so row centers sit at y=26 and y=92, merging at the
  // vertical midpoint y=59.
  const dA = direction === "in" ? "M0,59 C14,59 14,26 28,26" : "M0,26 C14,26 14,59 28,59";
  const dB = direction === "in" ? "M0,59 C14,59 14,92 28,92" : "M0,92 C14,92 14,59 28,59";
  return (
    <svg className="ht-fork-curves" width={28} height={118} viewBox="0 0 28 118" preserveAspectRatio="none">
      <path d={dA} className={`ht-fork-curve${chosen === "A" ? " ht-chosen-a" : ""}`} />
      <path d={dB} className={`ht-fork-curve${chosen === "B" ? " ht-chosen-b" : ""}`} />
    </svg>
  );
}

// Renders any two-path fork step (camera source, Python-install check, …)
// as a pair of branch nodes joined by merge curves. Generic over which
// fork this is — the caller supplies this step's own persisted choice.
export function ChainForkNode({
  step,
  flatIndex,
  currentFlatIndex,
  visited,
  choice,
  locked,
  onChoose,
  onHover,
  onMove,
  onLeave,
  rootRef,
}: {
  step: Step;
  flatIndex: number;
  currentFlatIndex: number;
  visited: number[];
  choice: "A" | "B" | null;
  locked: boolean;
  onChoose: (letter: "A" | "B", stepId: string, flatIndex: number) => void;
  onHover: (e: React.MouseEvent, text: string) => void;
  onMove: (e: React.MouseEvent) => void;
  onLeave: () => void;
  /** Lets the chain rail measure this block's real left/right edges for
   * the connectors joining it to the steps before/after it. */
  rootRef?: (el: HTMLDivElement | null) => void;
}) {
  if (!step.fork) return null;
  const state = computeState(flatIndex, currentFlatIndex, visited);
  const branches: Array<{ letter: "A" | "B"; tag: string; below: boolean }> = [
    { letter: "A", tag: step.fork.pathA.label.replace(/^Path\s*/, ""), below: false },
    { letter: "B", tag: step.fork.pathB.label.replace(/^Path\s*/, ""), below: true },
  ];

  return (
    <div className="ht-fork" ref={rootRef}>
      <ForkCurves direction="in" chosen={locked ? null : choice} />
      <div className="ht-fork-branches">
        {branches.map((branch) => {
          const otherChosen = !locked && !!choice && choice !== branch.letter;
          const chosen = !locked && choice === branch.letter;
          return (
            <div key={branch.letter} className="ht-fork-branch">
              <button
                type="button"
                className={`ht-node${
                  locked ? " ht-upcoming ht-locked" : otherChosen ? " ht-unchosen" : ` ht-${state}`
                }`}
                aria-label={
                  locked ? `${step.title} — Path ${branch.letter} — locked` : `${step.title} — Path ${branch.letter}`
                }
                aria-disabled={locked}
                onMouseEnter={(e) =>
                  onHover(e, locked ? "🔒 Locked — finish the previous step first" : `${step.title} — Path ${branch.letter}`)
                }
                onMouseMove={onMove}
                onMouseLeave={onLeave}
                onClick={() => {
                  if (!locked) onChoose(branch.letter, step.id, flatIndex);
                }}
              />
              <span
                className={`ht-fork-tag${branch.below ? " ht-below" : ""}${
                  chosen ? ` ht-chosen-${branch.letter.toLowerCase()}` : ""
                }`}
              >
                {branch.tag}
              </span>
            </div>
          );
        })}
      </div>
      <ForkCurves direction="out" chosen={locked ? null : choice} />
    </div>
  );
}
