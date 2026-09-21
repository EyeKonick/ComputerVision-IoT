"use client";

import { useEffect, useState } from "react";
import type { TwoPathFork } from "../data/types";
import { loadProgress, saveProgress, subscribeToProgress } from "../lib/progress";
import { CommandBlockView } from "./CommandBlockView";

// No Face Tracking step currently forks — kept for parity with
// `app/hand-tracking/components/ForkPathChooser.tsx` in case a future
// session adds one.
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
    setChoice(loadProgress()?.forkChoices[stepId] ?? null);
    setHydrated(true);
    return subscribeToProgress(() => {
      setChoice(loadProgress()?.forkChoices[stepId] ?? null);
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
      <div className="fr-fork-detail">
        <p className="fr-fork-choice-prompt">{fork.prompt}</p>
        <div className="fr-fork-choice-row">
          {[fork.pathA, fork.pathB].map((path) => (
            <button
              key={path.letter}
              type="button"
              className="fr-fork-choice-card"
              data-letter={path.letter}
              onClick={() => choose(path.letter)}
            >
              <span className="fr-fork-path-label">{path.label}</span>
              <span className="fr-fork-choice-hint">Choose this path</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="fr-fork-detail">
      <div className="fr-fork-path" data-letter={chosenPath.letter}>
        <div className="fr-fork-path-header">
          <span className="fr-fork-path-label">{chosenPath.label}</span>
          <button type="button" className="fr-fork-switch-btn" onClick={() => choose(chosenPath.letter === "A" ? "B" : "A")}>
            Not on this path? Switch
          </button>
        </div>
        <p className="fr-fork-path-body">{chosenPath.body}</p>
        {chosenPath.commands.map((c, i) => (
          <CommandBlockView key={i} block={c} />
        ))}
      </div>
    </div>
  );
}
