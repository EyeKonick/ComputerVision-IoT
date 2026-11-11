Type: task
Status: closed
Assignee: EyeKonick
Blocked by: 04

## Question

What does **QR Session 4 — Polished UI & wrap-up** teach, step by step?
Draft and build in one pass: `data/sessions/04-qr-session-4.ts`, markdown
saved to `.scratch/qr-attendance-guide/content/04-qr-session-4-ui-wrapup.md`.

The final step's cumulative file must be **byte-identical** to
`source-code/qr-attendance/qr_scanner.py`, reconciling every stand-in
Sessions 2–3 recorded. Ground to cover, at minimum:

- colour constants (BGR), `overlay_rect` + `cv2.addWeighted`
  transparency, `text` / `text_width`
- `draw_header` (live clock, `PRESENT n / total`), `draw_sidebar`
  (checked-in list, newest first, row limit), `draw_guide` (centre frame +
  moving scan line + hint, shown only when nothing is detected)
- `draw_qr_outline` final form (corner dots, label chip), `draw_icon`
  (check / `!` / `x`), `draw_toast` (fade-out via `TOAST_SECONDS`)
- `S` screenshots, `WINDOW_NAME` + `namedWindow`, `force_window_focus`
  (`F`, Windows-only) at frame 5
- tidy-up: module docstring, section banners, fuller comments — no
  behaviour change, said as such
- the closing framing note (see map's Not yet specified: attendance-data
  privacy / consent, link to the syllabus's Smart Attendance module)

Full glossary and common problems per step. Verify py_compile per step,
byte-compare the last step against `qr_scanner.py`, in-browser check, then
commit and push. **Completes the QR Attendance track.**

## Answer

Built in one pass. Data: `data/sessions/04-qr-session-4.ts`. Record: [content/04-qr-session-4-ui-wrapup.md](../content/04-qr-session-4-ui-wrapup.md).

**7 steps, all pure insertions:**
1. Header (BGR colours, `overlay_rect` + `addWeighted`, `text`/`text_width`, `draw_header` with live clock and `PRESENT n / total`).
2. `draw_sidebar` (newest first, row limit).
3. `draw_guide` + `frame_count` (shown only when nothing is detected).
4. `draw_qr_outline` completed (corner dots, label chip).
5. `draw_icon` + `draw_toast` (fade via `TOAST_SECONDS`).
6. `S` screenshots, `namedWindow`, `force_window_focus` (frame 5 and `F`, Windows-only).
7. Tidy-up: module docstring + four section banners, with no behaviour change. **Byte-identical to `qr_scanner.py`** (335 lines).

**Closing framing note:** `attendance.csv` is personal data (who can open it, where it's kept, how long, telling students and getting agreement). It ties to the syllabus's Module 8 cloud step (easier to share, easier to leak). It's honest about the limit that a photo of a classmate's card checks them in.

**syllabusMapping:** Module 2 (drawing) + Module 9 (Alerts & Dashboard: a simple results view).

**Verified:** all snapshots were built from line subsets of the real script plus the named stand-ins. Every step's cumulative file passes `py_compile`, and every step was *run*: generator steps executed in a temp folder, and scanner steps ran `main()` with a fake camera feeding frames that contain real generated cards. That run checked the console output, the `attendance.csv` rows and the rendered frames. Also passing: `tsc` and `next build` (80 static pages), plus an in-browser check at 1440px and phone width (no overflow, no console errors). Rendered fake-camera frames confirmed the header, sidebar, label chip, PRESENT/UNKNOWN banners and the mirrored outline aligning with the mirrored card.

**Completes the QR Attendance track.**
