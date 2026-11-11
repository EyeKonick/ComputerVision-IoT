Type: task
Status: closed
Assignee: EyeKonick
Blocked by: 03

## Question

What does **QR Session 3 — Attendance logic** teach, step by step? Draft
and build in one pass: `data/sessions/03-qr-session-3.ts`, markdown saved
to `.scratch/qr-attendance-guide/content/03-qr-session-3-attendance-logic.md`.

Ground to cover, at minimum:

- `from qr_generator import CLASS_NAME, STUDENTS` and the `ROSTER` dict —
  why the scanner reuses the generator's list (and the same-folder /
  `ModuleNotFoundError` problem)
- `data.partition("|")` and `handle_scan`: UNKNOWN (not on roster),
  ALREADY SCANNED (already in `checked_in`), PRESENT (log it)
- `log_attendance`: `ATTENDANCE_FILE`, `csv.writer`, header-on-new-file,
  `newline=""`, date/time formatting
- `load_today`: `csv.DictReader`, filtering today's rows so a restart keeps
  the list
- `RESCAN_COOLDOWN` and `last_data` / `last_time` — why a card held in view
  only counts once
- outline colour/label driven by the scan result
- opening `attendance.csv` (Excel / VS Code) to see it fill up; the
  Excel-has-the-file-open write failure as a common problem

Build on Session 2's final file; keep additions as insertions where
possible and record any new stand-ins for Session 4. Full glossary and
common problems per step. Verify py_compile per step + in-browser, then
commit and push.

## Answer

Built in one pass. Data: `data/sessions/03-qr-session-3.ts`. Record: [content/03-qr-session-3-attendance-logic.md](../content/03-qr-session-3-attendance-logic.md).

**5 steps:**
1. Import `CLASS_NAME, STUDENTS` from the generator + `ROSTER`. Covers the same-folder `ModuleNotFoundError` and the missing guard regenerating cards.
2. Cooldown: `RESCAN_COOLDOWN`, `last_data`/`last_time`, `now`. The stand-in print moves 4 spaces right, said out loud. The console spam from S2 drops to one line per card.
3. `ATTENDANCE_FILE`, `log_attendance` (append, header on new file, `newline=""`, strftime) and `load_today` (`DictReader`, today's rows), plus the startup count message.
4. `handle_scan` in its **final** form, including the toast dicts S4 draws, plus the GREEN/AMBER/RED constants, `toast`, `last_color`/`last_label`. This replaces both S2 stand-ins. The scanner's name comes from `ROSTER`, not from the code, which is noted as a forgery guard.
5. No-code test step: make `stranger.png` via `python -c`, test PRESENT/ALREADY/UNKNOWN, open `attendance.csv` (VS Code recommended), and a restart test. Excel locking the file → `PermissionError` is a common problem here and in Step 4.

**New stand-ins for Session 4:** none. After S3 every remaining change is an insertion.

**Verified:** all snapshots were built from line subsets of the real script plus the named stand-ins. Every step's cumulative file passes `py_compile`, and every step was *run*: generator steps executed in a temp folder, and scanner steps ran `main()` with a fake camera feeding frames that contain real generated cards. That run checked the console output, the `attendance.csv` rows and the rendered frames. Also passing: `tsc` and `next build` (80 static pages), plus an in-browser check at 1440px and phone width (no overflow, no console errors). The fake-camera run logged exactly 2 CSV rows for a card-1 → card-2 → card-1-again → stranger sequence.
