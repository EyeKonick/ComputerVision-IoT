Type: prototype
Status: claimed
Blocked by: 06

## Question

Draft the full teaching content for **Face Tracking — Session 2**: the sci-fi HUD styling and face mesh overlay. Covers `draw_corner_brackets` (targeting-reticle box instead of a plain rectangle), `draw_glow_line`, `draw_scan_line` (the animated sweep), adding `mp_face_mesh.FaceMesh` alongside the existing `FaceDetection`, and drawing `FACEMESH_TESSELATION` + `FACEMESH_CONTOURS` via `mp_drawing.draw_landmarks`.

Break into small logical-chunk steps. For each: what it does, why (e.g. why detection and mesh are two separate MediaPipe solutions running together rather than one), and common problems (mesh landmarks lagging behind the detection box since they're separate passes, performance drop running both solutions at once on weaker machines, brackets drawn outside frame bounds near screen edges without clamping).

Show the full cumulative file at each step with new lines highlighted. Output the full drafted content as this ticket's answer.
