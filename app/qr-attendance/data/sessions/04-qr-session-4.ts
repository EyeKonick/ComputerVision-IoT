import type { Session } from "../types";
import { range } from "../lib";

const step1Code = `import csv
import time
from datetime import datetime
from pathlib import Path

import cv2
import numpy as np

from qr_generator import CLASS_NAME, STUDENTS

WINDOW_NAME = "QR ATTENDANCE SCANNER"

CAM_SOURCE = 0
# Laptop with a built-in webcam: leave as the device index above (0).
# Lab PC with no webcam: set to your phone's IP Webcam stream tunneled over
# USB via \`adb forward tcp:8080 tcp:8080\`, e.g.:
#   CAM_SOURCE = "http://localhost:8080/video"

ATTENDANCE_FILE = Path(__file__).parent / "attendance.csv"

RESCAN_COOLDOWN = 3.0    # ignore the same code for this long while it stays in view
FONT = cv2.FONT_HERSHEY_SIMPLEX

# Colors are BGR (OpenCV order)
WHITE = (255, 255, 255)
MUTED = (190, 190, 190)
PANEL = (40, 28, 20)
GREEN = (120, 200, 0)
AMBER = (0, 180, 255)
RED = (80, 80, 235)
TEAL = (148, 184, 0)

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


def draw_qr_outline(img, points, color, label):
    pts = points.reshape(-1, 2).astype(int)
    cv2.polylines(img, [pts], True, color, 4, cv2.LINE_AA)


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
        if data and points is not None:
            draw_qr_outline(frame, points, last_color, last_label)

        cv2.imshow(WINDOW_NAME, frame)

        key = cv2.waitKey(1) & 0xFF
        if key in (ord("q"), 27):
            break

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()`;

const step2Code = `import csv
import time
from datetime import datetime
from pathlib import Path

import cv2
import numpy as np

from qr_generator import CLASS_NAME, STUDENTS

WINDOW_NAME = "QR ATTENDANCE SCANNER"

CAM_SOURCE = 0
# Laptop with a built-in webcam: leave as the device index above (0).
# Lab PC with no webcam: set to your phone's IP Webcam stream tunneled over
# USB via \`adb forward tcp:8080 tcp:8080\`, e.g.:
#   CAM_SOURCE = "http://localhost:8080/video"

ATTENDANCE_FILE = Path(__file__).parent / "attendance.csv"

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


def draw_qr_outline(img, points, color, label):
    pts = points.reshape(-1, 2).astype(int)
    cv2.polylines(img, [pts], True, color, 4, cv2.LINE_AA)


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

        cv2.imshow(WINDOW_NAME, frame)

        key = cv2.waitKey(1) & 0xFF
        if key in (ord("q"), 27):
            break

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()`;

const step3Code = `import csv
import time
from datetime import datetime
from pathlib import Path

import cv2
import numpy as np

from qr_generator import CLASS_NAME, STUDENTS

WINDOW_NAME = "QR ATTENDANCE SCANNER"

CAM_SOURCE = 0
# Laptop with a built-in webcam: leave as the device index above (0).
# Lab PC with no webcam: set to your phone's IP Webcam stream tunneled over
# USB via \`adb forward tcp:8080 tcp:8080\`, e.g.:
#   CAM_SOURCE = "http://localhost:8080/video"

ATTENDANCE_FILE = Path(__file__).parent / "attendance.csv"

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

        cv2.imshow(WINDOW_NAME, frame)
        frame_count += 1

        key = cv2.waitKey(1) & 0xFF
        if key in (ord("q"), 27):
            break

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()`;

const step4Code = `import csv
import time
from datetime import datetime
from pathlib import Path

import cv2
import numpy as np

from qr_generator import CLASS_NAME, STUDENTS

WINDOW_NAME = "QR ATTENDANCE SCANNER"

CAM_SOURCE = 0
# Laptop with a built-in webcam: leave as the device index above (0).
# Lab PC with no webcam: set to your phone's IP Webcam stream tunneled over
# USB via \`adb forward tcp:8080 tcp:8080\`, e.g.:
#   CAM_SOURCE = "http://localhost:8080/video"

ATTENDANCE_FILE = Path(__file__).parent / "attendance.csv"

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

        cv2.imshow(WINDOW_NAME, frame)
        frame_count += 1

        key = cv2.waitKey(1) & 0xFF
        if key in (ord("q"), 27):
            break

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()`;

