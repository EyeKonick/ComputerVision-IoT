// Per-device progress tracking, localStorage only — no accounts, no
// server-side state, nothing synced across devices. See the map's Notes.
export interface Progress {
  lastFlatIndex: number;
  visited: number[];
  /** Per-fork-step choice ("A" or "B"), keyed by the fork step's own id —
   * generic across every two-path fork in the guide (camera source,
   * Python-installed-or-not, ...), not just the original camera fork. */
  forkChoices: Record<string, "A" | "B">;
}

const STORAGE_KEY = "htg_progress_v1";
const PROGRESS_EVENT = "htg-progress-changed";
// The camera-source fork step's own id — also used to migrate a
// pre-existing single `cameraPath` field from before forkChoices existed.
export const CAMERA_FORK_STEP_ID = "setup-6";

export function loadProgress(): Progress | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed.lastFlatIndex !== "number" || !Array.isArray(parsed.visited)) return null;
    if (typeof parsed.forkChoices !== "object" || parsed.forkChoices === null) {
      parsed.forkChoices = {};
    }
    // Migrate the old single-purpose `cameraPath` field, if present.
    if (typeof parsed.cameraPath === "string" && !parsed.forkChoices[CAMERA_FORK_STEP_ID]) {
      parsed.forkChoices[CAMERA_FORK_STEP_ID] = parsed.cameraPath;
    }
    delete parsed.cameraPath;
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

// Same-tab pub/sub so a progress change made in one client component (the
// in-page fork-path chooser) is reflected immediately in another (the
// chain rail's fork node) without waiting for a navigation/remount. The
// browser's native `storage` event only fires in *other* tabs, not this one.
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
