// Per-device progress tracking, localStorage only — no accounts, no
// server-side state, nothing synced across devices. See the map's Notes.
export interface Progress {
  lastFlatIndex: number;
  visited: number[];
  cameraPath: string | null;
}

const STORAGE_KEY = "htg_progress_v1";
const PROGRESS_EVENT = "htg-progress-changed";

export function loadProgress(): Progress | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed.lastFlatIndex !== "number" || !Array.isArray(parsed.visited)) return null;
    if (typeof parsed.cameraPath !== "string") parsed.cameraPath = null;
    return parsed as Progress;
  } catch {
    return null; // private browsing / storage disabled — guide still works, just doesn't persist
  }
}

export function saveProgress(flatIndex: number, cameraPath?: string | null): Progress {
  const progress = loadProgress() ?? { lastFlatIndex: -1, visited: [], cameraPath: null };
  progress.lastFlatIndex = flatIndex;
  if (!progress.visited.includes(flatIndex)) progress.visited.push(flatIndex);
  if (cameraPath) progress.cameraPath = cameraPath;
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
// in-page camera-path chooser) is reflected immediately in another (the
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