const step5Code = `import csv
import time
from datetime import datetime
from pathlib import Path

import cv2
import numpy as np

from qr_generator import CLASS_NAME, STUDENTS

WINDOW_NAME = "QR ATTENDANCE SCANNER"

CAM_SOURCE = 0
# Laptop with a built-in webcam: leave as the device index above (0).
# Lab PC with no webcam: set to your phone's IP Webcam stream tunneled over
# USB via \`adb forward tcp:8080 tcp:8080\`, e.g.:
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
        frame_count += 1

        key = cv2.waitKey(1) & 0xFF
        if key in (ord("q"), 27):
            break

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()`;

const step6Code = `import csv
import ctypes
import time
from datetime import datetime
from pathlib import Path

import cv2
import numpy as np

from qr_generator import CLASS_NAME, STUDENTS

WINDOW_NAME = "QR ATTENDANCE SCANNER"

CAM_SOURCE = 0
# Laptop with a built-in webcam: leave as the device index above (0).
# Lab PC with no webcam: set to your phone's IP Webcam stream tunneled over
# USB via \`adb forward tcp:8080 tcp:8080\`, e.g.:
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
    main()`;

const step7Code = `"""
QR Attendance - Scanner (classroom demo).

Point the webcam at a QR card from \`qr_generator.py\`. The first scan marks
the student PRESENT and logs them to \`attendance.csv\`; scanning again shows
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
# USB via \`adb forward tcp:8080 tcp:8080\`, e.g.:
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
    main()`;

