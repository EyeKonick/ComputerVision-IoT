Type: prototype
Status: closed
Blocked by: (none)

## Question

Design and build the structured JSON/TS content model that will power the Hand Tracking guide's pages, and convert all 5 already-drafted markdown sessions into it.

Covers:
- A TypeScript type shape for a "session" (id, title, track, syllabus mapping, goal) containing an ordered array of "steps" (title, narration/"say this", a **glossary** of `{term, explanation}` pairs — one entry per new built-in function/symbol/concept introduced that step, short and non-technical — code block with cumulative source + which lines are new, "why it matters" prose, common-problems list), plus any session-level wrap-up/framing-note text.
- Converting `../cv-iot-student-guide/content/01-setup-environment.md` through `05-hand-session-4-orb-wrapup.md` faithfully into this shape — content itself is final and approved; this is a structural transcription, not a rewrite. Preserve every step, every code block, every common problem. **The glossary is already authored** in those source `.md` files (each step's "New in this step" section, added in a dedicated pass after the Fable mockup demonstrated the format on 5 sample steps) — just transcribe it into the `glossary` field like everything else, no separate authoring or backporting needed.
- Where the data lives in the repo (e.g. `app/hand-tracking/data/` or similar) and how it's imported by the pages ticket 03 will build.

This can proceed in parallel with ticket 01 (Fable design pass) — the data shape doesn't depend on the visual design. Output: the TypeScript types, the populated data files, and a brief note confirming step/code-block counts match the source markdown files (so nothing was silently dropped during conversion).

## Answer

Built and verified. All in `app/hand-tracking/data/`:

- **`types.ts`** — the type shape: `Session` (id, sessionNumber, track, title, syllabusMapping, buildsOn/buildsToward, sessionGoal, instructorNotes, steps, wrapUp, closingFramingNote) containing an ordered `Step[]` (id, index, title, say, `file: FileSnapshot | null` — cumulative code + `newLineIndices`, `commands: CommandBlock[]`, runCommand/runResult, goodToKnow, why, `glossary: GlossaryEntry[]`, `commonProblems: string[]`, optional `fork` for the one camera-setup branch step). `lib.ts` holds two small helpers (`range`, `allLines`) used when building `newLineIndices`.
- **`sessions/00-setup.ts` … `04-hand-session-4.ts`** — all 5 sessions converted, plus **`index.ts`** combining them into `handTrackingData: HandTrackingData` and a flattened `flatSteps: FlatStep[]` (26 entries total) for ticket 03's next/previous and jump-to-any-step navigation.

**Verification (counts match source markdown exactly — nothing dropped):**

| Source file | `## Step` headings | Steps in data |
|---|---|---|
| `01-setup-environment.md` | 7 | 7 |
| `02-hand-session-1-webcam-loop.md` | 5 | 5 |
| `03-hand-session-2-landmarks-skeleton.md` | 5 | 5 |
| `04-hand-session-3-trails-gestures.md` | 4 | 4 |
| `05-hand-session-4-orb-wrapup.md` | 5 | 5 |
| **Total** | **26** | **26** |

Hand Session 4 spot-checked further: 10 `commonProblems` bullets in source ↔ 10 in data; 6 `python` code fences in source (Step 4 alone has 2, merged into one cumulative `FileSnapshot` per the data model, as designed) ↔ 5 `FileSnapshot`s, one per step.

Each cumulative code file was reconstructed from the source markdown's incremental "changed lines only" fragments via a small verification script (not shipped — scratch-only), cross-checked against each session's own "Full file so far" checkpoint and, for the final session, against the real shipped `source code/hand-tracking/hand_ar.py`. Two harmless, pre-existing discrepancies were found in the source content itself (not conversion errors) and are transcribed faithfully rather than silently reconciled, each flagged in a header comment in the affected data file:

- Hand Session 3's own markdown vs. Hand Session 4's later restatement of it: minor comment-spacing/wording differences (`SKELETON_COLOR`/`JOINT_COLOR` alignment, two explanatory comments inside `count_fingers`) — `03-hand-session-3.ts` follows Session 3's own source.
- Hand Session 4's own Step 1 "Full file so far" already shows the `print()` startup message mentioning the `'r'` reset key, even though that key isn't implemented until this same session's Step 5 — a forward-looking wording quirk already present in the approved source, transcribed as-is in `04-hand-session-4.ts`.

`npx tsc --noEmit` passes clean on the whole project with all 5 session files + `index.ts` in place.
