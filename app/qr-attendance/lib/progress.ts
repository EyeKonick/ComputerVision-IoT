// Per-device progress tracking, localStorage only — no accounts, no
// server-side state, nothing synced across devices. Mirrors
// `app/facial-recognition/lib/progress.ts`, but under its own storage key so
// QR Attendance's step-progress stays independent of the other two tracks
// (a student can be mid-way through one without affecting the others).
export interface Progress {
  lastFlatIndex: number;
  visited: number[];
  /** Per-fork-step choice ("A" or "B"), keyed by the fork step's own id.
   * QR has one fork: Session 0's camera-source chooser
   * (QR_CAMERA_FORK_STEP_ID) — A = laptop webcam, B = phone over USB. */
  forkChoices: Record<string, "A" | "B">;
}

const STORAGE_KEY = "qra_progress_v1";
const PROGRESS_EVENT = "qra-progress-changed";

// QR's own camera-source fork step (Session 0). Its choice lives in QR's
// own store and drives every QR code panel's CAM_SOURCE line.
export const QR_CAMERA_FORK_STEP_ID = "qr-s0-5";

// Where Hand Tracking stores its own progress — read-only from here, never
// written. If a student already chose a camera path in Hand Tracking's
// Setup (fork step "setup-6"), QR pre-selects that same path until the
// student makes (or switches to) a choice of their own here.
const HAND_TRACKING_STORAGE_KEY = "htg_progress_v1";
const HAND_TRACKING_CAMERA_FORK_STEP_ID = "setup-6";

export function loadProgress(): Progress | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed.lastFlatIndex !== "number" || !Array.isArray(parsed.visited)) return null;
    if (typeof parsed.forkChoices !== "object" || parsed.forkChoices === null) {
      parsed.forkChoices = {};
    }
    return parsed as Progress;
  } catch {
    return null; // private browsing / storage disabled — guide still works, just doesn't persist
  }
}

export function saveProgress(flatIndex: number, forkStepId?: string, forkChoice?: "A" | "B"): Progress {
  const progress = loadProgress() ?? { lastFlatIndex: -1, visited: [], forkChoices: {} };
  progress.lastFlatIndex = flatIndex;
  if (!progress.visited.includes(flatIndex)) progress.visited.push(flatIndex);
  if (forkStepId && forkChoice) progress.forkChoices[forkStepId] = forkChoice;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // storage unavailable — session still works, just doesn't persist
  }
  notifyProgressChanged();
  return progress;
}

export function clearProgress() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // nothing to clear
  }
  notifyProgressChanged();
}

// Read-only peek at the camera path chosen in Hand Tracking's Setup
// (lives under Hand Tracking's own storage key, same browser/origin). Never
// written back; a missing/unreadable value just means "no pre-selection".
export function loadSharedCameraPath(): "A" | "B" | null {
  try {
    const raw = window.localStorage.getItem(HAND_TRACKING_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const choice = parsed?.forkChoices?.[HAND_TRACKING_CAMERA_FORK_STEP_ID];
    return choice === "A" || choice === "B" ? choice : null;
  } catch {
    return null;
  }
}

// The camera path QR should use: the student's own QR choice if they made
// one, otherwise Hand Tracking's stored choice as a pre-selection, otherwise
// null (code panels then show the generic line).
export function loadCameraChoice(): "A" | "B" | null {
  return loadProgress()?.forkChoices[QR_CAMERA_FORK_STEP_ID] ?? loadSharedCameraPath();
}

// A fork step's displayed choice — QR's camera fork falls back to the
// pre-selection above; any other fork uses only its own stored choice.
export function forkChoiceFor(stepId: string, forkChoices: Record<string, "A" | "B">): "A" | "B" | null {
  if (stepId === QR_CAMERA_FORK_STEP_ID) return forkChoices[stepId] ?? loadSharedCameraPath();
  return forkChoices[stepId] ?? null;
}

export function computeState(
  flatIndex: number,
  currentFlatIndex: number,
  visited: number[]
): "current" | "done" | "upcoming" {
  if (flatIndex === currentFlatIndex) return "current";
  if (visited.includes(flatIndex)) return "done";
  return "upcoming";
}

// The furthest flat index reached so far — the sequential-progress boundary.
// A step is unlocked when its flatIndex <= maxVisited(visited) + 1: every
// already-visited step, plus exactly one step ahead (the "next" step).
export function maxVisited(visited: number[]): number {
  return visited.length ? Math.max(...visited) : -1;
}

export function isLocked(flatIndex: number, visited: number[]): boolean {
  return flatIndex > maxVisited(visited) + 1;
}

// Same-tab pub/sub so a progress change made in one client component is
// reflected immediately in another without waiting for a navigation/remount.
export function notifyProgressChanged() {
  try {
    window.dispatchEvent(new Event(PROGRESS_EVENT));
  } catch {
    // no-op outside a browser environment
  }
}

export function subscribeToProgress(callback: () => void): () => void {
  window.addEventListener(PROGRESS_EVENT, callback);
  return () => window.removeEventListener(PROGRESS_EVENT, callback);
}
