import Link from "next/link";
import type { FlatStep } from "../data/types";

export function StepNav({ prev, next }: { prev: FlatStep | null; next: FlatStep | null }) {
  return (
    <div className="qr-step-nav">
      {prev ? (
        <Link href={`/qr-attendance/${prev.step.id}`} className="qr-step-nav-link qr-prev">
          <span className="qr-step-nav-eyebrow">← Previous</span>
          <span className="qr-step-nav-title">{prev.step.title}</span>
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link href={`/qr-attendance/${next.step.id}`} className="qr-step-nav-link qr-next">
          <span className="qr-step-nav-eyebrow">Next →</span>
          <span className="qr-step-nav-title">{next.step.title}</span>
        </Link>
      ) : (
        <span />
      )}
    </div>
  );
}
