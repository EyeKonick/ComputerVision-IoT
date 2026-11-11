Type: task
Status: closed
Assignee: EyeKonick
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

## Answer

Built in one pass. Data: `data/sessions/02-qr-session-2.ts`. Record: [content/02-qr-session-2-scanner-basics.md](../content/02-qr-session-2-scanner-basics.md).

**4 steps:**
1. Create `qr_scanner.py`: `WINDOW_NAME`, `CAM_SOURCE`, `main()` with the `CAP_DSHOW` retry, 1280×720, the loop, Q/ESC, cleanup and the guard. `WINDOW_NAME` comes in here instead of Session 4, which avoids a stand-in for the `imshow` title.
2. `QRCodeDetector` + `detectAndDecode` on the unmirrored frame, with a stand-in print.
3. **First scan test**, a fork step (`qr-s2-3`, `QR_SHOW_CARD_FORK_STEP_ID`). Path A: laptop, phone shows the card. Path B: phone is the camera, so PC monitor (recommended) / printed / classmate's phone. It pre-selects from the camera choice, with common problems for glare, moiré, too small, too far, too close, and a mirrored photo.
4. Mirror the corner points (`w - 1 - x`) + outline.

**Stand-ins recorded for later sessions (all reconciled):**
- `print("Scanned:", data)` (Step 2). Moved into the cooldown `if` in S3 Step 2, then replaced by the `handle_scan` call in S3 Step 4.
- `draw_qr_outline(frame, points, (0, 255, 0), "")` (Step 4). Replaced by the `last_color, last_label` call in S3 Step 4.
- `draw_qr_outline` short form: the real file's first two body lines. S4 Step 4 completes it with insertions only.

**Verified:** all snapshots were built from line subsets of the real script plus the named stand-ins. Every step's cumulative file passes `py_compile`, and every step was *run*: generator steps executed in a temp folder, and scanner steps ran `main()` with a fake camera feeding frames that contain real generated cards. That run checked the console output, the `attendance.csv` rows and the rendered frames. Also passing: `tsc` and `next build` (80 static pages), plus an in-browser check at 1440px and phone width (no overflow, no console errors).
