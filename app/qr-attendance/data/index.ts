import type { FlatStep, QrAttendanceData } from "./types";
import { qrSession0 } from "./sessions/00-qr-session-0";
import { qrSession1 } from "./sessions/01-qr-session-1";
import { qrSession2 } from "./sessions/02-qr-session-2";
import { qrSession3 } from "./sessions/03-qr-session-3";
import { qrSession4 } from "./sessions/04-qr-session-4";

export const qrAttendanceData: QrAttendanceData = [qrSession0, qrSession1, qrSession2, qrSession3, qrSession4];

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
