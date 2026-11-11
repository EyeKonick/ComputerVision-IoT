"use client";

import type { Step } from "../data/types";
import { computeState } from "../lib/progress";

function ForkCurves({ direction, chosen }: { direction: "in" | "out"; chosen: "A" | "B" | null }) {
  const dA = direction === "in" ? "M0,59 C14,59 14,26 28,26" : "M0,26 C14,26 14,59 28,59";
  const dB = direction === "in" ? "M0,59 C14,59 14,92 28,92" : "M0,92 C14,92 14,59 28,59";
  return (
    <svg className="qr-fork-curves" width={28} height={118} viewBox="0 0 28 118" preserveAspectRatio="none">
      <path d={dA} className={`qr-fork-curve${chosen === "A" ? " qr-chosen-a" : ""}`} />
      <path d={dB} className={`qr-fork-curve${chosen === "B" ? " qr-chosen-b" : ""}`} />
    </svg>
  );
}

// Renders any two-path fork step as a pair of branch nodes joined by merge
// curves — QR's Session 0 camera-source chooser. Mirrors
// `app/hand-tracking/components/ChainForkNode.tsx`.
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
  rootRef?: (el: HTMLDivElement | null) => void;
}) {
  if (!step.fork) return null;
  const state = computeState(flatIndex, currentFlatIndex, visited);
  const branches: Array<{ letter: "A" | "B"; tag: string; below: boolean }> = [
    { letter: "A", tag: step.fork.pathA.label.replace(/^Path\s*/, ""), below: false },
    { letter: "B", tag: step.fork.pathB.label.replace(/^Path\s*/, ""), below: true },
  ];

  return (
    <div className="qr-fork" ref={rootRef}>
      <ForkCurves direction="in" chosen={locked ? null : choice} />
      <div className="qr-fork-branches">
        {branches.map((branch) => {
          const otherChosen = !locked && !!choice && choice !== branch.letter;
          const chosen = !locked && choice === branch.letter;
          return (
            <div key={branch.letter} className="qr-fork-branch">
              <button
                type="button"
                className={`qr-node${
                  locked ? " qr-upcoming qr-locked" : otherChosen ? " qr-unchosen" : ` qr-${state}`
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
                className={`qr-fork-tag${branch.below ? " qr-below" : ""}${
                  chosen ? ` qr-chosen-${branch.letter.toLowerCase()}` : ""
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
