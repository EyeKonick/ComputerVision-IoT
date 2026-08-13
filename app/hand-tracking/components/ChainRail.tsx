"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { flatSteps, handTrackingData } from "../data";
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

// Which session (track) each step belongs to, by index — used to decide
// whether that step's row reads left-to-right or right-to-left.
const stepTrackIndex = new Map<string, number>();
handTrackingData.forEach((session, ti) => {
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
  /** flatIndex of the step this curve arrives at — the curve is "lit" once
   * the step it leaves *from* (flatIndex - 1) has been reached. */
  flatIndex: number;
}

// Every other session row reads right-to-left instead of left-to-right —
// a true boustrophedon (serpentine) flow, so the connector between one
// session and the next is always a short, natural U-turn on whichever
// edge the two rows actually meet at, never a long loop back to the far
// margin. The camera-fork step (Setup only) is never reversed — its own
// merge curves assume left-to-right and aren't touched here.
//
// Reversal starts at session index 2, not 1: Setup's own 7 steps wrap
// onto a second internal line (the fork eats a slot), and that wrapped
// line — being unreversed like the rest of Setup — always lands back at
// the left margin. Starting the alternation one session later means
// Session 1 also reads left-to-right, picking up exactly where Setup's
// wrapped line left off (both near the left edge) instead of jumping to
// the opposite edge and drawing one long diagonal across the whole rail.
function isReversedTrack(ti: number): boolean {
  return ti > 0 && ti % 2 === 0;
}

// +1 if this step's own row reads left-to-right, -1 if right-to-left —
// the direction the connector should be "continuing in" as it leaves this
// step, used to pick which side of the chain the row-to-row turn happens
// on. Branch nodes (the Python/camera forks) don't belong to a reading
// row; they use the direction of the row their merge point sits on.
function stepDir(stepId: string): 1 | -1 {
  return isReversedTrack(stepTrackIndex.get(stepId) ?? 0) ? -1 : 1;
}

// A step's connection point: fork steps have a real left/right edge (the
// merge curves), everything else is just its own node center. `exit` is
// the side the path leaves toward the *next* step; `entry` is the side it
// arrives from the *previous* step — both flip when the step's own row
// reads right-to-left.
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

  // The chain is meant to read as one unbroken string from Setup through
  // the end of Hand Session 4 — every step connects to the next, whether
  // that's a plain horizontal link on the same line or (when the narrow
  // rail wraps a row, whether mid-session like the camera fork's merge or
  // between sessions) a measured racetrack turn bridging the two real
  // node positions, never a disconnected stub.
  //
  // The turn shape is ported from the approved reference roadmap's own
  // path-building geometry (straight run → quarter-circle → straight
  // vertical run → quarter-circle → straight run into the next node) —
  // a crisp, consistent "PCB trace" turn instead of a soft diagonal S.
  // Unlike the reference's fixed-canvas version (a hardcoded lane just
  // outside a known xL/xR), this adapts it to our responsive layout: the
  // lane sits just outside whichever of the two measured endpoints is
  // farther out in the exiting row's own reading direction.
  const measure = useCallback(() => {
    const chainEl = chainRef.current;
    if (!chainEl) return;
    const chainRect = chainEl.getBoundingClientRect();
    if (chainRect.width === 0) return; // rail collapsed / not laid out yet

    const nextConnectors: ConnectorPath[] = [];
    const nextWrapped = new Set<string>();

    const LANE_PAD = 14; // clearance between the lane and the nearer node
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
      // Shrink the corner radius rather than let the two arcs overlap when
      // a transition's rows sit unusually close together vertically.
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

  // Re-measure once the rail finishes expanding again (it's display:none,
  // and therefore un-measurable, while collapsed).
  useEffect(() => {
    if (collapsed) return;
    const raf = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(raf);
  }, [collapsed, measure]);

  useEffect(() => {
    const stored = loadProgress();
    if (stored) setResumed(true);
    // Only record progress once the pathname resolves to a real step — the
    // bare /hand-tracking index route (before its own resume-redirect runs)
    // has no matching step, and must not clobber lastFlatIndex with 0.
    // And never mark a *locked* step visited just because its URL was
    // opened directly — that would legitimize the very skip LockGuard (on
    // the page itself) is about to redirect away from. Let LockGuard act on
    // the untouched stored progress instead of a rail-updated one.
    if (flatIndexById.has(currentStepId) && !isLocked(currentFlatIndex, stored?.visited ?? [])) {
      const updated = saveProgress(currentFlatIndex);
      setProgress(updated);
    } else if (stored) {
      setProgress(stored);
    }
  }, [currentStepId, currentFlatIndex]);

  // Stay in sync with progress changes made elsewhere on the page (e.g. a
  // fork step's own in-content path chooser), not just navigation.
  useEffect(() => {
    return subscribeToProgress(() => {
      setProgress(loadProgress() ?? { lastFlatIndex: -1, visited: [], forkChoices: {} });
    });
  }, []);

  function chooseFork(letter: "A" | "B", stepId: string, flatIndex: number) {
    const updated = saveProgress(flatIndex, stepId, letter);
    setProgress(updated);
    if (currentStepId !== stepId) router.push(`/hand-tracking/${stepId}`);
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
    <aside className={`ht-chain-rail${collapsed ? " ht-collapsed" : ""}`}>
      <button
        type="button"
        className="ht-chain-rail-header"
        onClick={() => setCollapsed((v) => !v)}
        aria-expanded={!collapsed}
        aria-label={collapsed ? "Expand the chain" : "Collapse the chain"}
      >
        <span className="ht-chain-rail-title">
          <span className="ht-dot" />
          <span>The chain</span>
        </span>
        <span className="ht-rail-toggle-btn" aria-hidden="true">
          {collapsed ? "+" : "−"}
        </span>
      </button>

      <div className="ht-chain-rail-body">
        <p className="ht-section-note">
          Every step is a landmark; every session, a joint. Steps unlock in order — finish one to
          reveal the next.
        </p>

        <div className="ht-chain" ref={chainRef}>
          <svg className="ht-chain-connectors" aria-hidden="true">
            {connectors.map((c) => {
              const lit = computeState(c.flatIndex - 1, currentFlatIndex, progress.visited) !== "upcoming";
              return <path key={c.key} d={c.d} className={`ht-chain-connector-path${lit ? " ht-lit" : ""}`} />;
            })}
          </svg>

          {handTrackingData.map((session, ti) => (
            <div key={session.id}>
              <div className="ht-track-label">
                <span className="ht-idx">//</span> {trackLabel(session, ti)}
              </div>
              <div className={`ht-node-row${isReversedTrack(ti) ? " ht-node-row-reversed" : ""}`}>
                {session.steps.map((step, si) => {
                  flatIndexCursor++;
                  const myIndex = flatIndexCursor;
                  const showLink = si > 0 || ti > 0;
                  const linkState = computeState(myIndex - 1, currentFlatIndex, progress.visited);
                  const locked = isLocked(myIndex, progress.visited);
                  const linkHidden = wrappedKeys.has(step.id);

                  return (
                    <Fragment key={step.id}>
                      {showLink && (
                        <span
                          className={`ht-link${linkState !== "upcoming" ? " ht-lit" : ""}`}
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
                          className="ht-node ht-upcoming ht-locked"
                          aria-label={`${step.title} — locked`}
                          aria-disabled="true"
                          onMouseEnter={(e) => showTooltip(e, "🔒 Locked — finish the previous step first")}
                          onMouseMove={moveTooltip}
                          onMouseLeave={hideTooltip}
                        />
                      ) : (
                        <Link
                          ref={(el) => registerNode(step.id, el)}
                          href={`/hand-tracking/${step.id}`}
                          className={`ht-node ht-${computeState(myIndex, currentFlatIndex, progress.visited)}`}
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
          ))}
        </div>

        <div className="ht-legend">
          <div className="ht-legend-item">
            <span className="ht-legend-dot ht-done" /> Completed
          </div>
          <div className="ht-legend-item">
            <span className="ht-legend-dot ht-current" /> Current
          </div>
          <div className="ht-legend-item">
            <span className="ht-legend-dot" /> Upcoming
          </div>
          <div className="ht-legend-item">
            <span className="ht-legend-dot ht-locked-dot" /> Locked
          </div>
        </div>
        <div className="ht-progress-note">
          <span>
            {resumed
              ? "Resumed from your last visit — stored only in this browser"
              : "Progress is saved only in this browser"}
          </span>
          <button type="button" className="ht-reset-btn" onClick={handleReset}>
            Reset saved progress
          </button>
        </div>
      </div>

      {tooltip && (
        <div className="ht-tooltip ht-show" style={{ left: tooltip.x, top: tooltip.y }}>
          {tooltip.text}
        </div>
      )}
    </aside>
  );
}
