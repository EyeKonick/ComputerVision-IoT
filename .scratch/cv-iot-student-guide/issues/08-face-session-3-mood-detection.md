Type: prototype
Status: open
Blocked by: 07

## Question

Draft the full teaching content for **Face Tracking — Session 3**: the mood detection heuristic. Covers `mouth_metrics()` (normalizing mouth width/height/corner-lift by inter-eye distance), the calibration flow (`mood_calibrating`, `MOOD_CALIBRATION_FRAMES`, averaging a neutral baseline), and `classify_mood()` (SURPRISED via absolute mouth-openness threshold; HAPPY/SAD relative to the calibrated per-person baseline).

Break into small logical-chunk steps. For each: what it does, why (e.g. why measurements are normalized by inter-eye distance instead of raw pixels — so it works regardless of distance from camera; why HAPPY/SAD are relative to a calibrated baseline instead of a fixed threshold — resting mouth shape varies a lot between people, unlike mouth-openness for SURPRISED which is roughly universal), and common problems (calibrating with a non-neutral face skewing the baseline, mood flickering between classifications near a threshold boundary, forgetting to recalibrate after a different person sits down).

Show the full cumulative file at each step with new lines highlighted. Output the full drafted content as this ticket's answer.
