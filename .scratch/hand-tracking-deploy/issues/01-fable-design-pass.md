Type: prototype
Status: resolved
Blocked by: (none)

## Question

Run a Fable design pass for the Hand Tracking guide's visual direction, before building real pages.

Deliver a concrete visual direction the instructor can react to and approve, covering:
- The step-chain node overview (how connected steps look as a sequence — colors, node states for done/current/upcoming, how "jump to any step" reads visually)
- A representative individual step page (session goal, narration/"why it matters" prose, a code block with cumulative code and highlighted new lines, a common-problems callout) — using real content from one of the five already-drafted sessions as the stand-in, not lorem ipsum
- Typography, color palette (dark-mode-first given it's a code-heavy technical guide, but confirm), and how it reads on both a large projector/laptop screen and a phone

Use the Fable model (available via the Agent tool's `model: "fable"` parameter) to produce this directly in this Claude Code session — no separate external tool or hand-off needed. Present the result for instructor approval before ticket 03 (the real build) begins.

## Answer

Delivered as a published, interactive mockup (not a static screenshot) — iterated live with the instructor across several rounds.

**Design tokens:**
- **Color** — near-black ground (`#0A0D12`); three accents pulled directly from `hand_ar.py`'s own on-screen colors: magenta `#FF2E9C` (skeleton/primary), cyan `#29E1FF` (connections/links), amber `#FFC13C` (the orb — reused as the "current step" marker, including its exact `math.sin(time.time()*4)` idle-pulse). Neutrals: panel `#12171F`, hairlines `#212B38`/`#2C394A`, text `#E9EDF3`/`#9AA5B4`/`#5C6779`.
- **Type** — monospace for step counters/labels/code (reads like the scripts' own HUD text); system sans for narration prose (monospace paragraphs are hard to read at length). Mockup uses system font stacks for CSP portability; real build should self-host proper distinctive faces via `next/font`.
- **Layout / signature element** — the navigation itself is drawn like a hand-landmark skeleton: small nodes connected by thin glowing lines, grouped into the 5 sessions — reusing the exact visual language students draw over their own hand, not a generic progress bar or numbered timeline.

**Decisions confirmed through review, all now recorded on the map and downstream tickets:**
- Progress tracking is per-device only via `localStorage` (no accounts, nothing synced) — demonstrated live in the mockup (click a node, refresh, it resumes).
- Every step gets a "New in this step" plain-language glossary, separate from "why it matters" — format approved here, then authored across all 26 real steps (see ticket 02 / the sibling map).
- Code blocks block copy/cut/right-click, forcing students to type — demonstrated live in the mockup with an explanatory toast message.
- Fixed a real content gap surfaced during review: Hand Tracking Session 1's Step 1 was missing the instruction to create `hand_ar.py` as a new file — fixed in the source content (sibling map, ticket 02's answer).

**Addendum:** added a visual fork/merge to the node-chain for the Setup track's camera-source step (Path A · Laptop / Path B · Phone, connected by smooth flowing curves rather than a hard bracket, re-merging before the next step) — the one deliberate exception to the otherwise strictly linear chain, since it's a real split in that step's content, not an alternate route through the guide. The two branches carry independent, `localStorage`-persisted visual state — whichever path the student actually took lights up in its own accent color, the other stays dimmed, rather than both reacting together. Demonstrated live in the mockup.

Mockup published at `https://claude.ai/code/artifact/0ef32d70-0ff0-4bf9-a42c-4d19748a630d` (private Claude artifact). Approved by the instructor as the direction for ticket 03.
