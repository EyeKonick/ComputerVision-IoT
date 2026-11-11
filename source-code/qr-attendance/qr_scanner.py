"""
QR Attendance - Scanner (classroom demo).

Point the webcam at a QR card from `qr_generator.py`. The first scan marks
the student PRESENT and logs them to `attendance.csv`; scanning again shows
ALREADY SCANNED; a QR code that isn't on the roster shows UNKNOWN.

Controls:
    S - save a screenshot
    F - re-focus the window (use this if keypresses stop responding)
    Q / ESC - quit
"""

import csv
import ctypes
import time
from datetime import datetime
from pathlib import Path

import cv2
import numpy as np

from qr_generator import CLASS_NAME, STUDENTS

# ----------------------------------------------------------------------
# Config
# ----------------------------------------------------------------------

WINDOW_NAME = "QR ATTENDANCE SCANNER"

CAM_SOURCE = 0
# Laptop with a built-in webcam: leave as the device index above (0).
# Lab PC with no webcam: set to your phone's IP Webcam stream tunneled over
# USB via `adb forward tcp:8080 tcp:8080`, e.g.:
#   CAM_SOURCE = "http://localhost:8080/video"

ATTENDANCE_FILE = Path(__file__).parent / "attendance.csv"

TOAST_SECONDS = 2.5      # how long the result banner stays up
RESCAN_COOLDOWN = 3.0    # ignore the same code for this long while it stays in view
SIDEBAR_W = 330
FONT = cv2.FONT_HERSHEY_SIMPLEX

# Colors are BGR (OpenCV order)
WHITE = (255, 255, 255)
MUTED = (190, 190, 190)
PANEL = (40, 28, 20)
GREEN = (120, 200, 0)
AMBER = (0, 180, 255)
RED = (80, 80, 235)
TEAL = (148, 184, 0)

# ----------------------------------------------------------------------
# Attendance log
# ----------------------------------------------------------------------

ROSTER = {student_id: name for student_id, name in STUDENTS}


