import { Suspense } from "react";
import { notFound } from "next/navigation";
import { flatSteps } from "../data";
import { LockGuard } from "../components/LockGuard";
import { StepDetail } from "../components/StepDetail";
import { StepNav } from "../components/StepNav";
import { PrototypeSwitcher } from "../components/PrototypeSwitcher"; // PROTOTYPE — ticket 09

export function generateStaticParams() {
  return flatSteps.map((fs) => ({ stepId: fs.step.id }));
}

export default async function StepPage(props: PageProps<"/hand-tracking/[stepId]">) {
  const { stepId } = await props.params;
  const searchParams = await props.searchParams;
  // PROTOTYPE — ticket 09: which troubleshooting-entry-link variant to show.
  const variantParam = searchParams.variant;
  const variant = (Array.isArray(variantParam) ? variantParam[0] : variantParam) as "A" | "B" | "C" | undefined;
  const entry = flatSteps.find((fs) => fs.step.id === stepId);
  if (!entry) notFound();

  const { session, step, flatIndex } = entry;
  const stepNumber = step.index + 1;
  const totalSteps = session.steps.length;
  const prev = flatIndex > 0 ? flatSteps[flatIndex - 1] : null;
  const next = flatIndex < flatSteps.length - 1 ? flatSteps[flatIndex + 1] : null;
  const isFirstStepOfTrack = flatIndex === 0;
  const isFirstStepOfSession = step.index === 0;
  const isLastStepOfSession = step.index === session.steps.length - 1;

  return (
    <div className="ht-wrap">
      <LockGuard flatIndex={flatIndex} />
      {isFirstStepOfTrack && (
        <section className="ht-hero">
          <div className="ht-hero-eyebrow">
            <span className="ht-dot" /> ITE 3 — Applied Computer Vision &amp; IoT
          </div>
          <h1>
            {flatSteps.length} steps.
            <br />
            One camera feed.
            <br />
            <em>A skeleton made of light.</em>
          </h1>
          <p>
            The Hand Tracking guide — the same node-and-connection language you draw over your own
            hand in <code style={{ fontFamily: "var(--mono)" }}>hand_ar.py</code>, reused here as the
            way you navigate the lesson itself.
          </p>
          <div className="ht-hero-stats">
            <div className="ht-stat">
              <span className="ht-n">5</span>
              <span className="ht-l">Sessions</span>
            </div>
            <div className="ht-stat">
              <span className="ht-n">{flatSteps.length}</span>
              <span className="ht-l">Steps</span>
            </div>
          </div>
        </section>
      )}

      <section className="ht-section">
        <div className="ht-section-head">
          <h2>{session.title}</h2>
          <span className="ht-tag">{session.track}</span>
        </div>
        <p className="ht-section-note">{session.syllabusMapping}</p>

        {isFirstStepOfSession && (
          <div className="ht-session-panel">
            <h3>Session goal — say this out loud at the start</h3>
            <p>{session.sessionGoal}</p>
            {session.instructorNotes.length > 0 && (
              <ul>
                {session.instructorNotes.map((note, i) => (
                  <li key={i}>{note}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <StepDetail
          session={session}
          step={step}
          stepNumber={stepNumber}
          totalSteps={totalSteps}
          flatIndex={flatIndex}
          variant={variant}
        />

        {isLastStepOfSession && (
          <div className="ht-session-panel ht-wrapup">
            <h3>Wrap-up — say this before ending the session</h3>
            <p>{session.wrapUp}</p>
            {session.closingFramingNote && (
              <>
                <h3>Closing framing note — say this before wrap-up</h3>
                <p>{session.closingFramingNote}</p>
              </>
            )}
          </div>
        )}

        <StepNav prev={prev} next={next} />
      </section>

      <footer className="ht-footer-meta">
        <span>Hand Tracking Guide</span>
        <span>ITE 3 — Applied Computer Vision &amp; IoT</span>
      </footer>

      {/* PROTOTYPE — ticket 09 */}
      <Suspense fallback={null}>
        <PrototypeSwitcher />
      </Suspense>
    </div>
  );
}
