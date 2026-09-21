Type: task
Status: resolved
Blocked by: 14

## Question

Build **Face Tracking Session 2** (sci-fi HUD reticle, animated scan line,
confidence label, and the `FaceMesh` overlay) as real pages under
`app/facial-recognition/`, continuing the pattern ticket 14 established for
Session 1: `app/facial-recognition/data/sessions/02-face-session-2.ts`
wired into `data/index.ts`.

Content source: `../cv-iot-student-guide/content/07-face-session-2-hud-mesh.md`.
That content ticket was still marked "claimed" (not "resolved") going into
this one — the markdown itself read as complete and instructor-quality, so
building from it and formally resolving that ticket happened together here
rather than blocking on a separate sign-off pass. Flagged explicitly rather
than silently assumed.

## Answer

Added `data/sessions/02-face-session-2.ts` (4 steps) and wired it into
`faceTrackingData` in `data/index.ts`. Also made the hero stat block on
`[stepId]/page.tsx` read `faceTrackingData.length` instead of a hardcoded
`1`, since it's no longer a single-session track.

**A real reconstruction problem, solved and verified, not just transcribed:**
the source markdown never shows Session 2's steps 1-3 as a full cumulative
file — only step 1 (full file) and step 4 (full file, end of session) are
shown whole; steps 2-3 show only an isolated new helper function plus
"changed lines only" diffs, the same convention used elsewhere. But unlike
every other multi-step session built so far, the step 4 full-file listing
here shows `draw_hud_text` (added in step 3) positioned *before*
`draw_scan_line` (added in step 2) among the module's helper functions —
meaning a step's new function isn't always appended at the end of the
existing ones. Reconstructed step 2's and step 3's own full files by
inferring self-consistent placement (step 2 appends `draw_scan_line` after
`draw_corner_brackets`; step 3 inserts `draw_hud_text` *between*
`draw_corner_brackets` and `draw_scan_line`) chosen specifically because it
reproduces step 4's confirmed exact ordering. Verified by extracting all
four steps' full code strings and running `python -m py_compile` on each —
all four compile cleanly, confirming both the inferred ordering and every
indentation level (including the two chained `with ... as ..., ... as
...:` context managers in step 4) are real, working Python, not just
visually plausible.

Verified live in-browser: walked all 4 steps in order, confirmed Session 2
is revealed in the chain rail only once Session 1's last step is visited
(the multi-session reveal logic, previously untested since Session 1 was
the only session in the data), confirmed the cross-guide `CAM_SOURCE`
personalization still applies, confirmed all 6 of step 4's separate
new-line groups (constants, `mp_face_mesh` var, `mp_drawing`/`mp_styles`
vars, the chained `with` header, `mesh_results = face_mesh.process(rgb)`,
and the 20-line mesh-drawing block) render as 6 distinct "Type this"
groups matching the reconstructed `newLineIndices`. `next build` — clean
TypeScript pass, all 8 `face-s1-*`/`face-s2-*` steps statically generated.
No console errors/warnings.

Also marked the sibling map's [Face Tracking Session 2](../../cv-iot-student-guide/issues/07-face-session-2-hud-mesh.md)
content ticket resolved (was "claimed") — see that ticket's Answer for why
that housekeeping happened here rather than as a separate pass.