def load_today():
    """Read who already checked in today, so restarting the scanner keeps the list."""
    today = datetime.now().strftime("%Y-%m-%d")
    checked_in = []
    if ATTENDANCE_FILE.exists():
        with open(ATTENDANCE_FILE, newline="", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                if row["date"] == today:
                    checked_in.append((row["student_id"], row["name"], row["time"]))
    return checked_in


def log_attendance(student_id, name):
    now = datetime.now()
    new_file = not ATTENDANCE_FILE.exists()
    with open(ATTENDANCE_FILE, "a", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        if new_file:
            writer.writerow(["date", "time", "student_id", "name"])
        writer.writerow([now.strftime("%Y-%m-%d"), now.strftime("%H:%M:%S"), student_id, name])
    return now.strftime("%I:%M %p")


# ----------------------------------------------------------------------
# Drawing helpers
# ----------------------------------------------------------------------


def overlay_rect(img, x1, y1, x2, y2, color, alpha):
    """Semi-transparent filled rectangle."""
    x1, y1 = max(x1, 0), max(y1, 0)
    roi = img[y1:y2, x1:x2]
    if roi.size == 0:
        return
    block = np.full_like(roi, color)
    cv2.addWeighted(block, alpha, roi, 1 - alpha, 0, roi)


def text(img, msg, org, scale=0.6, color=WHITE, thickness=1):
    cv2.putText(img, msg, org, FONT, scale, color, thickness, cv2.LINE_AA)


def text_width(msg, scale, thickness=1):
    return cv2.getTextSize(msg, FONT, scale, thickness)[0][0]


def draw_icon(img, center, kind, color):
    """A filled circle with a check, '!' or 'x' drawn inside."""
    cx, cy = center
    cv2.circle(img, center, 26, color, -1, cv2.LINE_AA)
    if kind == "ok":
        cv2.line(img, (cx - 12, cy + 1), (cx - 3, cy + 10), WHITE, 4, cv2.LINE_AA)
        cv2.line(img, (cx - 3, cy + 10), (cx + 13, cy - 9), WHITE, 4, cv2.LINE_AA)
    elif kind == "warn":
        cv2.line(img, (cx, cy - 13), (cx, cy + 4), WHITE, 4, cv2.LINE_AA)
        cv2.circle(img, (cx, cy + 12), 3, WHITE, -1, cv2.LINE_AA)
    else:
        cv2.line(img, (cx - 10, cy - 10), (cx + 10, cy + 10), WHITE, 4, cv2.LINE_AA)
        cv2.line(img, (cx + 10, cy - 10), (cx - 10, cy + 10), WHITE, 4, cv2.LINE_AA)


def draw_header(img, present_count):
    h, w = img.shape[:2]
    overlay_rect(img, 0, 0, w, 64, PANEL, 0.85)
    cv2.rectangle(img, (0, 64), (w, 68), TEAL, -1)
    text(img, f"{CLASS_NAME} ATTENDANCE", (20, 42), 0.95, WHITE, 2)

    now = datetime.now()
    clock = now.strftime("%A, %b %d   %I:%M:%S %p")
    count = f"PRESENT  {present_count} / {len(ROSTER)}"
    text(img, clock, (w - text_width(clock, 0.55) - 20, 28), 0.55, MUTED)
    text(img, count, (w - text_width(count, 0.7, 2) - 20, 54), 0.7, GREEN, 2)


def draw_sidebar(img, checked_in):
    h, w = img.shape[:2]
    x = w - SIDEBAR_W
    overlay_rect(img, x, 68, w, h, PANEL, 0.75)
    text(img, "CHECKED IN", (x + 20, 105), 0.65, TEAL, 2)
    cv2.line(img, (x + 20, 117), (w - 20, 117), (90, 90, 90), 1)

    if not checked_in:
        text(img, "No one yet...", (x + 20, 150), 0.55, MUTED)
        return

    row_h = 52
    max_rows = (h - 140) // row_h
    for i, (student_id, name, at) in enumerate(reversed(checked_in[-max_rows:])):
        y = 135 + i * row_h
        cv2.circle(img, (x + 30, y + 16), 6, GREEN, -1, cv2.LINE_AA)
        text(img, name[:22], (x + 48, y + 14), 0.58, WHITE)
        text(img, f"{student_id}   {at}", (x + 48, y + 36), 0.45, MUTED)


def draw_guide(img, frame_count):
    """Center target frame with a moving scan line, shown while nothing is detected."""
    h, w = img.shape[:2]
    cx = (w - SIDEBAR_W) // 2
    cy = (h + 68) // 2
    size = min(h, w - SIDEBAR_W) // 3
    x1, y1, x2, y2 = cx - size, cy - size, cx + size, cy + size
    arm = size // 4
    for (px, py), (dx, dy) in [((x1, y1), (1, 1)), ((x2, y1), (-1, 1)),
                               ((x1, y2), (1, -1)), ((x2, y2), (-1, -1))]:
        cv2.line(img, (px, py), (px + dx * arm, py), WHITE, 3, cv2.LINE_AA)
        cv2.line(img, (px, py), (px, py + dy * arm), WHITE, 3, cv2.LINE_AA)

    sweep = (frame_count * 6) % (2 * size)
    cv2.line(img, (x1 + 10, y1 + sweep), (x2 - 10, y1 + sweep), TEAL, 2, cv2.LINE_AA)

    hint = "Hold your QR card inside the frame"
    tw = text_width(hint, 0.65, 2)
    overlay_rect(img, cx - tw // 2 - 16, y2 + 20, cx + tw // 2 + 16, y2 + 58, PANEL, 0.7)
    text(img, hint, (cx - tw // 2, y2 + 46), 0.65, WHITE, 2)


def draw_qr_outline(img, points, color, label):
    pts = points.reshape(-1, 2).astype(int)
    cv2.polylines(img, [pts], True, color, 4, cv2.LINE_AA)
    for p in pts:
        cv2.circle(img, tuple(p), 7, color, -1, cv2.LINE_AA)
        cv2.circle(img, tuple(p), 7, WHITE, 2, cv2.LINE_AA)

    top_left = pts[np.argmin(pts.sum(axis=1))]
    lx, ly = int(top_left[0]), max(int(top_left[1]) - 14, 90)
    tw = text_width(label, 0.6, 2)
    cv2.rectangle(img, (lx, ly - 26), (lx + tw + 16, ly + 6), color, -1)
    text(img, label, (lx + 8, ly - 4), 0.6, WHITE, 2)


def draw_toast(img, toast, now):
    """Result banner at the bottom that fades out."""
    age = now - toast["start"]
    if age > TOAST_SECONDS:
        return
    alpha = 1.0 if age < TOAST_SECONDS - 0.5 else (TOAST_SECONDS - age) / 0.5

    h, w = img.shape[:2]
    area_w = w - SIDEBAR_W
    box_w, box_h = min(560, area_w - 40), 96
    x1 = (area_w - box_w) // 2
    y1 = h - box_h - 24
    layer = img.copy()

    cv2.rectangle(layer, (x1, y1), (x1 + box_w, y1 + box_h), PANEL, -1)
    cv2.rectangle(layer, (x1, y1), (x1 + 10, y1 + box_h), toast["color"], -1)
    draw_icon(layer, (x1 + 56, y1 + box_h // 2), toast["icon"], toast["color"])
    text(layer, toast["title"], (x1 + 100, y1 + 40), 0.85, toast["color"], 2)
    text(layer, toast["subtitle"], (x1 + 100, y1 + 74), 0.6, WHITE)

    cv2.addWeighted(layer, alpha * 0.92, img, 1 - alpha * 0.92, 0, img)


def force_window_focus(window_title):
    """Windows sometimes won't send keypresses to a new cv2 window - activate it once."""
    try:
        user32 = ctypes.windll.user32
        hwnd = user32.FindWindowW(None, window_title)
        if hwnd:
            user32.ShowWindow(hwnd, 5)  # SW_SHOW
            user32.SetForegroundWindow(hwnd)
    except Exception:
        pass


# ----------------------------------------------------------------------
# Main loop
# ----------------------------------------------------------------------


def handle_scan(data, checked_in):
    """Decide what a scanned QR code means. Returns (color, label, toast)."""
    student_id, _, name = data.partition("|")
    now = time.time()

    if student_id not in ROSTER:
        return RED, "UNKNOWN", {
            "start": now, "color": RED, "icon": "x",
            "title": "UNKNOWN CODE", "subtitle": "This QR code is not on the class list",
        }

    name = ROSTER[student_id]
    if any(sid == student_id for sid, _, _ in checked_in):
        return AMBER, name, {
            "start": now, "color": AMBER, "icon": "warn",
            "title": "ALREADY SCANNED", "subtitle": f"{name} is already checked in",
        }

    at = log_attendance(student_id, name)
    checked_in.append((student_id, name, at))
    print(f"PRESENT: {student_id} {name} at {at}")
    return GREEN, name, {
        "start": now, "color": GREEN, "icon": "ok",
        "title": "PRESENT", "subtitle": f"Welcome, {name}!  ({at})",
    }


def main():
    if isinstance(CAM_SOURCE, int):
        cap = cv2.VideoCapture(CAM_SOURCE, cv2.CAP_DSHOW)
        if not cap.isOpened():
            cap = cv2.VideoCapture(CAM_SOURCE)
    else:
        cap = cv2.VideoCapture(CAM_SOURCE)  # URL source: let OpenCV pick the FFmpeg backend
    if not cap.isOpened():
        raise RuntimeError("Could not open webcam. Check CAM_SOURCE / camera permissions.")

    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

    detector = cv2.QRCodeDetector()
    checked_in = load_today()
    toast = {"start": 0.0}
    last_data, last_time = None, 0.0
    last_color, last_label = GREEN, ""
    frame_count = 0
    shot_count = 0

    cv2.namedWindow(WINDOW_NAME, cv2.WINDOW_NORMAL)
    print(f"Scanner running. {len(checked_in)} already checked in today. Press Q to quit.")

    while True:
        ok, frame = cap.read()
        if not ok:
            print("Camera frame not received - check CAM_SOURCE.")
            break

        # Read the QR code from the *original* (unmirrored) frame - the safest
        # input for the detector, since older OpenCV versions can't read mirrored codes.
        data, points, _ = detector.detectAndDecode(frame)
        now = time.time()

        # Then mirror the picture so it feels like a selfie camera, and
        # mirror the QR corner points to match.
        frame = cv2.flip(frame, 1)
        if points is not None:
            points = points.reshape(-1, 2).copy()
            points[:, 0] = frame.shape[1] - 1 - points[:, 0]

        if data:
            # Only react once per card while it stays in view.
            if data != last_data or now - last_time > RESCAN_COOLDOWN:
                last_color, last_label, toast = handle_scan(data, checked_in)
                last_data = data
            last_time = now

        draw_header(frame, len(checked_in))
        draw_sidebar(frame, checked_in)
        if data and points is not None:
            draw_qr_outline(frame, points, last_color, last_label)
        else:
            draw_guide(frame, frame_count)
        draw_toast(frame, toast, now)

        cv2.imshow(WINDOW_NAME, frame)
        if frame_count == 5:
            force_window_focus(WINDOW_NAME)
        frame_count += 1

        key = cv2.waitKey(1) & 0xFF
        if key in (ord("q"), 27):
            break
        elif key == ord("s"):
            shot_count += 1
            filename = f"scanner_{shot_count:02d}.png"
            cv2.imwrite(filename, frame)
            print(f"Saved {filename}")
        elif key == ord("f"):
            force_window_focus(WINDOW_NAME)

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
