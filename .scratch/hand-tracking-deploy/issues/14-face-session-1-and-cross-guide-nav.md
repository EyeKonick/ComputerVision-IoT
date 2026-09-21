Type: task
Status: resolved
Blocked by: 03

## Question

Extend this map's scope (per the "Extend scope now" decision — see map Notes)
to include the Facial Recognition track: build **Face Tracking Session 1**
as a real page under `app/facial-recognition/`, mirroring the architecture
ticket 03 already built for Hand Tracking exactly (own `data/`, `lib/`,
`components/`, layout, chain rail, lock-guard, no-copy code panels,
`localStorage` progress) — and add navigation so a student can switch
between the two guides.

Only Face Tracking Session 1 is in scope here — it's the only Face Tracking
session whose content is closed/instructor-approved on the sibling
[CV/IoT Student Guide map](../../cv-iot-student-guide/map.md) (Session 2 is
still an open/claimed content ticket there). Sessions 2–4 get their own
tickets here once their content closes.

## Answer

Built `app/facial-recognition/` as a structural mirror of
`app/hand-tracking/` (own `data/types.ts`, `data/lib.ts`,
`data/sessions/01-face-session-1.ts` transcribed from
`../cv-iot-student-guide/content/06-face-session-1-webcam-detection.md`,
`data/index.ts`, `lib/progress.ts`, `lib/code.ts`, `lib/camSource.ts`, and
every component from `ChainRail` down to `NoCopyWrapper`) plus its own
`layout.tsx`, `page.tsx`, and `[stepId]/page.tsx`. CSS is a byte-for-byte
copy of `hand-tracking.css` with every `ht-` class prefix mechanically
renamed to `fr-` (verified zero collisions) — same near-black/magenta-cyan-
amber visual system, no new design decisions made.

Real content differences from Hand Tracking's own build (ticket 02/03),
found and decided while building rather than guessed:

- **Per-track independent progress.** Facial Recognition gets its own
  `localStorage` key (`frg_progress_v1`, vs. Hand Tracking's
  `htg_progress_v1`) — a student can be mid-way through one track without
  affecting the other's step-lock state. Chosen over a single shared
  progress store to avoid touching Hand Tracking's already-shipped storage
  schema and because the two tracks' step counts/identities are unrelated.
- **Cross-guide `CAM_SOURCE` personalization, read-only.** Face Session 1
  has no camera-source fork of its own (that fork lives once, in the shared
  Setup session under Hand Tracking). `app/facial-recognition/lib/progress.ts`
  adds `loadSharedCameraPath()`, a read-only peek at Hand Tracking's own
  `htg_progress_v1` key for the Setup fork's stored choice (`forkChoices["setup-6"]`).
  `FileCodePanel` uses it the same way Hand Tracking's own panel uses its
  local fork choice. Verified live: choosing Path A in Hand Tracking's
  Setup, then opening Face Session 1 Step 1, shows
  `CAM_SOURCE = 0  # laptop webcam (your path: A)` with no separate
  camera-path prompt in Face Tracking. Never written back from this side.
- **Fixed the same "missing new-file callout" gap ticket 06 already fixed
  for Hand Tracking's own Step 1** — the source markdown's Step 1 has no
  explicit "create face_tracker.py" instruction; added a `newFileNote`
  matching `hand_ar.py`'s own callout, since the map's Notes already
  flagged this as a known needed fix "whenever that track resumes."
- **Glossary left empty.** The sibling map's Notes already flag that the
  "New in this step" glossary pass was never applied to Face Tracking.
  Authoring it is real content work needing instructor review (same
  process as any other content revision), out of scope for this
  structural-build ticket — left as `glossary: []` on all 4 steps rather
  than guessed. Flagged below in Not yet specified.
- **No troubleshooting sub-pages.** Ticket 07/08/09/10's troubleshooting
  system (dedicated sub-pages, `STUCK_LINK_STEPS` wiring, the A/B/C
  prototype variants) is Hand-Tracking-track-specific scope; `StepDetail`/
  `CommonProblems` here are the same components minus that wiring. Not
  reopened as a decision — no research/content exists yet to link to for
  Face Tracking.

**Cross-guide navigation:** each track's `ChainRail` header now shows a
"↔ Switch to \<other track\> guide" link (`.ht-track-switch-link` /
`.fr-track-switch-link`, new CSS added to both stylesheets). Root
`app/layout.tsx` metadata updated from "ITE 3 — Hand Tracking Guide" to
"ITE 3 — CV/IoT Student Guide" since it's no longer accurate to name one
track only; `app/page.tsx`'s redirect to `/hand-tracking` as the default
landing route is unchanged.

Verified live in-browser (`next build` — clean TypeScript pass, all 4
`face-s1-*` steps statically generated; `next dev` — walked all 4 steps,
confirmed lock-guard redirects an out-of-order direct URL visit back to the
furthest unlocked step, confirmed the multi-group code-diff rendering on
Step 3's four separate insertions, confirmed the cross-guide switch link
both directions, confirmed cross-guide `CAM_SOURCE` personalization end to
end). No console errors/warnings on either track.
