Type: prototype
Status: resolved
Blocked by: 07

## Question

Draft the full teaching content for **Face Tracking — Session 3**: the mood detection heuristic. Covers `mouth_metrics()` (normalizing mouth width/height/corner-lift by inter-eye distance), the calibration flow (`mood_calibrating`, `MOOD_CALIBRATION_FRAMES`, averaging a neutral baseline), and `classify_mood()` (SURPRISED via absolute mouth-openness threshold; HAPPY/SAD relative to the calibrated per-person baseline).

Break into small logical-chunk steps. For each: what it does, why (e.g. why measurements are normalized by inter-eye distance instead of raw pixels — so it works regardless of distance from camera; why HAPPY/SAD are relative to a calibrated baseline instead of a fixed threshold — resting mouth shape varies a lot between people, unlike mouth-openness for SURPRISED which is roughly universal), and common problems (calibrating with a non-neutral face skewing the baseline, mood flickering between classifications near a threshold boundary, forgetting to recalibrate after a different person sits down).

Show the full cumulative file at each step with new lines highlighted. Output the full drafted content as this ticket's answer.

## Answer

Full drafted content: [`content/08-face-session-3-mood-detection.md`](../content/08-face-session-3-mood-detection.md) — 4 steps (measure the mouth with `mouth_metrics()` → decide the mood with `classify_mood()` → calibrate a neutral baseline on `E` → show the coloured `MOOD:` readout and recalibrate on `R`). Instead of a separate sign-off pass, it was drafted and transcribed into real app pages in the same session on [Face Session 3 build](../../hand-tracking-deploy/issues/16-face-session-3-mood-detection-build.md), with every step's cumulative file verified to `py_compile`. Includes the common-problems the ticket named (non-neutral calibration, flicker near a threshold, forgetting to recalibrate for a new person) plus ones found while reading the source: a `NameError` that only surfaces two steps after the missing `import math`, Caps Lock defeating `ord("e")`, calibration sampling only the first face while the label runs for every face, and SURPRISED firing on speech. Glossary entries still not authored (see the map's Notes).
