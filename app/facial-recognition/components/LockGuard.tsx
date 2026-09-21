"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { flatSteps } from "../data";
import { isLocked, loadProgress, maxVisited } from "../lib/progress";

// Nodes ahead of progress aren't just visually locked in the chain — a
// student could still type/paste a locked step's URL directly. Catch that
// here and bounce back to the furthest step they've actually unlocked.
export function LockGuard({ flatIndex }: { flatIndex: number }) {
  const router = useRouter();

  useEffect(() => {
    const progress = loadProgress();
    const visited = progress?.visited ?? [];
    if (!isLocked(flatIndex, visited)) return;
    const target = Math.min(maxVisited(visited) + 1, flatSteps.length - 1);
    router.replace(`/facial-recognition/${flatSteps[target].step.id}`);
  }, [flatIndex, router]);

  return null;
}
