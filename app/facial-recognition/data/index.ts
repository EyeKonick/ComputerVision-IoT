import type { FlatStep, FaceTrackingData } from "./types";
import { faceSession1 } from "./sessions/01-face-session-1";
import { faceSession2 } from "./sessions/02-face-session-2";
import { faceSession3 } from "./sessions/03-face-session-3";
import { faceSession4 } from "./sessions/04-face-session-4";

export const faceTrackingData: FaceTrackingData = [faceSession1, faceSession2, faceSession3, faceSession4];

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
