Type: prototype
Status: resolved
Blocked by: 01

## Question

Draft the full teaching content for **Face Tracking — Session 1**: the foundation of `source code/facial-recognition/face_tracker.py` — imports, opening the webcam (with the `CAP_DSHOW` fallback pattern), the capture loop with flip and BGR→RGB conversion, creating `mp_face_detection.FaceDetection`, running `face_detection.process(rgb)`, and drawing a plain bounding box per detected face (before the corner-bracket/HUD styling arrives in Session 2).

Break into small logical-chunk steps. For each: what it does, why (e.g. why MediaPipe needs RGB while OpenCV reads/shows BGR, why `rgb.flags.writeable = False` is set before processing), and common problems (webcam opening under `CAP_DSHOW` failing on some systems — hence the plain fallback, face not detected at extreme angles or low light, confusing `relative_bounding_box` fractional coordinates with pixel coordinates).

Show the full cumulative file at each step with new lines highlighted. Output the full drafted content as this ticket's answer.

**Note (from [Camera source for lab computers](11-camera-source-lab-computers.md)):** the webcam-open step now teaches `CAM_SOURCE` (int index or URL string) instead of a hardcoded `0`, matching the `isinstance` branch already in `face_tracker.py`. Students already met this exact pattern in the Setup & Environment session's Step 7, so this step can reference it rather than re-teach it from scratch.

## Answer

Full drafted content: [`content/06-face-session-1-webcam-detection.md`](../content/06-face-session-1-webcam-detection.md) — 4 steps (imports/config/camera-open with the extra `CAP_DSHOW` retry → capture loop, kept brief since it repeats Hand Tracking Session 1's pattern → load `FaceDetection` + run per frame → draw a plain bounding box). Reviewed and approved without requested changes.
