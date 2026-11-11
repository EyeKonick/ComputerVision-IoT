Type: task
Status: closed
Assignee: EyeKonick
Blocked by: 01

## Question

What does **QR Session 1 — Generator** teach, step by step? Draft and
build in one pass: `data/sessions/01-qr-session-1.ts` wired into
`data/index.ts`, markdown saved to
`.scratch/qr-attendance-guide/content/01-qr-session-1-generator.md`.

The session's cumulative file must end byte-identical to
`source-code/qr-attendance/qr_generator.py`. Ground to cover, at minimum:

- creating `qr_generator.py` (explicit "create a new file" callout)
- the `STUDENTS` roster and `CLASS_NAME`, and why the scanner later imports
  them from here (so both files must live in the same folder)
- `qrcode.QRCode` / `add_data("ID|Name")` / `make_image`, `box_size`,
  `border`, error correction level — what the QR actually stores
- the Pillow card: `Image.new`, `ImageDraw`, `load_font` with the Arial →
  `load_default` fallback (non-Windows machines), `draw_centered` and
  `textlength`, header/footer bands
- `OUTPUT_DIR` via `Path(__file__).parent`, `mkdir(exist_ok=True)`, file
  naming, the `if __name__ == "__main__":` guard (it matters: the scanner
  imports this module and must not regenerate cards)
- running it and opening a card from `qr_codes/`

Fill in `syllabusMapping` from the course syllabus file. Full glossary and
common problems per step. Verify py_compile per step + in-browser, then
commit and push.

## Answer

Built in one pass. Data: `app/qr-attendance/data/sessions/01-qr-session-1.ts`. Record: [content/01-qr-session-1-generator.md](../content/01-qr-session-1-generator.md).

**6 steps:**
1. Create `qr_generator.py` and type the roster (`CLASS_NAME`, `STUDENTS`).
2. Turn one student into a QR code (`make_card`'s QR half, ending in a temporary `return qr_img`).
3. Save a QR for every student (`OUTPUT_DIR`, `main`, the `__main__` guard); the first visible output is plain QR PNGs.
4. Card look (constants, `load_font` with its Arial → `load_default` fallback, `draw_centered`).
5. Draw the card. This replaces `return qr_img` with `return card`, said out loud, and is the only non-insertion.
6. Tidy-up: module docstring and roster banner. The final step is **byte-identical** to `qr_generator.py`.

The guard's role (the scanner imports this file) is taught in Step 3 and called back in Session 3. The Pillow ≥10.1 requirement for `load_default(size=)` is recorded as a common problem and an instructor note.

**syllabusMapping:** Module 7 (making the codes the scanner reads) + Module 2 (drawing/saving images), feeding Project 1's ID/Card Scanner.

**Verified:** all snapshots were built from line subsets of the real script plus the named stand-ins. Every step's cumulative file passes `py_compile`, and every step was *run*: generator steps executed in a temp folder, and scanner steps ran `main()` with a fake camera feeding frames that contain real generated cards. That run checked the console output, the `attendance.csv` rows and the rendered frames. Also passing: `tsc` and `next build` (80 static pages), plus an in-browser check at 1440px and phone width (no overflow, no console errors).
