// PROTOTYPE — ticket 09, Variant C: "dense terminal reference"
// Man-page/terminal-log density: no cards, just hairline-divided rows,
// a `$` prompt prefix on each symptom, compact cause/fix prose, and a
// copy button that only reveals itself on hover. Built for scanning fast
// once you already know roughly what you're looking for.

import type { TroubleshootingCategory } from "../prototype-data";
import { CopyButton } from "../CopyButton";

export function VariantC({ category }: { category: TroubleshootingCategory }) {
  return (
    <div className="htpC-main">
      {category.scenarios.map((s) => (
        <div key={s.slug} id={s.slug} className="htpC-row">
          <pre className="htpC-symptom">
            <span className="htpC-prompt">$</span>
            {s.symptom}
          </pre>
          <p className="htpC-meta">
            <b>cause:</b> {s.cause}
          </p>
          <p className="htpC-meta">
            <b>fix:</b> {s.fixNote}
          </p>
          <div className="htpC-code">
            <pre>{s.fixCode}</pre>
            <CopyButton code={s.fixCode} label="copy" />
          </div>
        </div>
      ))}
    </div>
  );
}
