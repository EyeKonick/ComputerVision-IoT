"""
QR Attendance - Generator (classroom demo).

Makes one ID-style QR card per student and saves them to the `qr_codes/`
folder. Show a card on your phone (or print it) and hold it up to
`qr_scanner.py` to check in.

Run:
    python qr_generator.py
"""

from pathlib import Path

import qrcode
from PIL import Image, ImageDraw, ImageFont

# ----------------------------------------------------------------------
# Class roster - edit this list. Format: (student ID, full name)
# ----------------------------------------------------------------------

CLASS_NAME = "ITE 3"

STUDENTS = [
    ("2024-0001", "Juan Dela Cruz"),
    ("2024-0002", "Maria Santos"),
    ("2024-0003", "Jose Rizal"),
    ("2024-0004", "Andres Bonifacio"),
    ("2024-0005", "Gabriela Silang"),
]

OUTPUT_DIR = Path(__file__).parent / "qr_codes"

# Card look
CARD_W, CARD_H = 600, 820
HEADER_COLOR = (24, 39, 71)      # navy
ACCENT_COLOR = (0, 184, 148)     # teal
TEXT_DARK = (30, 30, 30)
TEXT_MUTED = (110, 110, 110)


def load_font(size, bold=False):
    """Use Arial if Windows has it, otherwise Pillow's built-in font."""
    name = "arialbd.ttf" if bold else "arial.ttf"
    try:
        return ImageFont.truetype(name, size)
    except OSError:
        return ImageFont.load_default(size=size)


def draw_centered(draw, y, text, font, fill):
    text_w = draw.textlength(text, font=font)
    draw.text(((CARD_W - text_w) / 2, y), text, font=font, fill=fill)


def make_card(student_id, name):
    # The QR code only holds "ID|Name" - the scanner splits it back apart.
    qr = qrcode.QRCode(box_size=12, border=2, error_correction=qrcode.constants.ERROR_CORRECT_M)
    qr.add_data(f"{student_id}|{name}")
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="black", back_color="white").convert("RGB")
    qr_img = qr_img.resize((420, 420), Image.NEAREST)

    card = Image.new("RGB", (CARD_W, CARD_H), "white")
    draw = ImageDraw.Draw(card)

    # Header band
    draw.rectangle([0, 0, CARD_W, 110], fill=HEADER_COLOR)
    draw.rectangle([0, 110, CARD_W, 118], fill=ACCENT_COLOR)
    draw_centered(draw, 22, f"{CLASS_NAME}  ATTENDANCE PASS", load_font(32, bold=True), "white")
    draw_centered(draw, 66, "Show this code to the scanner", load_font(20), (190, 200, 220))

    # QR code
    card.paste(qr_img, ((CARD_W - 420) // 2, 150))

    # Name + ID
    draw_centered(draw, 600, name, load_font(40, bold=True), TEXT_DARK)
    draw_centered(draw, 655, f"ID: {student_id}", load_font(26), TEXT_MUTED)

    # Footer
    draw.rectangle([0, CARD_H - 50, CARD_W, CARD_H], fill=HEADER_COLOR)
    draw_centered(draw, CARD_H - 38, "Python + OpenCV QR Demo", load_font(18), (190, 200, 220))

    # Thin border so it looks like a card when printed
    draw.rectangle([0, 0, CARD_W - 1, CARD_H - 1], outline=(200, 200, 200), width=2)
    return card


def main():
    OUTPUT_DIR.mkdir(exist_ok=True)
    for student_id, name in STUDENTS:
        card = make_card(student_id, name)
        filename = OUTPUT_DIR / f"{student_id}_{name.replace(' ', '_')}.png"
        card.save(filename)
        print(f"Saved {filename.name}")
    print(f"\nDone! {len(STUDENTS)} cards are in: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
