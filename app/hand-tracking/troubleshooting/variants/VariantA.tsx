// PROTOTYPE — ticket 09, Variant A: "rail-nav reference"
// A compact on-page nav (styled like a scaled-down chain rail, but static
// and non-sticky-to-progress) lets a student jump straight to their
// symptom; icon-only copy button sits inside the code block's corner.

import type { TroubleshootingCategory } from "../prototype-data";
import { CopyButton } from "../CopyButton";

export function VariantA({ category }: { category: TroubleshootingCategory }) {
  return (
    <div className="htpA-layout">
      <nav className="htpA-nav" aria-label="Jump to a symptom">
        <div className="htpA-nav-label">On this page</div>
        {category.scenarios.map((s) => (
          <a key={s.slug} href={`#${s.slug}`}>
            {s.symptom.split("\n")[0].slice(0, 46)}
            {s.symptom.length > 46 ? "…" : ""}
          </a>
        ))}
      </nav>

      <div className="htpA-main">
        {category.scenarios.map((s) => (
          <article key={s.slug} id={s.slug} className="htpA-card">
            <div className="htpA-card-eyebrow">Symptom</div>
            <pre className="htpA-symptom">{s.symptom}</pre>

            <div className="htpA-card-eyebrow">Cause</div>
            <p className="htpA-cause">{s.cause}</p>

            <div className="htpA-card-eyebrow">Fix</div>
            <p className="htpA-fix-note">{s.fixNote}</p>
            <div className="htpA-code">
              <pre>{s.fixCode}</pre>
              <CopyButton code={s.fixCode} label="⧉" />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
