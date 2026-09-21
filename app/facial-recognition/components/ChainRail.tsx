"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { flatSteps, faceTrackingData } from "../data";
import type { Session, Step } from "../data/types";
import {
  clearProgress,
  computeState,
  isLocked,
  loadProgress,
  saveProgress,
  subscribeToProgress,
  type Progress,
} from "../lib/progress";
import { ChainForkNode } from "./ChainForkNode";

const flatIndexById = new Map(flatSteps.map((fs) => [fs.step.id, fs.flatIndex]));

// flatIndex of each session's own last step — used to decide whether the
// *next* session is revealed at all in the rail. Mirrors
// `app/hand-tracking/components/ChainRail.tsx`, minus that track's
// Setup-specific 8-step row-wrap special case (Face Tracking has no Setup
// session of its own — see the map's Notes on why Setup stays shared,
// taught once under Hand Tracking).
const sessionEndFlatIndex: number[] = (() => {
  const ends: number[] = [];
  let cursor = -1;
  faceTrackingData.forEach((session) => {
    cursor += session.steps.length;
    ends.push(cursor);
  });
  return ends;
})();

const stepTrackIndex = new Map<string, number>();
faceTrackingData.forEach((session, ti) => {
  session.steps.forEach((step) => stepTrackIndex.set(step.id, ti));
});

function trackLabel(session: Session, ti: number) {
  return `${String(ti + 1).padStart(2, "0")} — ${session.title}`;
}

interface TooltipState {
  text: string;
  x: number;
  y: number;
}

interface ConnectorPath {
  key: string;
  d: string;
  flatIndex: number;
}

// Every other session row reads right-to-left instead of left-to-right —
// a boustrophedon (serpentine) flow, same convention as Hand Tracking.
function isReversedTrack(ti: number): boolean {
  return ti > 0 && ti % 2 === 0;
}

function stepDir(stepId: string): 1 | -1 {
  return isReversedTrack(stepTrackIndex.get(stepId) ?? 0) ? -1 : 1;
}

