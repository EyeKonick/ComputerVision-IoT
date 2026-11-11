import { notFound } from "next/navigation";
import { qrAttendanceData, flatSteps } from "../data";
import { LockGuard } from "../components/LockGuard";
import { StepDetail } from "../components/StepDetail";
import { StepNav } from "../components/StepNav";

export function generateStaticParams() {
  return flatSteps.map((fs) => ({ stepId: fs.step.id }));
}

export default async function StepPage(props: PageProps<"/qr-attendance/[stepId]">) {
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
    <div className="qr-wrap">
      <LockGuard flatIndex={flatIndex} />
      {isFirstStepOfTrack && (
        <section className="qr-hero">
          <div className="qr-hero-eyebrow">
            <span className="qr-dot" /> ITE 3 — Applied Computer Vision &amp; IoT
          </div>
          <h1>
            {flatSteps.length} steps.
            <br />
            One QR card.
            <br />
            <em>Present, logged, on time.</em>
          </h1>
          <p>
            The QR Attendance guide — print a QR pass for every student with{" "}
            <code style={{ fontFamily: "var(--mono)" }}>qr_generator.py</code>, then check them in
            live from the camera with{" "}
            <code style={{ fontFamily: "var(--mono)" }}>qr_scanner.py</code>.
          </p>
          <div className="qr-hero-stats">
            <div className="qr-stat">
              <span className="qr-n">{qrAttendanceData.length}</span>
              <span className="qr-l">{qrAttendanceData.length === 1 ? "Session so far" : "Sessions so far"}</span>
            </div>
            <div className="qr-stat">
              <span className="qr-n">{flatSteps.length}</span>
              <span className="qr-l">Steps</span>
            </div>
          </div>
        </section>
      )}

      <section className="qr-section">
        <div className="qr-section-head">
          <h2>{session.title}</h2>
          <span className="qr-tag">{session.track}</span>
        </div>
        <p className="qr-section-note">{session.syllabusMapping}</p>

        {isFirstStepOfSession && (
          <div className="qr-session-panel">
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
          <div className="qr-session-panel qr-wrapup">
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

      <footer className="qr-footer-meta">
        <span>QR Attendance Guide</span>
        <span>ITE 3 — Applied Computer Vision &amp; IoT</span>
      </footer>
    </div>
  );
}
