import type { FlatStep, FaceTrackingData } from "./types";
import { faceSession1 } from "./sessions/01-face-session-1";
import { faceSession2 } from "./sessions/02-face-session-2";

// Sessions 3-4 (mood detection, themes/controls) land here as their own
// tickets resolve on the CV/IoT Student Guide map — see
// .scratch/cv-iot-student-guide/issues/08-09.
export const faceTrackingData: FaceTrackingData = [faceSession1, faceSession2];

export const flatSteps: FlatStep[] = faceTrackingData.flatMap((session) =>
  session.steps.map((step, i) => ({
    session,
    step,
    flatIndex:
      faceTrackingData
        .slice(0, faceTrackingData.indexOf(session))
        .reduce((sum, s) => sum + s.steps.length, 0) + i,
  }))
);

export type { FaceTrackingData, Session, Step, FlatStep } from "./types";
