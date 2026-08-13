"use client";

import { useEffect, useState } from "react";
import type { TwoPathFork } from "../data/types";
import { loadProgress, saveProgress, subscribeToProgress } from "../lib/progress";
import { CommandBlockView } from "./CommandBlockView";

// Shows only the chosen path's instructions — never both at once. The
// choice is made either here or by clicking a fork branch node in the
// chain rail; both write to the same localStorage record (keyed by this
// step's own id, so multiple forks in the guide don't collide), and this
// component stays in sync with rail-driven choices via subscribeToProgress.
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
      <div className="ht-fork-detail">
        <p className="ht-fork-choice-prompt">{fork.prompt}</p>
        <div className="ht-fork-choice-row">
          {[fork.pathA, fork.pathB].map((path) => (
            <button
              key={path.letter}
              type="button"
              className="ht-fork-choice-card"
              data-letter={path.letter}
              onClick={() => choose(path.letter)}
            >
              <span className="ht-fork-path-label">{path.label}</span>
              <span className="ht-fork-choice-hint">Choose this path</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="ht-fork-detail">
      <div className="ht-fork-path" data-letter={chosenPath.letter}>
        <div className="ht-fork-path-header">
          <span className="ht-fork-path-label">{chosenPath.label}</span>
          <button type="button" className="ht-fork-switch-btn" onClick={() => choose(chosenPath.letter === "A" ? "B" : "A")}>
            Not on this path? Switch
          </button>
        </div>
        <p className="ht-fork-path-body">{chosenPath.body}</p>
        {chosenPath.commands.map((c, i) => (
          <CommandBlockView key={i} block={c} />
        ))}
      </div>
    </div>
  );
}
