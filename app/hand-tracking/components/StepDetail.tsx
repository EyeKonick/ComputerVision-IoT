import type { Session, Step } from "../data/types";
import { CommandBlockView } from "./CommandBlockView";
import { FileCodePanel } from "./FileCodePanel";
import { ForkPathChooser } from "./ForkPathChooser";

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
            <ul className="ht-problems">
              {step.commonProblems.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div className="ht-detail-code-side">
        <div className="ht-code-header">
          <span>{step.fork ? "Camera source" : step.file ? step.file.filename : "Terminal"}</span>
          <span className="ht-badge">
            {step.fork ? "Path A / Path B" : `Step ${stepNumber} of ${totalSteps}`}
          </span>
        </div>

        {step.fork ? (
          <ForkPathChooser fork={step.fork} flatIndex={flatIndex} />
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
