import Link from "next/link";
import type { Session, Step } from "../data/types";
import { CommandBlockView } from "./CommandBlockView";
import { CommonProblems } from "./CommonProblems";
import { FileCodePanel } from "./FileCodePanel";
import { ForkPathChooser } from "./ForkPathChooser";

// Mirrors `app/facial-recognition/components/StepDetail.tsx`, plus an
// optional "Need more help?" link list (step.links) — used by Session 0 to
// point back at Hand Tracking's Setup steps and troubleshooting pages
// instead of re-teaching Python install / phone setup here.
export function StepDetail({
  session,
  step,
  stepNumber,
  totalSteps,
  flatIndex,
}: {
  session: Session;
  step: Step;
  stepNumber: number;
  totalSteps: number;
  flatIndex: number;
}) {
  const eyebrow = `${session.title} — Step ${stepNumber} of ${totalSteps}${
    step.fork ? " (two paths, one step)" : ""
  }`;

  return (
    <div className="qr-detail">
      <div className="qr-detail-narration">
        <div className="qr-detail-eyebrow">{eyebrow}</div>
        <h2 className="qr-detail-title">{step.title}</h2>
        <p className="qr-detail-say">{step.say}</p>

        {step.glossary.length > 0 && (
          <>
            <div className="qr-detail-block-label">New in this step</div>
            <dl className="qr-glossary">
              {step.glossary.map((g) => (
                <div key={g.term}>
                  <dt>{g.term}</dt>
                  <dd>{g.explanation}</dd>
                </div>
              ))}
            </dl>
          </>
        )}

        {step.goodToKnow && <p className="qr-good-to-know">{step.goodToKnow}</p>}

        <div className="qr-detail-block-label">Why it matters</div>
        <p className="qr-detail-why">{step.why}</p>

        {step.commonProblems.length > 0 && (
          <>
            <div className="qr-detail-block-label">Common problems</div>
            <CommonProblems problems={step.commonProblems} />
          </>
        )}

        {step.links && step.links.length > 0 && (
          <>
            <div className="qr-detail-block-label">Need more help?</div>
            <ul className="qr-help-links">
              {step.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href}>{l.label} →</Link>
                  {l.note && <span className="qr-help-link-note"> {l.note}</span>}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div className="qr-detail-code-side">
        <div className="qr-code-header">
          <span>{step.fork ? step.title : step.file ? step.file.filename : "Terminal"}</span>
          <span className="qr-badge">
            {step.fork ? "Path A / Path B" : `Step ${stepNumber} of ${totalSteps}`}
          </span>
        </div>

        {step.fork ? (
          <ForkPathChooser fork={step.fork} stepId={step.id} flatIndex={flatIndex} />
        ) : step.file ? (
          <FileCodePanel file={step.file} />
        ) : (
          <div className="qr-snippet-panel">
            <div className="qr-detail-block-label">Type this</div>
            {step.commands.length === 0 ? (
              <p className="qr-snippet-empty">No commands this step.</p>
            ) : (
              step.commands.map((c, i) => <CommandBlockView key={i} block={c} />)
            )}
          </div>
        )}

        {step.runCommand && (
          <div className="qr-run-it">
            <div className="qr-detail-block-label">Run it</div>
            <code>{step.runCommand}</code>
            {step.runResult && <p>{step.runResult}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
