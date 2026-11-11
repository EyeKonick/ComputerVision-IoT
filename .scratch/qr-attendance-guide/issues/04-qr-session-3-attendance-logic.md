Type: task
Status: open
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
