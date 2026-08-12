Type: prototype
Status: resolved
Blocked by: 02

## Question

Draft the full teaching content for **Hand Tracking — Session 2**: adding real hand detection to the Session 1 skeleton loop. Covers creating the `vision.HandLandmarker` from `HandLandmarkerOptions` (video running mode, `num_hands=2`, confidence thresholds), converting each frame to `mp.Image`/RGB and calling `detect_for_video`, extracting `pts` (pixel-space landmark points) per detected hand, and drawing the neon glow skeleton (`glow_line`/`glow_circle` over `HAND_CONNECTIONS` and joints) onto the `overlay_layer`, composited back with `cv2.addWeighted`.

Break into small logical-chunk steps (loading the model, running detection per frame, drawing connections, drawing joints, compositing the overlay). For each: what it does, why (e.g. why detection runs on an `overlay_layer` instead of the frame directly, why `VIDEO` running mode needs a timestamp), and common problems (model file fails to download / no internet on first run, landmarks index out of range if hand partly out of frame, low FPS on weaker machines, confusing `hand_landmarks` list order with `handedness`).

Show the full cumulative file at each step with new lines highlighted. Output the full drafted content as this ticket's answer.

## Answer

Full drafted content: [`content/03-hand-session-2-landmarks-skeleton.md`](../content/03-hand-session-2-landmarks-skeleton.md) — 5 steps (load the model → run detection per frame → extract landmarks + draw skeleton lines → draw joint dots → composite the glow onto the camera image). Flags for the instructor that Steps 3–4 produce no visible on-screen change until Step 5's composite. Reviewed and approved without requested changes.

**Amendment (glossary pass):** every step now has a "New in this step" section (plain-language definitions — `mediapipe`/`HandLandmarker`, `cv2.cvtColor`, `numpy`/`np.zeros_like`, list comprehensions, `cv2.line`/`cv2.circle`, `cv2.addWeighted`), placed after the code and before "Why it matters."
