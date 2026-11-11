import type { FlatStep, QrAttendanceData } from "./types";
import { qrSession0 } from "./sessions/00-qr-session-0";

export const qrAttendanceData: QrAttendanceData = [qrSession0];

export const flatSteps: FlatStep[] = qrAttendanceData.flatMap((session) =>
  session.steps.map((step, i) => ({
    session,
    step,
    flatIndex:
      qrAttendanceData
        .slice(0, qrAttendanceData.indexOf(session))
        .reduce((sum, s) => sum + s.steps.length, 0) + i,
  }))
);

export type { QrAttendanceData, Session, Step, FlatStep } from "./types";
