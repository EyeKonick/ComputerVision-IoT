import { notFound } from "next/navigation";
import { faceTrackingData, flatSteps } from "../data";
import { LockGuard } from "../components/LockGuard";
import { StepDetail } from "../components/StepDetail";
import { StepNav } from "../components/StepNav";

export function generateStaticParams() {
  return flatSteps.map((fs) => ({ stepId: fs.step.id }));
}

export default async function StepPage(props: PageProps<"/facial-recognition/[stepId]">) {
  const { stepId } = await props.params;
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
    <div className="fr-wrap">
      <LockGuard flatIndex={flatIndex} />
      {isFirstStepOfTrack && (
        <section className="fr-hero">
          <div className="fr-hero-eyebrow">
            <span className="fr-dot" /> ITE 3 — Applied Computer Vision &amp; IoT
          </div>
          <h1>
            {flatSteps.length} steps.
            <br />
            One camera feed.
            <br />
            <em>A face, framed in light.</em>
          </h1>
          <p>
            The Facial Recognition guide — same camera-loop foundation as Hand Tracking, now
            finding faces instead of hands in{" "}
            <code style={{ fontFamily: "var(--mono)" }}>face_tracker.py</code>.
          </p>
          <div className="fr-hero-stats">
            <div className="fr-stat">
              <span className="fr-n">{faceTrackingData.length}</span>
              <span className="fr-l">{faceTrackingData.length === 1 ? "Session so far" : "Sessions so far"}</span>
            </div>
            <div className="fr-stat">
              <span className="fr-n">{flatSteps.length}</span>
              <span className="fr-l">Steps</span>
            </div>
          </div>
        </section>
      )}

      <section className="fr-section">
        <div className="fr-section-head">
          <h2>{session.title}</h2>
          <span className="fr-tag">{session.track}</span>
        </div>
        <p className="fr-section-note">{session.syllabusMapping}</p>

        {isFirstStepOfSession && (
          <div className="fr-session-panel">
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
        />

        {isLastStepOfSession && (
          <div className="fr-session-panel fr-wrapup">
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

      <footer className="fr-footer-meta">
        <span>Facial Recognition Guide</span>
        <span>ITE 3 — Applied Computer Vision &amp; IoT</span>
      </footer>
    </div>
  );
}
