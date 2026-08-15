import Link from "next/link";
import type { Session, Step } from "../data/types";
import { CommandBlockView } from "./CommandBlockView";
import { CommonProblems } from "./CommonProblems";
import { FileCodePanel } from "./FileCodePanel";
import { ForkPathChooser } from "./ForkPathChooser";

// PROTOTYPE — ticket 09 (.scratch/hand-tracking-deploy/issues/09-prototype-troubleshooting-pages.md).
// Wired into a handful of representative steps only, to demo the entry
// affordance against real researched scenarios — ticket 10 wires this
// (or its winning shape) into every step that has a matching scenario.
const STUCK_LINK_STEPS: Record<
  string,
  { category: "python-pip-venv" | "adb-android"; bulletIndex: number }[]
> = {
  "setup-3": [{ category: "python-pip-venv", bulletIndex: 0 }], // PowerShell execution-policy bullet
  "setup-5": [
    { category: "python-pip-venv", bulletIndex: 0 }, // mediapipe wheel-mismatch bullet
    { category: "python-pip-venv", bulletIndex: 2 }, // "import cv2 still fails in VS Code" bullet
  ],
  "setup-6": [
    { category: "adb-android", bulletIndex: 0 }, // phone-not-detected bullet
    { category: "adb-android", bulletIndex: 1 }, // "adb reverse command not found" bullet — adb not installed
  ],
};

export function StepDetail({
  session,
  step,
  stepNumber,
  totalSteps,
  flatIndex,
  variant = "A",
}: {
  session: Session;
  step: Step;
  stepNumber: number;
  totalSteps: number;
  flatIndex: number;
  variant?: "A" | "B" | "C";
}) {
  const stuckEntries = STUCK_LINK_STEPS[step.id] ?? [];
  const stuckCategories = Array.from(new Set(stuckEntries.map((e) => e.category)));
  function hrefFor(category: "python-pip-venv" | "adb-android") {
    return `/hand-tracking/troubleshooting/${category}?variant=${variant}&from=${step.id}`;
  }
  function categoryLabel(category: "python-pip-venv" | "adb-android") {
    return category === "python-pip-venv" ? "Python, pip & venv" : "ADB & Android";
  }
  const eyebrow = `${session.title} — Step ${stepNumber} of ${totalSteps}${
    step.fork ? " (two paths, one step)" : ""
  }`;

  return (
    <div className="ht-detail">
      <div className="ht-detail-narration">
        <div className="ht-detail-eyebrow">{eyebrow}</div>
        <h2 className="ht-detail-title">{step.title}</h2>
        <p className="ht-detail-say">{step.say}</p>

        {step.glossary.length > 0 && (
          <>
            <div className="ht-detail-block-label">New in this step</div>
            <dl className="ht-glossary">
              {step.glossary.map((g) => (
                <div key={g.term}>
                  <dt>{g.term}</dt>
                  <dd>{g.explanation}</dd>
                </div>
              ))}
            </dl>
          </>
        )}

        {step.goodToKnow && <p className="ht-good-to-know">{step.goodToKnow}</p>}

        <div className="ht-detail-block-label">Why it matters</div>
        <p className="ht-detail-why">{step.why}</p>

        {step.commonProblems.length > 0 && (
          <>
            <div className="ht-detail-block-label">Common problems</div>
            {variant === "C" &&
              stuckCategories.map((category) => (
                <Link key={category} href={hrefFor(category)} className="htp-stuck-ghost-c">
                  having trouble with {categoryLabel(category)}? troubleshooting →
                </Link>
              ))}
            <CommonProblems
              problems={step.commonProblems}
              extraLinks={
                variant === "A"
                  ? stuckEntries.map((e) => ({
                      index: e.bulletIndex,
                      href: hrefFor(e.category),
                      label: "→ Fix this ↗",
                    }))
                  : undefined
              }
            />
            {variant === "A" &&
              stuckCategories.map((category) => (
                <p key={category} className="htp-stuck-browse-a">
                  <Link href={hrefFor(category)}>Browse every {categoryLabel(category)} fix →</Link>
                </p>
              ))}
            {variant === "B" &&
              stuckCategories.map((category) => (
                <div key={category} className="htp-stuck-banner-b">
                  <div>
                    <strong>🧭 Still stuck?</strong>
                    <span>Open the {categoryLabel(category)} troubleshooting page.</span>
                  </div>
                  <Link href={hrefFor(category)} className="htp-banner-btn">
                    Fix it →
                  </Link>
                </div>
              ))}
          </>
        )}
      </div>

      <div className="ht-detail-code-side">
        <div className="ht-code-header">
          <span>{step.fork ? step.title : step.file ? step.file.filename : "Terminal"}</span>
          <span className="ht-badge">
            {step.fork ? "Path A / Path B" : `Step ${stepNumber} of ${totalSteps}`}
          </span>
        </div>

        {step.fork ? (
          <ForkPathChooser fork={step.fork} stepId={step.id} flatIndex={flatIndex} />
        ) : step.file ? (
          <FileCodePanel file={step.file} />
        ) : (
          <div className="ht-snippet-panel">
            <div className="ht-detail-block-label">Type this</div>
            {step.commands.length === 0 ? (
              <p className="ht-snippet-empty">No commands this step.</p>
            ) : (
              step.commands.map((c, i) => <CommandBlockView key={i} block={c} />)
            )}
          </div>
        )}

        {step.runCommand && (
          <div className="ht-run-it">
            <div className="ht-detail-block-label">Run it</div>
            <code>{step.runCommand}</code>
            {step.runResult && <p>{step.runResult}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