function connectionPoint(
  step: Step,
  el: HTMLElement,
  side: "exit" | "entry",
  reversed: boolean
): { x: number; y: number } {
  const rect = el.getBoundingClientRect();
  if (step.fork) {
    const leavesRight = side === "exit" ? !reversed : reversed;
    return { x: leavesRight ? rect.right : rect.left, y: rect.top + rect.height / 2 };
  }
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

export function ChainRail() {
  const pathname = usePathname();
  const router = useRouter();
  const currentStepId = pathname?.split("/").filter(Boolean).pop() ?? "";
  const currentFlatIndex = flatIndexById.get(currentStepId) ?? 0;

  const [collapsed, setCollapsed] = useState(false);
  const [progress, setProgress] = useState<Progress>({ lastFlatIndex: -1, visited: [], forkChoices: {} });
  const [resumed, setResumed] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [connectors, setConnectors] = useState<ConnectorPath[]>([]);
  const [wrappedKeys, setWrappedKeys] = useState<Set<string>>(new Set());

  const chainRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Map<string, HTMLElement>>(new Map());

  const measure = useCallback(() => {
    const chainEl = chainRef.current;
    if (!chainEl) return;
    const chainRect = chainEl.getBoundingClientRect();
    if (chainRect.width === 0) return; // rail collapsed / not laid out yet

    const nextConnectors: ConnectorPath[] = [];
    const nextWrapped = new Set<string>();

    const LANE_PAD = 14;
    const MAX_CORNER_R = 10;

    for (let i = 0; i < flatSteps.length - 1; i++) {
      const stepA = flatSteps[i].step;
      const stepB = flatSteps[i + 1].step;
      const elA = nodeRefs.current.get(stepA.id);
      const elB = nodeRefs.current.get(stepB.id);
      if (!elA || !elB) continue;

      const pA = connectionPoint(stepA, elA, "exit", isReversedTrack(stepTrackIndex.get(stepA.id) ?? 0));
      const pB = connectionPoint(stepB, elB, "entry", isReversedTrack(stepTrackIndex.get(stepB.id) ?? 0));

      if (Math.abs(pA.y - pB.y) < 6) continue; // same line — the plain link already connects them

      nextWrapped.add(stepB.id);

      const x1 = pA.x - chainRect.left;
      const y1 = pA.y - chainRect.top;
      const x2 = pB.x - chainRect.left;
      const y2 = pB.y - chainRect.top;

      const dir = stepDir(stepA.id);
      const sweep = dir > 0 ? 1 : 0;
      const laneX = dir > 0 ? Math.max(x1, x2) + LANE_PAD : Math.min(x1, x2) - LANE_PAD;
      const r = Math.max(3, Math.min(MAX_CORNER_R, (y2 - y1) / 2 - 2));

      const d =
        `M${x1},${y1}` +
        ` L${laneX - r * dir},${y1}` +
        ` A${r},${r} 0 0 ${sweep} ${laneX},${y1 + r}` +
        ` L${laneX},${y2 - r}` +
        ` A${r},${r} 0 0 ${sweep} ${laneX - r * dir},${y2}` +
        ` L${x2},${y2}`;

      nextConnectors.push({ key: stepB.id, flatIndex: i + 1, d });
    }

    setConnectors(nextConnectors);
    setWrappedKeys(nextWrapped);
  }, []);

  useLayoutEffect(() => {
    measure();
  }, [measure]);

  useEffect(() => {
    if (!chainRef.current) return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(chainRef.current);
    document.fonts?.ready?.then(measure).catch(() => {});
    return () => ro.disconnect();
  }, [measure]);

  useEffect(() => {
    if (collapsed) return;
    const raf = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(raf);
  }, [collapsed, measure]);

  useEffect(() => {
    const stored = loadProgress();
    if (stored) setResumed(true);
    if (flatIndexById.has(currentStepId) && !isLocked(currentFlatIndex, stored?.visited ?? [])) {
      const updated = saveProgress(currentFlatIndex);
      setProgress(updated);
    } else if (stored) {
      setProgress(stored);
    }
  }, [currentStepId, currentFlatIndex]);

  useEffect(() => {
    return subscribeToProgress(() => {
      setProgress(loadProgress() ?? { lastFlatIndex: -1, visited: [], forkChoices: {} });
    });
  }, []);

  function chooseFork(letter: "A" | "B", stepId: string, flatIndex: number) {
    const updated = saveProgress(flatIndex, stepId, letter);
    setProgress(updated);
    if (currentStepId !== stepId) router.push(`/facial-recognition/${stepId}`);
  }

  function handleReset() {
    clearProgress();
    setProgress({ lastFlatIndex: currentFlatIndex, visited: [currentFlatIndex], forkChoices: {} });
    setResumed(false);
  }

  function showTooltip(e: React.MouseEvent, text: string) {
    setTooltip({ text, x: e.clientX + 14, y: e.clientY + 14 });
  }
  function moveTooltip(e: React.MouseEvent) {
    setTooltip((t) => (t ? { ...t, x: e.clientX + 14, y: e.clientY + 14 } : t));
  }
  function hideTooltip() {
    setTooltip(null);
  }

  function registerNode(stepId: string, el: HTMLElement | null) {
    if (el) nodeRefs.current.set(stepId, el);
    else nodeRefs.current.delete(stepId);
  }

  let flatIndexCursor = -1;

  return (
    <aside className={`fr-chain-rail${collapsed ? " fr-collapsed" : ""}`}>
      <button
        type="button"
        className="fr-chain-rail-header"
        onClick={() => setCollapsed((v) => !v)}
        aria-expanded={!collapsed}
        aria-label={collapsed ? "Expand the chain" : "Collapse the chain"}
      >
        <span className="fr-chain-rail-title">
          <span className="fr-dot" />
          <span>The chain</span>
        </span>
        <span className="fr-rail-toggle-btn" aria-hidden="true">
          {collapsed ? "+" : "−"}
        </span>
      </button>

      <div className="fr-chain-rail-body">
        <Link href="/hand-tracking" className="fr-track-switch-link">
          ↔ Switch to Hand Tracking guide
        </Link>

        <p className="fr-section-note">
          Every step is a landmark; every session, a joint. Steps unlock in order — finish one to
          reveal the next.
        </p>

        <div className="fr-chain" ref={chainRef}>
          <svg className="fr-chain-connectors" aria-hidden="true">
            {connectors.map((c) => {
              const lit = computeState(c.flatIndex - 1, currentFlatIndex, progress.visited) !== "upcoming";
              return <path key={c.key} d={c.d} className={`fr-chain-connector-path${lit ? " fr-lit" : ""}`} />;
            })}
          </svg>

          {faceTrackingData.map((session, ti) => {
            const revealed = ti === 0 || progress.visited.includes(sessionEndFlatIndex[ti - 1]);
            if (!revealed) {
              flatIndexCursor += session.steps.length;
              return null;
            }

            return (
              <div key={session.id}>
                <div className="fr-track-label">
                  <span className="fr-idx">//</span> {trackLabel(session, ti)}
                </div>
                <div className={`fr-node-row${isReversedTrack(ti) ? " fr-node-row-reversed" : ""}`}>
                  {session.steps.map((step) => {
                    flatIndexCursor++;
                    const myIndex = flatIndexCursor;
                    const showLink = myIndex > 0;
                    const linkState = computeState(myIndex - 1, currentFlatIndex, progress.visited);
                    const locked = isLocked(myIndex, progress.visited);
                    const linkHidden = wrappedKeys.has(step.id);

                    return (
                      <Fragment key={step.id}>
                        {showLink && (
                          <span
                            className={`fr-link${linkState !== "upcoming" ? " fr-lit" : ""}`}
                            style={linkHidden ? { visibility: "hidden" } : undefined}
                          />
                        )}
                        {step.fork ? (
                          <ChainForkNode
                            step={step}
                            flatIndex={myIndex}
                            currentFlatIndex={currentFlatIndex}
                            visited={progress.visited}
                            choice={progress.forkChoices[step.id] ?? null}
                            locked={locked}
                            onChoose={chooseFork}
                            onHover={showTooltip}
                            onMove={moveTooltip}
                            onLeave={hideTooltip}
                            rootRef={(el) => registerNode(step.id, el)}
                          />
                        ) : locked ? (
                          <span
                            ref={(el) => registerNode(step.id, el)}
                            className="fr-node fr-upcoming fr-locked"
                            aria-label={`${step.title} — locked`}
                            aria-disabled="true"
                            onMouseEnter={(e) => showTooltip(e, "🔒 Locked — finish the previous step first")}
                            onMouseMove={moveTooltip}
                            onMouseLeave={hideTooltip}
                          />
                        ) : (
                          <Link
                            ref={(el) => registerNode(step.id, el)}
                            href={`/facial-recognition/${step.id}`}
                            className={`fr-node fr-${computeState(myIndex, currentFlatIndex, progress.visited)}`}
                            aria-label={step.title}
                            onMouseEnter={(e) => showTooltip(e, step.title)}
                            onMouseMove={moveTooltip}
                            onMouseLeave={hideTooltip}
                          />
                        )}
                      </Fragment>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="fr-legend">
          <div className="fr-legend-item">
            <span className="fr-legend-dot fr-done" /> Completed
          </div>
          <div className="fr-legend-item">
            <span className="fr-legend-dot fr-current" /> Current
          </div>
          <div className="fr-legend-item">
            <span className="fr-legend-dot" /> Upcoming
          </div>
          <div className="fr-legend-item">
            <span className="fr-legend-dot fr-locked-dot" /> Locked
          </div>
        </div>
        <div className="fr-progress-note">
          <span>
            {resumed
              ? "Resumed from your last visit — stored only in this browser"
              : "Progress is saved only in this browser"}
          </span>
          <button type="button" className="fr-reset-btn" onClick={handleReset}>
            Reset saved progress
          </button>
        </div>
      </div>

      {tooltip && (
        <div className="fr-tooltip fr-show" style={{ left: tooltip.x, top: tooltip.y }}>
          {tooltip.text}
        </div>
      )}
    </aside>
  );
}
