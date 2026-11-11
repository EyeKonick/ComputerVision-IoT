"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { flatSteps, qrAttendanceData } from "../data";
import type { Session, Step } from "../data/types";
import {
  clearProgress,
  computeState,
  forkChoiceFor,
  isLocked,
  loadProgress,
  saveProgress,
  subscribeToProgress,
  type Progress,
} from "../lib/progress";
import { TrackSwitcher } from "../../components/TrackSwitcher";
import { ChainForkNode } from "./ChainForkNode";

const flatIndexById = new Map(flatSteps.map((fs) => [fs.step.id, fs.flatIndex]));

// flatIndex of each session's own last step — used to decide whether the
// *next* session is revealed at all in the rail. Mirrors
// `app/facial-recognition/components/ChainRail.tsx` (no row-wrap special
// case — QR's Session 0 is short enough to fit one row).
const sessionEndFlatIndex: number[] = (() => {
  const ends: number[] = [];
  let cursor = -1;
  qrAttendanceData.forEach((session) => {
    cursor += session.steps.length;
    ends.push(cursor);
  });
  return ends;
})();

function trackLabel(session: Session, ti: number) {
  return `${String(session.sessionNumber ?? ti).padStart(2, "0")} — ${session.title}`;
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

// Each session's steps are split into explicit visual rows that always fit
// the rail — never left to the browser's flex-wrap. Relying on wrap broke
// whenever the rail's width shifted by a few pixels (e.g. revealing the
// next session makes the rail scroll, and the scrollbar eats width), which
// pushed a session's last node onto a stray line the connectors didn't
// expect. Widths below mirror qr-attendance.css: node 15px, link 22px,
// fork = two 28px curve blocks around a 15px node.
const NODE_W = 15;
const LINK_W = 22;
const FORK_W = 28 + 15 + 28;
// Rail content is ~248px (300px rail − 2×20px padding − the reserved
// scrollbar gutter); leave ≥24px for the connector's U-turn lane outside
// the outermost node. Six plain steps (222px) still fit on one row.
const ROW_BUDGET = 224;

function stepWidth(step: Step): number {
  return step.fork ? FORK_W : NODE_W;
}

// Every row carries a leading link span (visible or hidden), so count it.
function rowWidth(steps: Step[]): number {
  return steps.reduce((sum, s) => sum + LINK_W + stepWidth(s), 0);
}

function splitIntoRows(steps: Step[]): Step[][] {
  // Greedy pass finds how many rows are needed; then rebalance so rows hold
  // similar counts (e.g. 7 steps → 4 + 3, not 6 + 1), still within budget.
  let rowsNeeded = 1;
  let width = 0;
  for (const s of steps) {
    const w = LINK_W + stepWidth(s);
    if (width > 0 && width + w > ROW_BUDGET) {
      rowsNeeded++;
      width = 0;
    }
    width += w;
  }
  const perRow = Math.ceil(steps.length / rowsNeeded);
  const rows: Step[][] = [[]];
  for (const s of steps) {
    const row = rows[rows.length - 1];
    if (row.length > 0 && (row.length >= perRow || rowWidth([...row, s]) > ROW_BUDGET)) rows.push([s]);
    else row.push(s);
  }
  return rows;
}

// Visual rows across the whole track, alternating direction row by row —
// a boustrophedon (serpentine) flow, so every row-to-row turn is a short
// U-turn on the edge where the two rows actually meet. Keyed per step,
// since a session that splits into two rows has two directions.
const sessionRows: { steps: Step[]; reversed: boolean }[][] = (() => {
  let visualRow = 0;
  return qrAttendanceData.map((session) =>
    splitIntoRows(session.steps).map((steps) => ({ steps, reversed: visualRow++ % 2 === 1 }))
  );
})();

const stepRowReversed = new Map<string, boolean>();
sessionRows.forEach((rows) => rows.forEach((row) => row.steps.forEach((s) => stepRowReversed.set(s.id, row.reversed))));

function isReversedStep(stepId: string): boolean {
  return stepRowReversed.get(stepId) ?? false;
}

function stepDir(stepId: string): 1 | -1 {
  return isReversedStep(stepId) ? -1 : 1;
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

      const pA = connectionPoint(stepA, elA, "exit", isReversedStep(stepA.id));
      const pB = connectionPoint(stepB, elB, "entry", isReversedStep(stepB.id));

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
    if (currentStepId !== stepId) router.push(`/qr-attendance/${stepId}`);
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
    <aside className={`qr-chain-rail${collapsed ? " qr-collapsed" : ""}`}>
      <button
        type="button"
        className="qr-chain-rail-header"
        onClick={() => setCollapsed((v) => !v)}
        aria-expanded={!collapsed}
        aria-label={collapsed ? "Expand the chain" : "Collapse the chain"}
      >
        <span className="qr-chain-rail-title">
          <span className="qr-dot" />
          <span>The chain</span>
        </span>
        <span className="qr-rail-toggle-btn" aria-hidden="true">
          {collapsed ? "+" : "−"}
        </span>
      </button>

      <div className="qr-chain-rail-body">
        <TrackSwitcher current="qr" />

        <p className="qr-section-note">
          Every step is a landmark; every session, a joint. Steps unlock in order — finish one to
          reveal the next.
        </p>

        <div className="qr-chain" ref={chainRef}>
          <svg className="qr-chain-connectors" aria-hidden="true">
            {connectors.map((c) => {
              const lit = computeState(c.flatIndex - 1, currentFlatIndex, progress.visited) !== "upcoming";
              return <path key={c.key} d={c.d} className={`qr-chain-connector-path${lit ? " qr-lit" : ""}`} />;
            })}
          </svg>

          {qrAttendanceData.map((session, ti) => {
            const revealed = ti === 0 || progress.visited.includes(sessionEndFlatIndex[ti - 1]);
            if (!revealed) {
              flatIndexCursor += session.steps.length;
              return null;
            }

            return (
              <div key={session.id}>
                <div className="qr-track-label">
                  <span className="qr-idx">//</span> {trackLabel(session, ti)}
                </div>
                {sessionRows[ti].map((row, ri) => (
                <div key={ri} className={`qr-node-row${row.reversed ? " qr-node-row-reversed" : ""}`}>
                  {row.steps.map((step) => {
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
                            className={`qr-link${linkState !== "upcoming" ? " qr-lit" : ""}`}
                            style={linkHidden ? { visibility: "hidden" } : undefined}
                          />
                        )}
                        {step.fork ? (
                          <ChainForkNode
                            step={step}
                            flatIndex={myIndex}
                            currentFlatIndex={currentFlatIndex}
                            visited={progress.visited}
                            choice={forkChoiceFor(step.id, progress.forkChoices)}
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
                            className="qr-node qr-upcoming qr-locked"
                            aria-label={`${step.title} — locked`}
                            aria-disabled="true"
                            onMouseEnter={(e) => showTooltip(e, "🔒 Locked — finish the previous step first")}
                            onMouseMove={moveTooltip}
                            onMouseLeave={hideTooltip}
                          />
                        ) : (
                          <Link
                            ref={(el) => registerNode(step.id, el)}
                            href={`/qr-attendance/${step.id}`}
                            className={`qr-node qr-${computeState(myIndex, currentFlatIndex, progress.visited)}`}
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
                ))}
              </div>
            );
          })}
        </div>

        <div className="qr-legend">
          <div className="qr-legend-item">
            <span className="qr-legend-dot qr-done" /> Completed
          </div>
          <div className="qr-legend-item">
            <span className="qr-legend-dot qr-current" /> Current
          </div>
          <div className="qr-legend-item">
            <span className="qr-legend-dot" /> Upcoming
          </div>
          <div className="qr-legend-item">
            <span className="qr-legend-dot qr-locked-dot" /> Locked
          </div>
        </div>
        <div className="qr-progress-note">
          <span>
            {resumed
              ? "Resumed from your last visit — stored only in this browser"
              : "Progress is saved only in this browser"}
          </span>
          <button type="button" className="qr-reset-btn" onClick={handleReset}>
            Reset saved progress
          </button>
        </div>
      </div>

      {tooltip && (
        <div className="qr-tooltip qr-show" style={{ left: tooltip.x, top: tooltip.y }}>
          {tooltip.text}
        </div>
      )}
    </aside>
  );
}
