Type: task
Status: open
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
