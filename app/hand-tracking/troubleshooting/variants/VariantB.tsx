// PROTOTYPE — ticket 09, Variant B: "stacked banner cards"
// Large, high-contrast cards with a colored left stripe (magenta for
// Python issues, amber for ADB/Android — echoing the two-path fork's own
// signal colors) and a full-width "Copy command" button. No side nav —
// built for scanning top-to-bottom, biggest touch targets of the three.

import type { TroubleshootingCategory } from "../prototype-data";
import { CopyButton } from "../CopyButton";

export function VariantB({ category }: { category: TroubleshootingCategory }) {
  return (
    <div className="htpB-main">
      {category.scenarios.map((s) => (
        <article key={s.slug} id={s.slug} className="htpB-card" data-cat={category.slug}>
          <div className="htpB-symptom-label">Symptom</div>
          <pre className="htpB-symptom">{s.symptom}</pre>

          <div className="htpB-cause-label">Cause</div>
          <p className="htpB-cause">{s.cause}</p>

          <div className="htpB-fix-label">Fix</div>
          <p className="htpB-fix-note">{s.fixNote}</p>
          <div className="htpB-code">
            <pre>{s.fixCode}</pre>
            <CopyButton code={s.fixCode} label="Copy command" />
          </div>
        </article>
      ))}
    </div>
  );
}
