Type: task
Status: resolved
Blocked by: 16

## Question

Build **Face Tracking Session 4** (themes, screenshots, remaining controls,
wrap-up polish — the step that completes `face_tracker.py`) as real pages
under `app/facial-recognition/`: `data/sessions/04-face-session-4.ts` wired
into `data/index.ts`. Same shape as ticket 16: the sibling map's
[Face Tracking Session 4](../../cv-iot-student-guide/issues/09-face-session-4-themes-controls-wrapup.md)
content ticket is still open, so draft-and-build together and resolve both.

Things already known that the ticket must handle (found while doing
Session 3, not decided yet):

- Session 4's cumulative files must end **exactly** at
  `source code/facial-recognition/face_tracker.py`. Sessions 1–3 use
  simplified stand-ins that the real file replaces: `PRIMARY_COLOR` /
  `ACCENT_COLOR` / `MESH_COLOR` constants → the `THEMES` list and
  `theme["primary"]` etc.; the literal `"AR Face Tracker"` window title →
  `WINDOW_NAME`; the `print(...)` startup line is not in the real file;
  `det_results` is processed *before* `mesh_results` in Sessions 1–3 but the
  real file processes `mesh_results` first.
- Adding the `M` / `B` toggles wraps existing mesh and reticle code in
  `if show_mesh:` / `if show_box:`, which **re-indents** lines students
  already typed. Call that out in the step instead of hiding it.
- The wrap-up needs the "biometric-logging flavor / no named-person
  recognition / privacy and consent" framing note (see the content ticket).
- Imports: Session 3 adds `import math`; Session 4 adds `import ctypes`
  above it and `import time` below it to match the real file's order.
- `force_window_focus` is Windows-only (`ctypes.windll`).

## Answer

Drafted and built together, as tickets 15 and 16 did. Content:
[`content/09-face-session-4-themes-controls-wrapup.md`](../../cv-iot-student-guide/content/09-face-session-4-themes-controls-wrapup.md).
App data: `app/facial-recognition/data/sessions/04-face-session-4.ts`, wired
into `faceTrackingData` in `data/index.ts`. **The Face Tracking track is now
complete: 4 sessions, 18 steps.**

**Six steps**, ordered so the visible payoff comes early and the legend on
the bottom bar is only introduced once every key it lists exists:

1. **Colour themes** — `THEMES` replaces `PRIMARY_COLOR` / `ACCENT_COLOR` /
   `MESH_COLOR`, `C` cycles, plus the top HUD bar so the theme name is visible.
2. **Mesh / box switches (`M`, `B`)** — wraps existing drawing code in
   `if show_mesh:` / `if show_box:`, so those lines **re-indent**. Called out
   in the session's instructor notes and in the step's own `say` / common
   problems (IndentationError, VS Code Tab tip) rather than hidden.
3. **Screenshots (`S`)** — `shot_count`, `cv2.imwrite`.
4. **Window focus (`F`)** — `WINDOW_NAME`, `force_window_focus`, `namedWindow`
   (replaces the startup `print`), focus call at frame 5. Windows-only,
   stated plainly. Also flags the honest design flaw that `F` can only help
   while the window still receives some keys.
5. **Bottom bar** — FPS smoothing (`0.9 * fps + 0.1 * (1.0 / dt)`),
   `face_count`, key legend.
6. **Tidy up** — docstring, section banners, fuller `CAM_SOURCE` note, URL
   comment, and the `mesh` / `detection` `.process()` order swap. No
   behaviour change; explained as such.

The session's `closingFramingNote` carries the required framing: mood/mesh
is "biometric logging" flavour, named-person recognition is **not**
implemented and is only a marked future extension, plus the
privacy/consent/ethics angle.

**Verified, not just transcribed.**

- Each step was generated from the previous one by scripted edits starting
  from Session 3's final file; all six cumulative files pass
  `python -m py_compile`.
- **Step 6 is byte-identical to `source code/facial-recognition/face_tracker.py`**
  (396 lines, compared with line endings normalised) — so the Session 1–3
  stand-ins ticket 16 flagged are all reconciled.
- `tsc --noEmit` clean. ESLint reports 4 errors, all in
  `ChainRail.tsx` / `ForkPathChooser.tsx` and in patterns that were already
  there (`setState` in an effect, a render-time counter) — none in the new
  data files; not touched here.
- Live in the browser: Session 4 appears after Session 3, the four rows
  alternate left→right / right→left / left→right / right→left, Step 6 shows
  "Show the full file so far (396 lines)", the framing note renders, no
  console errors or warnings.

**Side effect on Session 3, deliberate:** moved `show_mood = False` above
`frame_count = 0` in Session 3's step 3 so that Session 4's new state
variables (`show_mesh`, `show_box`, `theme_idx`, `shot_count`, `prev_time`,
`fps`) drop into the finished file's exact order as pure insertions instead
of forcing an extra reordering step. Session 3 regenerated; still compiles.
Also added a blank line Session 4's Step 2 needed to match the real file.

**Not done, flagged:** glossary is `glossary: []` on every Face Tracking
step (all 4 sessions) — the outstanding content pass. Sessions 1–2's own
placeholders (`PRIMARY_COLOR` etc., the literal window title) were left as
approved and reconciled in Session 4 rather than edited retroactively. The
sibling ticket for this session was resolved together with this one.
