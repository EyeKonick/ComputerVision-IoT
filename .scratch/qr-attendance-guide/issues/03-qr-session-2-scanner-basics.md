Type: task
Status: open
Blocked by: 02

## Question

What does **QR Session 2 — Scanner basics** teach, step by step? Draft and
build in one pass: `data/sessions/02-qr-session-2.ts`, markdown saved to
`.scratch/qr-attendance-guide/content/02-qr-session-2-scanner-basics.md`.

Starts `qr_scanner.py` as a new file. Ground to cover, at minimum:

- imports, `CAM_SOURCE` (personalised from QR's own chooser), opening the
  camera with the `CAP_DSHOW` retry, 1280×720
- the capture loop, `imshow`, `waitKey`, `Q`/`ESC` quit, cleanup
- `cv2.QRCodeDetector().detectAndDecode` — what `data` and `points` are
- **detect on the original frame, then mirror**: `cv2.flip(frame, 1)` and
  mirroring the corner points (`w - 1 - x`) so the outline still lines up;
  why the detector gets the unmirrored frame
- drawing the outline around the detected code (a simpler form of
  `draw_qr_outline` is fine here if Session 4 completes it — any stand-in
  must be reconciled by Session 4)
- **the first scan test** — the two-way "how to show your card" choice
  (laptop: phone to webcam; lab PC: PC monitor (recommended) / printed /
  classmate's phone), with glare, moiré, too-small, too-far, and
  mirrored-card common problems

Sessions 2–4 are one growing file: choose step order so later sessions'
additions stay insertions where possible, and record every stand-in that
Session 4 must replace in this ticket's answer. Full glossary and common
problems per step. Verify py_compile per step + in-browser, then commit and
push.
