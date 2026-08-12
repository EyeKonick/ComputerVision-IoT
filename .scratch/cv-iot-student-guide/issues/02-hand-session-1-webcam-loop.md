Type: prototype
Status: resolved
Blocked by: 01

## Question

Draft the full teaching content for **Hand Tracking — Session 1**: the foundation of `source code/hand-tracking/hand_ar.py` — imports, config constants, `ensure_model()` (downloading `hand_landmarker.task` on first run), opening the webcam with `cv2.VideoCapture`, and the bare `while True` capture-and-display loop with flip, quit key handling, and cleanup (`cap.release()`, `cv2.destroyAllWindows()`).

Stop before any MediaPipe hand-detection logic — this session ends with a plain mirrored webcam window that quits on `q`/ESC, nothing detected yet.

Break it into small (~5–20 line) logical-chunk steps. For each step: what it does, why (e.g. why `cv2.flip(frame, 1)` for a mirror effect, why `& 0xFF` on the key code), and common problems (webcam index wrong / already in use by another app, `cap.isOpened()` false, window opens but freezes without `cv2.waitKey`, forgetting `cap.release()` leaving the camera locked).

Show the full cumulative file at each step with new lines highlighted. Output the full drafted content as this ticket's answer.

**Note (from [Camera source for lab computers](11-camera-source-lab-computers.md)):** the webcam-open step now teaches `CAM_SOURCE` (int index or URL string, opened via the `isinstance` branch already in `hand_ar.py`), not a hardcoded index — students already met this exact pattern in the Setup & Environment session's Step 7, so this step can reference it rather than re-teach it from scratch.

## Answer

Full drafted content: [`content/02-hand-session-1-webcam-loop.md`](../content/02-hand-session-1-webcam-loop.md) — 5 steps (imports/config → `ensure_model()` → open camera via `CAM_SOURCE` → capture/mirror/show loop → quit handling + cleanup). Ends with a plain mirrored camera window that quits cleanly on `q`/Esc, nothing detected yet, matching the ticket's stop point.

Established the cumulative-code convention used for the rest of the guide: each step shows the full growing file with newly-added lines marked `# ← new`. Also pulled `ensure_model()` into this session (model auto-download) even though detection logic itself is still Session 2, per the ticket's explicit scope — Session 2 now only adds detection, not a restructure. Reviewed and approved without requested changes.

**Correction (found during the deploy-effort design review):** Step 1 originally jumped straight to "Code so far" without ever telling the student to create `hand_ar.py` as a new file — the Setup session's Step 7 explicitly says "Type (new file `hello_webcam.py`)" but this step didn't have the equivalent. Fixed: Step 1 now opens with "Type (new file `hand_ar.py`, in the same project folder as `hello_webcam.py`...)". Face Tracking Session 1 (on this same map) likely has the identical gap at its own Step 1 — not fixed yet since Face Tracking isn't in the current deploy scope, but flagged here so it isn't forgotten when that track resumes.

**Amendment (glossary pass):** every step now has a "New in this step" section (plain-language definitions of new symbols/functions — `os.path.join`, `def`, `main()`, `while True`, `cv2.flip`, `cv2.waitKey`, etc.), placed after the code and before "Why it matters." Deliberately skips re-defining `isinstance`/`cv2.VideoCapture` in Step 3 since those were already covered in the Setup session — points back instead of repeating.
