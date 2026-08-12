import type { FlatStep, HandTrackingData } from "./types";
import { setupSession } from "./sessions/00-setup";
import { handSession1 } from "./sessions/01-hand-session-1";
import { handSession2 } from "./sessions/02-hand-session-2";
import { handSession3 } from "./sessions/03-hand-session-3";
import { handSession4 } from "./sessions/04-hand-session-4";

export const handTrackingData: HandTrackingData = [
  setupSession,
  handSession1,
  handSession2,
  handSession3,
  handSession4,
];

export const flatSteps: FlatStep[] = handTrackingData.flatMap((session) =>
  session.steps.map((step, i) => ({
    session,
    step,
    flatIndex:
      handTrackingData
        .slice(0, handTrackingData.indexOf(session))
        .reduce((sum, s) => sum + s.steps.length, 0) + i,
  }))
);

export type { HandTrackingData, Session, Step, FlatStep } from "./types";
