import type { Session, Step } from "../data/types";
import { CommandBlockView } from "./CommandBlockView";
import { CommonProblems } from "./CommonProblems";
import { FileCodePanel } from "./FileCodePanel";
import { ForkPathChooser } from "./ForkPathChooser";

// Mirrors `app/hand-tracking/components/StepDetail.tsx`, minus the
// troubleshooting-subpage "stuck?" link wiring (PROTOTYPE ticket 09) —
// Face Tracking has no troubleshooting sub-pages of its own yet.
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
    <div className="fr-detail">
      <div className="fr-detail-narration">
        <div className="fr-detail-eyebrow">{eyebrow}</div>
        <h2 className="fr-detail-title">{step.title}</h2>
        <p className="fr-detail-say">{step.say}</p>

        {step.glossary.length > 0 && (
          <>
            <div className="fr-detail-block-label">New in this step</div>
            <dl className="fr-glossary">
              {step.glossary.map((g) => (
                <div key={g.term}>
                  <dt>{g.term}</dt>
                  <dd>{g.explanation}</dd>
                </div>
              ))}
            </dl>
          </>
        )}

        {step.goodToKnow && <p className="fr-good-to-know">{step.goodToKnow}</p>}

        <div className="fr-detail-block-label">Why it matters</div>
        <p className="fr-detail-why">{step.why}</p>

        {step.commonProblems.length > 0 && (
          <>
            <div className="fr-detail-block-label">Common problems</div>
            <CommonProblems problems={step.commonProblems} />
          </>
        )}
      </div>

      <div className="fr-detail-code-side">
        <div className="fr-code-header">
          <span>{step.fork ? step.title : step.file ? step.file.filename : "Terminal"}</span>
          <span className="fr-badge">
            {step.fork ? "Path A / Path B" : `Step ${stepNumber} of ${totalSteps}`}
          </span>
        </div>

        {step.fork ? (
          <ForkPathChooser fork={step.fork} stepId={step.id} flatIndex={flatIndex} />
        ) : step.file ? (
          <FileCodePanel file={step.file} />
        ) : (
          <div className="fr-snippet-panel">
            <div className="fr-detail-block-label">Type this</div>
            {step.commands.length === 0 ? (
              <p className="fr-snippet-empty">No commands this step.</p>
            ) : (
              step.commands.map((c, i) => <CommandBlockView key={i} block={c} />)
            )}
          </div>
        )}

        {step.runCommand && (
          <div className="fr-run-it">
            <div className="fr-detail-block-label">Run it</div>
            <code>{step.runCommand}</code>
            {step.runResult && <p>{step.runResult}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
