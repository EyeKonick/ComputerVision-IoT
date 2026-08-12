"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { flatSteps } from "./data";
import { loadProgress } from "./lib/progress";

export default function HandTrackingIndexPage() {
  const router = useRouter();

  useEffect(() => {
    const progress = loadProgress();
    const resumeStep =
      progress && progress.lastFlatIndex >= 0 ? flatSteps[progress.lastFlatIndex] : null;
    const target = resumeStep ? resumeStep.step.id : flatSteps[0].step.id;
    router.replace(`/hand-tracking/${target}`);
  }, [router]);

  return null;
}
