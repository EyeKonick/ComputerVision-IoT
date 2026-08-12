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

// A step's connection point: fork steps have a real left/right edge (the
// merge curves), everything else is just its own node center.
function connectionPoint(step: Step, el: HTMLElement, side: "exit" | "entry"): { x: number; y: number } {
  const rect = el.getBoundingClientRect();
  if (step.fork) {
    return { x: side === "exit" ? rect.right : rect.left, y: rect.top + rect.height / 2 };
  }
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

export function ChainRail() {
  const pathname = usePathname();
  const router = useRouter();
  const currentStepId = pathname?.split("/").filter(Boolean).pop() ?? "";
  const currentFlatIndex = flatIndexById.get(currentStepId) ?? 0;

  const [collapsed, setCollapsed] = useState(false);
  const [progress, setProgress] = useState<Progress>({ lastFlatIndex: -1, visited: [], cameraPath: null });
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
  // between sessions) a measured S-curve bridging the two real node
  // positions, never a disconnected stub.
  const measure = useCallback(() => {
    const chainEl = chainRef.current;
    if (!chainEl) return;
    const chainRect = chainEl.getBoundingClientRect();
    if (chainRect.width === 0) return; // rail collapsed / not laid out yet

    const nextConnectors: ConnectorPath[] = [];
    const nextWrapped = new Set<string>();

    for (let i = 0; i < flatSteps.length - 1; i++) {
      const stepA = flatSteps[i].step;
      const stepB = flatSteps[i + 1].step;
      const elA = nodeRefs.current.get(stepA.id);
      const elB = nodeRefs.current.get(stepB.id);
      if (!elA || !elB) continue;

      const pA = connectionPoint(stepA, elA, "exit");
      const pB = connectionPoint(stepB, elB, "entry");

      if (Math.abs(pA.y - pB.y) < 6) continue; // same line — the plain link already connects them

      nextWrapped.add(stepB.id);

      const x1 = pA.x - chainRect.left;
      const y1 = pA.y - chainRect.top;
      const x2 = pB.x - chainRect.left;
      const y2 = pB.y - chainRect.top;
      const midY = (y1 + y2) / 2;

      // When both ends land in roughly the same column (e.g. a step that
      // wrapped alone onto its own line, followed by a row that also
      // starts at the left margin), a straight C-curve degenerates into a
      // lifeless vertical line. Bulge the control points out to the right
      // so it always reads as a proper flowing S-curve, never a flat drop.
      const MIN_BULGE = 46;
      const bulge = Math.abs(x2 - x1) < MIN_BULGE ? MIN_BULGE : 0;
      const cx1 = x1 + bulge;
      const cx2 = x2 + bulge;

      nextConnectors.push({
        key: stepB.id,
        flatIndex: i + 1,
        d: `M${x1},${y1} C${cx1},${midY} ${cx2},${midY} ${x2},${y2}`,
      });
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

  // Stay in sync with progress changes made elsewhere on the page (e.g. the
  // fork step's own in-content camera-path chooser), not just navigation.
  useEffect(() => {
    return subscribeToProgress(() => {
      setProgress(loadProgress() ?? { lastFlatIndex: -1, visited: [], cameraPath: null });
    });
  }, []);

  function chooseCameraPath(letter: "A" | "B", stepId: string, flatIndex: number) {
    const updated = saveProgress(flatIndex, letter);
    setProgress(updated);
    if (currentStepId !== stepId) router.push(`/hand-tracking/${stepId}`);
  }

  function handleReset() {
    clearProgress();
    setProgress({ lastFlatIndex: currentFlatIndex, visited: [currentFlatIndex], cameraPath: null });
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
              <div className="ht-node-row">
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
                          cameraPath={progress.cameraPath}
                          locked={locked}
                          onChoose={chooseCameraPath}
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
