import Link from "next/link";
import type { FlatStep } from "../data/types";

export function StepNav({ prev, next }: { prev: FlatStep | null; next: FlatStep | null }) {
  return (
    <div className="ht-step-nav">
      {prev ? (
        <Link href={`/hand-tracking/${prev.step.id}`} className="ht-step-nav-link ht-prev">
          <span className="ht-step-nav-eyebrow">← Previous</span>
          <span className="ht-step-nav-title">{prev.step.title}</span>
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link href={`/hand-tracking/${next.step.id}`} className="ht-step-nav-link ht-next">
          <span className="ht-step-nav-eyebrow">Next →</span>
          <span className="ht-step-nav-title">{next.step.title}</span>
        </Link>
      ) : (
        <span />
      )}
    </div>
  );
}
