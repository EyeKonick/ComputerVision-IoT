Type: task
Status: open
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
