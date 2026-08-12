Type: prototype
Status: closed
Blocked by: 01, 02

## Question

Build the real Hand Tracking guide in this Next.js app: the step-chain node overview and individual step pages, using the Fable-approved visual direction (ticket 01) and the structured content data (ticket 02).

Covers:
- The node-chain overview component (linear sequence of connected step nodes across all 5 sessions, current/done/upcoming states, click-to-jump navigation)
- Per-device progress tracking via `localStorage` only: last-visited step and a visited-set, read on load to compute done/current/upcoming, updated on navigation. No accounts, no server-side state, nothing synced across devices — confirmed in the Fable mockup
- Each step's "New in this step" glossary rendered between the narration and "why it matters" (from ticket 02's data model) — confirmed in the Fable mockup
- **Code panel is two-part, not one giant numbered file.** Primary "Type this" view shows only the isolated new code for the current step, no absolute line numbers (a global line number is only trustworthy if the student's file matches ours exactly, which a live class can't guarantee — multiple new-code spots in one step render as separate blocks with a gap marker between them). A collapsed-by-default "Show the full file so far (N lines)" panel underneath still shows the complete numbered file with new lines highlighted, explicitly framed as a structure-comparison reference, not a literal per-line instruction. Both zones keep the no-copy/no-select behavior. Confirmed in the Fable mockup — this replaces the single-line-numbered-file approach from the previous pass.
- Code panel blocks copy/cut/right-click with an explanatory message, forcing students to type code themselves — confirmed in the Fable mockup
- The Setup track's camera-source step renders as a visual fork (Path A / Path B branches connected by smooth curves, not a hard bracket) that re-merges into the single chain before the next step — confirmed in the Fable mockup. One step in the data model, not two; this is presentation only, the only deliberate exception to the otherwise-strict linear chain
- The fork's two branches carry independent visual state, persisted via `localStorage`: whichever path the student actually clicks lights up (distinct accent color per path), the other stays dimmed — not both lighting up together. Confirmed in the Fable mockup
- The chain lives in a real, persistent left sidebar column (not a floating widget) — page is two columns: sticky chain rail on the left (own scroll, stays in view), hero + step-detail content in the remaining right-hand space. Collapsible via a header toggle, expanded by default. Confirmed in the Fable mockup.
- **Rail width resolved: ~400px, sized to content.** After seeing the full-width (1080px) version, the instructor confirmed most of that width was unused empty space — the chain's actual footprint (widest track label / fork labels) only needs ~360-400px. Rail now sized accordingly, giving the right column real room. Confirmed in the Fable mockup.
- Individual step pages/views (narration, cumulative code with new-line highlighting and syntax highlighting, "why it matters," common problems) rendered from the ticket 02 data model
- Next/previous navigation between steps, matching the sibling map's decided linear metaphor
- Responsive layout — genuinely usable on both a laptop/projector and a phone, per the destination's requirement
- Wiring routes/pages in this Next.js app (respecting `AGENTS.md`'s instruction to check `node_modules/next/dist/docs/` for this pinned pre-release Next.js version's conventions before writing routing code)

Verify in a real browser (start the dev server, click through the full step-chain from Setup through the end of Hand Tracking Session 4) before considering this resolved — not just a type-check/build pass.

**Quality bar:** this is the full product for this track, not a placeholder or MVP to revisit later — treat it with the same care as a real client-facing build. Apply the Fable direction faithfully (don't approximate it away for speed), get spacing/typography/code-block rendering genuinely right, and sweat the responsive behavior rather than leaving it "good enough on desktop." Narrow scope (Hand Tracking only) is what makes this fast — finishing quickly is not a reason to under-build what's in scope.

## Answer

Built and verified in a real browser (dev server, clicked through Setup → Hand Session 4, resized to a phone viewport, exercised every interactive piece listed below — not just a type-check pass).

**Routes** (`app/hand-tracking/`):
- `layout.tsx` — the two-column page-shell (sticky chain rail + main content), imports the design CSS
- `[stepId]/page.tsx` — one statically-generated page per step (`generateStaticParams` over all 26 `flatSteps`), hero shown only on the very first step, session-goal/instructor-notes panel on each session's first step, wrap-up/closing-framing-note panel on each session's last step, prev/next footer nav
- `page.tsx` — client-side resume redirect: reads `localStorage`, sends returning visitors to their last-visited step, first-time visitors to Setup Step 1
- root `app/page.tsx` now redirects to `/hand-tracking`

**Components** (`app/hand-tracking/components/`): `ChainRail` (the full node-chain — tracks, links, tooltip, legend, collapse toggle, progress persistence), `ChainForkNode` (the camera-source fork's SVG curves + two independently-stateful branch nodes), `StepDetail`, `FileCodePanel` (isolated "type this" new-line groups + collapsible numbered full-file reference), `CommandBlockView`, `ForkPaths`, `StepNav`, `NoCopyWrapper`.

**Visual direction**: ported the approved Fable mockup's CSS almost verbatim (`hand-tracking.css`) — same color tokens, typography, node/link/fork styling, glow/pulse effects, code panel and glossary layout. Fetched and read the full mockup source (not just the written spec) to get this pixel-faithful rather than approximated.

**One real scope note, flagged rather than silently resolved:** the ticket's own bullet list mentions "syntax highlighting," but the approved mockup never actually demonstrated tokenized/multi-color Python syntax highlighting — every code sample in it renders as plain single-color monospace text, with only the diff-style new-line highlighting (magenta) actually built and approved. Since ticket 01's mockup is the approval record and it doesn't show real syntax coloring, I implemented exactly what was approved (new-line highlighting, no per-token color) rather than inventing a syntax-highlighting design the instructor never saw. Adding one later (e.g. Shiki, statically at build time since all content is static) is a clean, separable follow-up if wanted — noted here rather than added to Not yet specified, since it's a small enhancement, not an open design question blocking the destination.

**A real bug found and fixed during browser verification:** visiting the bare `/hand-tracking` index route briefly mounted `ChainRail` (via the layout) before the index page's own client-side resume-redirect could read `localStorage` — `ChainRail`'s progress-save effect was firing with the fallback flatIndex (0) first, clobbering the real last-visited step every time before the redirect ran, so returning visitors always got bounced to Setup Step 1 instead of resuming. Fixed by having `ChainRail` only write progress when the current pathname resolves to a real step id, never on the bare index route. Verified via `localStorage` inspection before/after.

Responsive behavior (checked at 1440px and a 390px phone viewport), the camera fork's independent branch state (chosen path colored, other path dimmed, persisted across navigation), the collapsible full-file reference with correct new-line highlighting at the real (large) line counts from Hand Session 4, no-copy/right-click blocking with the toast message, and next/previous navigation (including the absent-"Next" case on the very last step) were all exercised live and behave correctly. `npx tsc --noEmit` and `npx next build` both pass clean (26/26 static step pages generated).
