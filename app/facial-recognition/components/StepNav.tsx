import Link from "next/link";
import type { FlatStep } from "../data/types";

export function StepNav({ prev, next }: { prev: FlatStep | null; next: FlatStep | null }) {
  return (
    <div className="fr-step-nav">
      {prev ? (
        <Link href={`/facial-recognition/${prev.step.id}`} className="fr-step-nav-link fr-prev">
          <span className="fr-step-nav-eyebrow">← Previous</span>
          <span className="fr-step-nav-title">{prev.step.title}</span>
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link href={`/facial-recognition/${next.step.id}`} className="fr-step-nav-link fr-next">
          <span className="fr-step-nav-eyebrow">Next →</span>
          <span className="fr-step-nav-title">{next.step.title}</span>
        </Link>
      ) : (
        <span />
      )}
    </div>
  );
}
