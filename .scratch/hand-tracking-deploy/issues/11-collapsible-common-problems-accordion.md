Type: task
Status: claimed
Blocked by: (none)

## Question

Direct instructor feedback: the inline "Common problems" list shown on every step (distinct from the dedicated troubleshooting sub-pages in [ticket 09](09-prototype-troubleshooting-pages.md)/[ticket 10](10-build-troubleshooting-pages.md)) has grown long enough per step (Setup Step 7 now has 10 entries) that showing every symptom+cause+fix sentence fully expanded overwhelms students. Convert it into a collapsible, single-open-at-a-time accordion: each entry collapses to just its error/symptom line, and clicking it reveals the fix — clicking a different entry closes whichever was open and opens the new one.

Also folds in a small, related content-labeling fix: the Setup track's camera-related common-problems entries (Step 6 and Step 7) should read clearly as "this is a Laptop-webcam issue" vs "this is a Phone-over-USB issue" in their (now-collapsed) headline, so a student on one path doesn't have to read/expand entries meant for the other path to find theirs. No new dedicated "laptop camera" troubleshooting category is being added — confirmed via grilling that camera issues stay inline (already simple one-liners), this is purely a labeling clarity fix within the existing entries.

Resolved when: the `Step.commonProblems` data shape is split into `{ error, solution }` pairs, all ~77 existing entries across all 5 session files (Setup + Hand Sessions 1–4) are converted (mechanical extraction from the existing "symptom — explanation/fix" sentences, not a content rewrite), the accordion component is built and wired into `StepDetail.tsx` with single-open-at-a-time behavior, camera entries carry clear Laptop/Phone-USB labels, and it's verified live in-browser (desktop + phone viewport).

## Answer

Built and verified live.

- **Data model** (`app/hand-tracking/data/types.ts`): added `CommonProblem { error: string; solution: string }`; `Step.commonProblems` changed from `string[]` to `CommonProblem[]`.
- **Content migration**: all 77 entries across `00-setup.ts` (30), `01-hand-session-1.ts` (15), `02-hand-session-2.ts` (13), `03-hand-session-3.ts` (9), `04-hand-session-4.ts` (10) split into `{ error, solution }` — mechanical extraction from each entry's existing "symptom — explanation" shape, wording otherwise preserved (not a rewrite; that's [ticket 12](12-simplify-explanation-prose.md)'s job). Setup Step 6 and Step 7's camera entries relabeled with explicit "(Laptop webcam)" / "(Phone over USB)" prefixes on the error line.
- **Component**: new `CommonProblems.tsx` accordion (client component) — renders each entry as a `<button aria-expanded>` error headline with a chevron, single open index in state; opening one closes any other. Solution text shown in an expanding panel below. Reuses the existing `ht-detail-block-label`/chevron visual language from `FileCodePanel`'s "full file so far" toggle for consistency.
- **CSS**: new `.ht-problem-*` rules in `hand-tracking.css`, replacing the old flat `.ht-problems`/`li::before` diamond-bullet styles.
- **Wired into** `StepDetail.tsx`, replacing the old `<ul className="ht-problems">` flat list.
- Verified: `tsc --noEmit` clean; dev server checked in-browser at desktop and narrow/phone viewport widths — collapse/expand and single-open behavior confirmed on Setup Step 7 (10 entries) and a Hand Session step.
