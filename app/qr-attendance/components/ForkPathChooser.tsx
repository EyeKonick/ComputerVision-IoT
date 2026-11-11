"use client";

import { useEffect, useState } from "react";
import type { TwoPathFork } from "../data/types";
import { forkChoiceFor, loadProgress, saveProgress, subscribeToProgress } from "../lib/progress";
import { CommandBlockView } from "./CommandBlockView";

// Mirrors `app/hand-tracking/components/ForkPathChooser.tsx`. QR's forks
// (Session 0's camera source, Session 2's show-your-card) show a
// pre-selected path until the student picks here — see forkChoiceFor.
const readChoice = (stepId: string) => forkChoiceFor(stepId, loadProgress()?.forkChoices ?? {});
export function ForkPathChooser({
  fork,
  stepId,
  flatIndex,
}: {
  fork: TwoPathFork;
  stepId: string;
  flatIndex: number;
}) {
  const [choice, setChoice] = useState<"A" | "B" | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setChoice(readChoice(stepId));
    setHydrated(true);
    return subscribeToProgress(() => {
      setChoice(readChoice(stepId));
    });
  }, [stepId]);

  function choose(letter: "A" | "B") {
    const updated = saveProgress(flatIndex, stepId, letter);
    setChoice(updated.forkChoices[stepId] ?? null);
  }

  if (!hydrated) return null;

  const chosenPath = choice === "A" ? fork.pathA : choice === "B" ? fork.pathB : null;

  if (!chosenPath) {
    return (
      <div className="qr-fork-detail">
        <p className="qr-fork-choice-prompt">{fork.prompt}</p>
        <div className="qr-fork-choice-row">
          {[fork.pathA, fork.pathB].map((path) => (
            <button
              key={path.letter}
              type="button"
              className="qr-fork-choice-card"
              data-letter={path.letter}
              onClick={() => choose(path.letter)}
            >
              <span className="qr-fork-path-label">{path.label}</span>
              <span className="qr-fork-choice-hint">Choose this path</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="qr-fork-detail">
      <div className="qr-fork-path" data-letter={chosenPath.letter}>
        <div className="qr-fork-path-header">
          <span className="qr-fork-path-label">{chosenPath.label}</span>
          <button type="button" className="qr-fork-switch-btn" onClick={() => choose(chosenPath.letter === "A" ? "B" : "A")}>
            Not on this path? Switch
          </button>
        </div>
        <p className="qr-fork-path-body">{chosenPath.body}</p>
        {chosenPath.commands.map((c, i) => (
          <CommandBlockView key={i} block={c} />
        ))}
      </div>
    </div>
  );
}
