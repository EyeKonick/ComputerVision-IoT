Type: task
Status: resolved
Blocked by: 15

## Question

Build **Face Tracking Session 3** (mood detection: `mouth_metrics()`, the
neutral-face calibration flow, `classify_mood()`) as real pages under
`app/facial-recognition/`, continuing the pattern tickets 14 and 15
established: `app/facial-recognition/data/sessions/03-face-session-3.ts`
wired into `data/index.ts`.

The content ticket on the sibling map
([Face Tracking Session 3](../../cv-iot-student-guide/issues/08-face-session-3-mood-detection.md))
is still open — nothing is drafted. Same situation ticket 15 handled: draft
the content from `source code/facial-recognition/face_tracker.py` and
transcribe it into real pages in one pass, then resolve both tickets
together (flagged explicitly rather than silently assumed).

## Answer

Drafted and built together, as ticket 15 did. Content lives in
[`content/08-face-session-3-mood-detection.md`](../../cv-iot-student-guide/content/08-face-session-3-mood-detection.md);
the app data is `app/facial-recognition/data/sessions/03-face-session-3.ts`,
wired into `faceTrackingData` in `data/index.ts`. Nothing else needed
changing — the chain rail, step pages and hero stats are all data-driven.

**Four steps**, ordered so every cumulative file re-indents nothing the
student already typed:

1. **Measure the mouth** — `import math`, the six `LM_*` landmark indices,
   `mouth_metrics()` (width / height / corner lift, each divided by the
   inter-eye distance).
2. **Decide the mood** — the `MOOD_*` thresholds and `classify_mood()`
   (SURPRISED absolute; HAPPY/SAD relative to a baseline).
3. **Calibrate to a neutral face** — `MOOD_CALIBRATION_FRAMES`,
   `landmarks_bounding_box()`, the calibration state variables, the
   20-frame averaging block, the `CALIBRATING...` label and the `E` key.
4. **Show the mood, recalibrate with R** — `MOOD_COLORS`, the `else:` branch
   that draws `MOOD: ...`, and the `R` key.

Steps 1–2 have no visible effect (functions nothing calls yet); the first
visible change is Step 3's counter and the first mood label is Step 4.
Said out loud in the session's instructor notes rather than hidden.

**Verified, not just transcribed.** The four files were generated from
Session 2's step-4 file by scripted insertions (so no hand-copy drift), then:

- all four cumulative files pass `python -m py_compile`;
- every line of Session 3's final file exists verbatim in
  `source code/facial-recognition/face_tracker.py` except the known
  Session 1–2 stand-ins (`PRIMARY_COLOR` / `ACCENT_COLOR` / `MESH_COLOR`,
  the literal window title, the `print(...)` line) — those are Session 4's
  job, recorded on [ticket 17](17-face-session-4-themes-controls-build.md);
- `tsc --noEmit` and `eslint` clean;
- live in the browser: Session 3 appears in the chain rail only after
  Session 2's last step, the three rows read left→right / right→left /
  left→right, Step 3's "Type this" panel renders 6 correct line groups.

**Not done, flagged:** `glossary: []` on every step — same outstanding
Face Tracking glossary pass as Sessions 1–2 (see map Not yet specified).
The `mood_calibration` comment in the source (`see mood_calibration
below`) refers to a name that doesn't exist — copied verbatim, since the
comment is the source's, not ours.

Also marked the sibling map's
[Face Tracking Session 3](../../cv-iot-student-guide/issues/08-face-session-3-mood-detection.md)
content ticket resolved.
