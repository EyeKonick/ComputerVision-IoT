Type: prototype
Status: resolved
Blocked by: 06

## Question

Draft the full teaching content for **Face Tracking — Session 2**: the sci-fi HUD styling and face mesh overlay. Covers `draw_corner_brackets` (targeting-reticle box instead of a plain rectangle), `draw_glow_line`, `draw_scan_line` (the animated sweep), adding `mp_face_mesh.FaceMesh` alongside the existing `FaceDetection`, and drawing `FACEMESH_TESSELATION` + `FACEMESH_CONTOURS` via `mp_drawing.draw_landmarks`.

Break into small logical-chunk steps. For each: what it does, why (e.g. why detection and mesh are two separate MediaPipe solutions running together rather than one), and common problems (mesh landmarks lagging behind the detection box since they're separate passes, performance drop running both solutions at once on weaker machines, brackets drawn outside frame bounds near screen edges without clamping).

Show the full cumulative file at each step with new lines highlighted. Output the full drafted content as this ticket's answer.

## Answer

Full drafted content: [`content/07-face-session-2-hud-mesh.md`](../content/07-face-session-2-hud-mesh.md) — 4 steps (corner-bracket reticle replacing the plain box → animated scan-line sweep → "FACE LOCK" confidence label → the `FaceMesh` overlay, chained alongside `FaceDetection`). Marked resolved when [Face Session 2 & cross-guide nav](../../hand-tracking-deploy/issues/15-face-session-2-hud-mesh-build.md) transcribed it into real app pages and every step's cumulative Python file was verified to `py_compile` cleanly (confirms the "full file so far" reconstructions — including where each step's new helper function lands among the others — are syntactically real, not just plausible-looking).