export const qrSession4: Session = {
  id: "qr-s4",
  sessionNumber: 4,
  track: "QR Attendance (4 of 4)",
  title: "Polished UI & wrap-up",
  syllabusMapping: "Module 2 — drawing shapes and text; Module 9 — Alerts & Dashboard: a simple results view on screen, completing the Smart Attendance demo",
  buildsOn: "QR Session 3's attendance logic",
  buildsToward: "source-code/qr-attendance/qr_scanner.py",
  sessionGoal: "Today we finish qr_scanner.py: a header with a live clock and count, a checked-in sidebar, a scan guide, labelled outlines, pop-up results, screenshots and a focus fix — and by the end your file is exactly qr_scanner.py.",
  instructorNotes: [
    "Code-display convention (used in every session): each step shows the entire file so far, with lines added or changed in that step marked as new.",
    "Every step in this session only adds lines — Sessions 2–3's temporary lines were all replaced by the end of Session 3, and draw_qr_outline is completed in Step 4 by adding lines after the two it already has.",
    "Colours are BGR in OpenCV. Expect at least one student to type a colour in RGB order and get the wrong colour — it's the most common bug of the session.",
    "Step 6's focus fix is Windows-only (Win32 through ctypes). On macOS/Linux it silently does nothing and students click the window instead.",
    "Step 7 ends on the finished file: it should match source-code/qr-attendance/qr_scanner.py line for line (335 lines). That is the checkpoint students compare against."
  ],
  steps: [
    {
      id: "qr-s4-1",
      index: 0,
      title: "A header bar: colours, see-through panels, live clock and count",
      say: "The scanner works; now we make it look like a real attendance kiosk. First, a header bar across the top: the class name on the left, and on the right a live clock and a PRESENT count, like 2 / 5.\n\nTo get there we need a few small drawing tools we'll reuse all session: a set of named colours, a function that draws a see-through panel, and two helpers for writing text and measuring how wide it is.",
      commands: [],
      runCommand: "python qr_scanner.py",
      runResult: "A dark, slightly see-through bar now runs across the top with a teal line under it: ITE 3 ATTENDANCE on the left; on the right the date and a ticking clock, and PRESENT 0 / 5 in green. Scan a new card and the count goes up.",
      why: "Colours in OpenCV are (blue, green, red), not (red, green, blue). PANEL = (40, 28, 20) is mostly blue, which makes a dark navy; TEAL = (148, 184, 0) is blue plus green with no red. If you type a colour in RGB order out of habit, it comes out as a completely different colour.\n\noverlay_rect makes the header see-through. It cuts out the piece of the picture under the rectangle (roi — region of interest), makes a solid block of colour the same size, and blends them with cv2.addWeighted: alpha 0.85 means 85% colour and 15% camera picture. Because roi is a window into the real frame, not a copy, the blend is written straight back into the frame. The max(x1, 0) lines and the roi.size == 0 check stop it from crashing if a rectangle hangs off the edge of the picture.\n\ntext wraps cv2.putText so every call uses the same font and smooth edges (LINE_AA) without repeating them. text_width measures how wide a message will be — that's how the clock and count are right-aligned: start at the window's width, minus the text's width, minus a 20-pixel margin.\n\ndraw_header runs every frame, so datetime.now() makes the clock tick, and len(ROSTER) is the class size.",
      glossary: [
        {
          term: "import numpy as np",
          explanation: "loads NumPy under the short name np. OpenCV pictures are NumPy arrays — grids of numbers."
        },
        {
          term: "BGR",
          explanation: "OpenCV's colour order: (blue, green, red), each 0–255."
        },
        {
          term: "cv2.FONT_HERSHEY_SIMPLEX",
          explanation: "one of OpenCV's built-in fonts — a plain, clean one."
        },
        {
          term: "Default values (scale=0.6, color=WHITE, thickness=1)",
          explanation: "used when the caller doesn't give that input, so short calls stay short."
        },
        {
          term: "img.shape[:2]",
          explanation: "the picture's height and width (shape also holds the number of colour channels, which we skip)."
        },
        {
          term: "img[y1:y2, x1:x2]",
          explanation: "a rectangle cut out of the picture — rows y1 to y2, columns x1 to x2. Changing it changes the picture."
        },
        {
          term: "np.full_like(roi, color)",
          explanation: "a block the same size as roi, filled with one colour."
        },
        {
          term: "cv2.addWeighted(a, alpha, b, 1 - alpha, 0, out)",
          explanation: "blends two pictures: alpha of the first plus the rest of the second. Makes see-through effects."
        },
        {
          term: "cv2.putText(...)",
          explanation: "writes text onto a picture."
        },
        {
          term: "cv2.getTextSize(...)[0][0]",
          explanation: "how many pixels wide a message will be in that font and size."
        },
        {
          term: "cv2.rectangle(img, (x1, y1), (x2, y2), color, -1)",
          explanation: "draws a box; thickness -1 means filled in."
        },
        {
          term: "%A, %b %d   %I:%M:%S %p",
          explanation: "a date pattern: weekday, short month, day, then 12-hour time with seconds and AM/PM."
        }
      ],
      commonProblems: [
        {
          error: "The header is bright orange / the wrong colour",
          solution: "A colour was typed in RGB order. OpenCV reads (blue, green, red) — copy the numbers exactly as shown: PANEL = (40, 28, 20)."
        },
        {
          error: "NameError: name 'np' is not defined",
          solution: "Add import numpy as np near the top, under import cv2."
        },
        {
          error: "NameError: name 'FONT' (or 'WHITE', 'PANEL', 'TEAL', 'MUTED') is not defined",
          solution: "Those settings must be at the top of the file at the left edge, above any function that uses them."
        },
        {
          error: "The header is solid, not see-through",
          solution: "Check overlay_rect's last line passes roi as the last value: cv2.addWeighted(block, alpha, roi, 1 - alpha, 0, roi). That final roi is where the blend is written."
        },
        {
          error: "The clock and count are cut off on the right, or overlap the class name",
          solution: "Your camera is giving small frames (often 640 × 480 on IP Webcam). Set IP Webcam's video resolution to 1280×720, or on a laptop check the two cap.set lines."
        },
        {
          error: "The clock doesn't tick",
          solution: "draw_header(frame, len(checked_in)) must be inside the while loop, after the outline code and before cv2.imshow."
        },
        {
          error: "TypeError: … takes from 3 to 6 positional arguments but 7 were given (or similar) on a text(...) line",
          solution: "A comma is missing or extra inside the call. text needs: the picture, the message, the (x, y) position, then optional size, colour and thickness — compare your commas with the panel."
        }
      ],
      file: {
        filename: "qr_scanner.py",
        code: step1Code,
        newLineIndices: [6, 21, ...range(24, 26), 30, ...range(58, 86), 166]
      }
    },
    {
      id: "qr-s4-2",
      index: 1,
      title: "A checked-in sidebar, newest first",
      say: "Next, a panel down the right-hand side listing everyone who's checked in today, newest at the top, each with their ID and the time they arrived. Before anyone scans, it says No one yet...\n\nIf the list gets longer than the panel, it shows the most recent students that fit.",
      commands: [],
      runCommand: "python qr_scanner.py",
      runResult: "A see-through panel fills the right side under the header, titled CHECKED IN. Students already checked in today appear with a green dot, their name, and their ID and time; a new scan appears at the top.",
      why: "The sidebar is SIDEBAR_W (330) pixels wide, measured in from the right edge: x = w - SIDEBAR_W. It starts at y = 68, just under the header's teal line.\n\nif not checked_in: is true when the list is empty — an empty list counts as false — so it writes No one yet... and returns early, skipping the rest.\n\nEach student takes a row 52 pixels tall, and max_rows works out how many rows fit in the panel's height. checked_in[-max_rows:] takes the last max_rows students (negative numbers count from the end of a list), and reversed(...) flips them so the newest is first. enumerate gives each row a number i, which moves it down: y = 135 + i * row_h.\n\nname[:22] keeps at most the first 22 letters, so a very long name can't run off the panel. Because the list comes from checked_in, which load_today filled at startup, the sidebar is already correct right after a restart.",
      glossary: [
        {
          term: "SIDEBAR_W = 330",
          explanation: "the sidebar's width in pixels, set once at the top."
        },
        {
          term: "if not checked_in:",
          explanation: "true when the list is empty."
        },
        {
          term: "checked_in[-max_rows:]",
          explanation: "the last few items of a list; a negative number counts from the end."
        },
        {
          term: "reversed(...)",
          explanation: "goes through a list from the end back to the start."
        },
        {
          term: "enumerate(...)",
          explanation: "goes through a list and also gives a counter (0, 1, 2…) for each item."
        },
        {
          term: "name[:22]",
          explanation: "the first 22 characters of the text."
        },
        {
          term: "cv2.circle(img, center, radius, color, -1)",
          explanation: "draws a circle; -1 fills it in."
        },
        {
          term: "cv2.line(img, start, end, color, thickness)",
          explanation: "draws a straight line between two points."
        }
      ],
      commonProblems: [
        {
          error: "The sidebar covers half the picture",
          solution: "Your frames are small (640 × 480), so 330 pixels is half the width. Set the camera or IP Webcam to 1280×720."
        },
        {
          error: "The newest student is at the bottom",
          solution: "reversed(...) is missing around checked_in[-max_rows:]."
        },
        {
          error: "ValueError: too many values to unpack (expected 3)",
          solution: "The loop must unpack (student_id, name, at) in brackets after i: for i, (student_id, name, at) in enumerate(...)."
        },
        {
          error: "The sidebar is empty right after restarting the scanner",
          solution: "Correct only on a new day. If students checked in today, check checked_in = load_today() is still in main and the date in attendance.csv is today's."
        },
        {
          error: "NameError: name 'SIDEBAR_W' is not defined",
          solution: "Add SIDEBAR_W = 330 with the other settings at the top."
        }
      ],
      file: {
        filename: "qr_scanner.py",
        code: step2Code,
        newLineIndices: [21, ...range(90, 107), 188]
      }
    },
    {
      id: "qr-s4-3",
      index: 2,
      title: "A scan guide: target frame and moving scan line",
      say: "When nobody is scanning, the screen should tell people what to do. We draw a guide in the middle of the camera area: four white corner brackets, a teal scan line that sweeps down inside them, and the hint Hold your QR card inside the frame.\n\nThe guide only shows while no code is being read. The moment a card is detected, it disappears and the outline takes over. To animate the scan line we count frames.",
      commands: [],
      runCommand: "python qr_scanner.py",
      runResult: "With no card in view, white corner brackets frame the middle of the camera area, a teal line sweeps from top to bottom over and over, and the hint sits underneath. Show a card: the guide vanishes and the coloured outline appears. Take it away: the guide comes back.",
      why: "The guide is centred in the camera area, not the whole window: cx = (w - SIDEBAR_W) // 2 ignores the sidebar, and cy = (h + 68) // 2 sits halfway between the header and the bottom. size is a third of the smaller side, so the square fits any window shape.\n\nThe corner brackets come from one loop over the four corners. Each corner comes with a direction (dx, dy) — which way its arms point — so one pair of cv2.line calls draws all four corners, each pointing inwards.\n\nThe scan line uses frame_count, which goes up by 1 every frame. (frame_count * 6) % (2 * size) moves the line 6 pixels a frame, and % (remainder) wraps it back to the top when it reaches the bottom — the same trick a clock uses to go from 59 back to 0.\n\nThe else: on the outline's if means \"no readable code this frame\" — exactly when the guide should show. frame_count += 1 goes at the end of the loop, after the picture is shown.",
      glossary: [
        {
          term: "frame_count",
          explanation: "a number that goes up by one every frame; used to animate things."
        },
        {
          term: "%",
          explanation: "the remainder after dividing. (n % 10) always stays between 0 and 9, so it makes values wrap around."
        },
        {
          term: "min(a, b)",
          explanation: "whichever of the two values is smaller."
        },
        {
          term: "for (px, py), (dx, dy) in [...]:",
          explanation: "goes through a list of pairs, unpacking each corner's position and arm direction."
        },
        {
          term: "else:",
          explanation: "the lines that run when the if above was false."
        },
        {
          term: "+= 1",
          explanation: "adds one to the value already stored."
        }
      ],
      commonProblems: [
        {
          error: "The scan line doesn't move",
          solution: "frame_count += 1 is missing, or it's outside the loop. It goes inside the loop, right after cv2.imshow, at 8 spaces."
        },
        {
          error: "The guide shows at the same time as the outline",
          solution: "The draw_guide call must be under else:, and else: must line up exactly with if data and points is not None:."
        },
        {
          error: "UnboundLocalError: cannot access local variable 'frame_count'",
          solution: "frame_count = 0 must be in main above the while loop."
        },
        {
          error: "The corner brackets point outwards or form a cross",
          solution: "Check the four direction pairs: (1, 1), (-1, 1), (1, -1), (-1, -1), in that order, matching the four corners."
        },
        {
          error: "SyntaxError on the long for (px, py), (dx, dy) line",
          solution: "That list continues onto a second line. Python allows that only because the square bracket is still open — check every bracket closes on the second line: ...((x2, y2), (-1, -1))]:."
        }
      ],
      file: {
        filename: "qr_scanner.py",
        code: step3Code,
        newLineIndices: [...range(110, 129), 182, ...range(214, 215), 218]
      }
    },
    {
      id: "qr-s4-4",
      index: 3,
      title: "Finish the outline: corner dots and a name label",
      say: "Back to the outline from Session 2. We finish draw_qr_outline by adding to the end of it: a dot on each of the four corners, and a coloured label just above the code's top-left corner showing the student's name — or UNKNOWN.\n\nThis is where the label value from handle_scan finally gets used. Nothing above these new lines changes.",
      commands: [],
      runCommand: "python qr_scanner.py",
      runResult: "Show a card: the outline now has a dot with a white ring at each corner, and a label tab in the outline's colour above the top-left corner — green with the student's name, amber if they were already scanned, red reading UNKNOWN for a code that isn't on the list.",
      why: "Each corner gets two circles: one filled in the outline's colour, then a white ring on top, so the dots stand out on dark and light backgrounds. tuple(p) turns a corner into the (x, y) form cv2.circle expects.\n\nTo find the top-left corner, we add each corner's x and y together: the top-left corner has the smallest total. pts.sum(axis=1) adds across each row, and np.argmin gives the position of the smallest — so the label always sits on the top-left, however the card is turned.\n\nmax(..., 90) keeps the label below the header bar: if the card is near the top of the screen, the label stops at y = 90 instead of hiding under the header. The label's background box is sized from text_width, so a long name gets a wider tab.",
      glossary: [
        {
          term: "for p in pts:",
          explanation: "repeats once for each of the four corners."
        },
        {
          term: "tuple(p)",
          explanation: "turns a corner into a fixed (x, y) pair."
        },
        {
          term: "pts.sum(axis=1)",
          explanation: "adds up each corner's x and y."
        },
        {
          term: "np.argmin(...)",
          explanation: "the position of the smallest value in a list."
        },
        {
          term: "max(value, 90)",
          explanation: "whichever is bigger — so the value never goes below 90."
        },
        {
          term: "int(...)",
          explanation: "turns a number into a whole number."
        }
      ],
      commonProblems: [
        {
          error: "The label is always empty",
          solution: "The outline call isn't passing last_label. It must be draw_qr_outline(frame, points, last_color, last_label) — set in Session 3, Step 4."
        },
        {
          error: "cv2.error … Can't parse 'center'. Sequence item with index 0 has a wrong type",
          solution: "The corner must be whole numbers in a tuple: tuple(p), with pts made by .astype(int) at the top of the function."
        },
        {
          error: "The label sits under the header bar when the card is high up",
          solution: "The max(..., 90) part is missing from the ly line."
        },
        {
          error: "NameError: name 'np' is not defined",
          solution: "import numpy as np at the top of the file (added in Step 1)."
        },
        {
          error: "The new lines aren't inside draw_qr_outline",
          solution: "They're part of the same function, so they start with 4 spaces (8 inside the for loop), directly under the cv2.polylines line."
        }
      ],
      file: {
        filename: "qr_scanner.py",
        code: step4Code,
        newLineIndices: [...range(135, 143)]
      }
    },
    {
      id: "qr-s4-5",
      index: 4,
      title: "A result banner that fades out",
      say: "Last piece of the display: a banner that pops up at the bottom when a card is scanned — PRESENT with a tick, ALREADY SCANNED with an exclamation mark, or UNKNOWN CODE with a cross — and fades away after a couple of seconds.\n\nhandle_scan has been preparing these messages since Session 3, in the toast dictionary. Now we draw them. TOAST_SECONDS sets how long a banner stays up.",
      commands: [],
      runCommand: "python qr_scanner.py",
      runResult: "Scan a card: a dark banner slides in at the bottom with a coloured stripe and icon — a green tick and Welcome, Juan Dela Cruz! (10:32 AM) — then fades out after about 2.5 seconds. Scan it again after it's gone for amber ALREADY SCANNED; show stranger.png for red UNKNOWN CODE.",
      why: "toast[\"start\"] is when the scan happened, so age = now - toast[\"start\"] is how long the banner has been up. Once it's older than TOAST_SECONDS it's not drawn at all. At startup, toast is {\"start\": 0.0} — a time decades ago — so no banner shows until the first scan.\n\nThe fade: for most of its life alpha is 1.0 (fully visible). In the last half-second, (TOAST_SECONDS - age) / 0.5 shrinks from 1 to 0, so the banner fades smoothly instead of vanishing.\n\nTo fade the whole banner at once, we draw it on layer — a copy of the frame — then blend that copy back over the frame with addWeighted. alpha * 0.92 means even at full strength the banner stays a touch see-through.\n\ndraw_icon draws a filled circle, then two lines for a tick (\"ok\"), a line and a dot for ! (\"warn\"), or two crossing lines for anything else. The banner is drawn last in the loop, so it sits on top of everything else.",
      glossary: [
        {
          term: "TOAST_SECONDS = 2.5",
          explanation: "how many seconds the result banner stays on screen."
        },
        {
          term: "toast[\"start\"]",
          explanation: "reads one value from the toast dictionary by its name."
        },
        {
          term: "img.copy()",
          explanation: "a separate copy of the picture to draw on, so it can be blended back later."
        },
        {
          term: "Fade-out",
          explanation: "gradually lowering how visible something is until it disappears."
        },
        {
          term: "elif",
          explanation: "\"else if\" — checked only when the if above was false."
        }
      ],
      commonProblems: [
        {
          error: "No banner ever appears",
          solution: "The draw_toast(frame, toast, now) call is missing from the loop. It goes right after the outline/guide block, before cv2.imshow."
        },
        {
          error: "The banner never fades — it stays forever",
          solution: "now isn't updated each frame (check now = time.time() after detectAndDecode), or the age > TOAST_SECONDS check is missing its return."
        },
        {
          error: "KeyError: 'color' (or 'icon', 'title')",
          solution: "A banner dictionary in handle_scan is missing that key or spells it differently. Each needs start, color, icon, title and subtitle."
        },
        {
          error: "NameError: name 'TOAST_SECONDS' is not defined",
          solution: "Add TOAST_SECONDS = 2.5 with the other settings at the top."
        },
        {
          error: "The icon is always a cross, even for PRESENT",
          solution: "The kind check is comparing different text: handle_scan uses \"ok\" and \"warn\", and draw_icon must compare against exactly those."
        },
        {
          error: "The banner covers the scan guide's hint",
          solution: "Only for the 2.5 seconds after a scan. That's expected — the result is more important than the hint right then."
        }
      ],
      file: {
        filename: "qr_scanner.py",
        code: step5Code,
        newLineIndices: [20, ...range(78, 90), ...range(162, 182), 264]
      }
    },
    {
      id: "qr-s4-6",
      index: 5,
      title: "Screenshots, a resizable window, and a focus fix",
      say: "Three finishing controls. Press S to save a screenshot of the scanner — handy for a report. The window becomes resizable, so you can fit it to any screen or a projector. And on Windows, a newly opened OpenCV window sometimes doesn't receive key presses until you click it — so the scanner brings its own window to the front once at startup, and pressing F does it again whenever keys stop working.",
      commands: [],
      runCommand: "python qr_scanner.py",
      runResult: "The window can now be resized by dragging its corner. Press S: the terminal prints Saved scanner_01.png, and the picture — header, sidebar and all — appears in the folder you ran the command from. Press S again for scanner_02.png. On Windows, the window also comes to the front by itself just after it opens; if keys ever stop working, press F (or click the window).",
      why: "cv2.namedWindow(WINDOW_NAME, cv2.WINDOW_NORMAL) creates the window before the loop with resizing allowed. It only works because imshow uses the exact same WINDOW_NAME — that's why the name lives in one setting.\n\nThe S key adds 1 to shot_count and builds a file name with {shot_count:02d}, which pads the number to two digits: scanner_01.png, scanner_02.png. cv2.imwrite saves the frame exactly as shown, overlays included. The count restarts every run, so a new run overwrites last run's scanner_01.png — move screenshots you want to keep.\n\nforce_window_focus talks directly to Windows through ctypes: it finds our window by its title and asks Windows to show it and bring it to the front. It's called once at frame 5 (the window definitely exists by then) and on F. On macOS or Linux there's no ctypes.windll, so the code fails — and try/except Exception: pass quietly ignores that, making the function do nothing. Click the window instead on those systems.",
      glossary: [
        {
          term: "import ctypes",
          explanation: "lets Python call functions that are built into the operating system."
        },
        {
          term: "cv2.namedWindow(name, cv2.WINDOW_NORMAL)",
          explanation: "creates a window that you can resize."
        },
        {
          term: "f\"scanner_{shot_count:02d}.png\"",
          explanation: "builds the file name with the number padded to two digits (01, 02…)."
        },
        {
          term: "cv2.imwrite(filename, frame)",
          explanation: "saves a picture to a file."
        },
        {
          term: "ctypes.windll.user32",
          explanation: "Windows' own window-control functions (Windows only)."
        },
        {
          term: "FindWindowW / SetForegroundWindow",
          explanation: "find a window by its title, and bring it to the front so it gets the key presses."
        },
        {
          term: "except Exception: pass",
          explanation: "if anything goes wrong, ignore it and carry on."
        }
      ],
      commonProblems: [
        {
          error: "Saved scanner_01.png, but you can't find the file",
          solution: "Screenshots go in the folder the terminal is in when you started the scanner, not necessarily next to qr_scanner.py. Run the scanner from the qr-attendance folder."
        },
        {
          error: "Last session's screenshot got replaced",
          solution: "The counter restarts at 01 on every run. Rename or move screenshots you want to keep."
        },
        {
          error: "Two windows open — one empty, one with the camera",
          solution: "The namedWindow and imshow names don't match. Both must use WINDOW_NAME, not typed-out text."
        },
        {
          error: "Pressing F does nothing",
          solution: "F only works if the window is still getting key presses — if it isn't, click the window once. On macOS and Linux the focus fix does nothing at all; clicking is the fix there."
        },
        {
          error: "AttributeError: module 'ctypes' has no attribute 'windll' (macOS/Linux)",
          solution: "The try:/except Exception: pass lines around the Windows calls are missing. With them, the function quietly does nothing outside Windows."
        },
        {
          error: "Pressing S saves a black or frozen picture",
          solution: "It saves the current frame; if the stream had stalled (phone screen locked), that's what you get. Restart IP Webcam's server."
        },
        {
          error: "cv2.imwrite returns False and no file appears",
          solution: "The folder isn't writable (for example a protected system folder). cd into your qr-attendance folder and run from there."
        }
      ],
      file: {
        filename: "qr_scanner.py",
        code: step6Code,
        newLineIndices: [1, ...range(186, 195), ...range(244, 246), ...range(283, 284), ...range(290, 296)]
      }
    },
    {
      id: "qr-s4-7",
      index: 6,
      title: "Tidy-up: a file description and section headings",
      say: "The scanner is complete. Like the generator, we finish with a tidy-up that changes nothing about what it does: a description at the top of the file saying what it is and listing the keys, and four heading boxes splitting the file into Config, Attendance log, Drawing helpers and Main loop.\n\nAfter this step, your qr_scanner.py should match the finished file exactly — all 335 lines.",
      commands: [],
      runCommand: "python qr_scanner.py",
      runResult: "Exactly the same scanner as Step 6. Run the full check one last time: a new card shows green PRESENT, the count and sidebar update, a repeat shows amber, stranger.png shows red, S saves a screenshot, and Q or ESC quits.",
      why: "A 335-line file is hard to find your way around. The four headings act like chapter titles: settings at the top, then the file-handling code, then everything that draws, then the program's main loop. The description at the top tells anyone opening the file how to use it — including the keys, which are otherwise only discoverable by reading the code.\n\nNone of these lines are code Python runs — the description is a docstring and the headings are comments — so the program behaves identically. Comparing your file with the finished one now is the session's checkpoint.",
      glossary: [
        {
          term: "Module docstring",
          explanation: "a description in triple quotes at the very top of a file, saying what it does and how to use it."
        },
        {
          term: "Section heading comment",
          explanation: "comment lines drawn as a box (# ----) marking where a part of the file begins."
        }
      ],
      commonProblems: [
        {
          error: "SyntaxError: unterminated triple-quoted string literal",
          solution: "The description needs three double quotes on the first line and three on its last line. One is missing."
        },
        {
          error: "Your file isn't exactly 335 lines",
          solution: "An extra or missing blank line makes no difference to Python. Compare the code itself with the full-file panel."
        },
        {
          error: "Something behaves differently from Step 6",
          solution: "A code line was changed by accident while adding headings. This step only adds the description and comment lines — compare the code against the full-file panel."
        }
      ],
      file: {
        filename: "qr_scanner.py",
        code: step7Code,
        newLineIndices: [...range(0, 11), ...range(24, 26), ...range(52, 54), ...range(82, 84), ...range(224, 226)]
      }
    }
  ],
  wrapUp: "qr_scanner.py is finished, and with qr_generator.py it's a complete attendance system: printable QR ID cards, a live scanner that checks each card against the class list, one check-in per student per day, a CSV record that survives restarts, and a kiosk-style screen. Every line typed and explained. Look back at how it grew: read a code, then remember it, then decide what it means, then make it look good — that order works for almost any project.",
  closingFramingNote: "A note on what this system collects. attendance.csv is personal data: names, student IDs, and exactly when each person arrived. Before using a system like this for real, decide who is allowed to open that file, where it's kept, how long it's kept, and tell students plainly what's recorded and why — and ask for their agreement. The syllabus's Smart Attendance module (Module 8) takes the next step and sends these records to the cloud, to a Google Sheet or a database; that makes them easier to share, and also easier to leak, so the same questions matter even more there. And be honest about the limits: a QR card is just a picture, so anyone with a photo of a classmate's card can check them in. This demo shows the idea; a real attendance system would need a way to check the person matches the card."
};
