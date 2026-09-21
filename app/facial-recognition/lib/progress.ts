// Per-device progress tracking, localStorage only — no accounts, no
// server-side state, nothing synced across devices. Mirrors
// `app/hand-tracking/lib/progress.ts` exactly, but under its own storage
// key so the two tracks' step-progress stays independent (a student can be
// mid-way through one without affecting the other).
export interface Progress {
  lastFlatIndex: number;
  visited: number[];
  /** Per-fork-step choice ("A" or "B"), keyed by the fork step's own id.
   * No step in the Face Tracking track has its own fork (the camera-source
   * fork lives once, in the shared Setup session under Hand Tracking) —
   * kept for shape-parity with the sibling track and in case a future
   * session adds one. */
  forkChoices: Record<string, "A" | "B">;
}

const STORAGE_KEY = "frg_progress_v1";
const PROGRESS_EVENT = "frg-progress-changed";

// Where Hand Tracking stores its own progress — read-only from here, never
// written. The camera-source choice a student made once during the shared
// Setup session lives there (keyed by its fork step id, "setup-6"); Face
// Tracking reads it across so the CAM_SOURCE line can be personalized here
// too, without asking the student to choose a camera path a second time.
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

// Read-only peek at the camera path chosen during the shared Setup session
// (lives under Hand Tracking's own storage key, same browser/origin). Used
// only to personalize the CAM_SOURCE line in code panels here — never
// written back, and a missing/unreadable value just falls back to the
// generic, both-paths-shown line (same as a student who hasn't chosen yet).
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
