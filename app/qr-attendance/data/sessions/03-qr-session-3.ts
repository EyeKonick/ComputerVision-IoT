import type { Session } from "../types";
import { range } from "../lib";

const step1Code = `import cv2

from qr_generator import CLASS_NAME, STUDENTS

WINDOW_NAME = "QR ATTENDANCE SCANNER"

CAM_SOURCE = 0
# Laptop with a built-in webcam: leave as the device index above (0).
# Lab PC with no webcam: set to your phone's IP Webcam stream tunneled over
# USB via \`adb forward tcp:8080 tcp:8080\`, e.g.:
#   CAM_SOURCE = "http://localhost:8080/video"

ROSTER = {student_id: name for student_id, name in STUDENTS}


def draw_qr_outline(img, points, color, label):
    pts = points.reshape(-1, 2).astype(int)
    cv2.polylines(img, [pts], True, color, 4, cv2.LINE_AA)


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

    while True:
        ok, frame = cap.read()
        if not ok:
            print("Camera frame not received - check CAM_SOURCE.")
            break

        # Read the QR code from the *original* (unmirrored) frame - the safest
        # input for the detector, since older OpenCV versions can't read mirrored codes.
        data, points, _ = detector.detectAndDecode(frame)

        # Then mirror the picture so it feels like a selfie camera, and
        # mirror the QR corner points to match.
        frame = cv2.flip(frame, 1)
        if points is not None:
            points = points.reshape(-1, 2).copy()
            points[:, 0] = frame.shape[1] - 1 - points[:, 0]

        if data:
            print("Scanned:", data)

        if data and points is not None:
            draw_qr_outline(frame, points, (0, 255, 0), "")

        cv2.imshow(WINDOW_NAME, frame)

        key = cv2.waitKey(1) & 0xFF
        if key in (ord("q"), 27):
            break

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()`;

const step2Code = `import time

import cv2

from qr_generator import CLASS_NAME, STUDENTS

WINDOW_NAME = "QR ATTENDANCE SCANNER"

CAM_SOURCE = 0
# Laptop with a built-in webcam: leave as the device index above (0).
# Lab PC with no webcam: set to your phone's IP Webcam stream tunneled over
# USB via \`adb forward tcp:8080 tcp:8080\`, e.g.:
#   CAM_SOURCE = "http://localhost:8080/video"

RESCAN_COOLDOWN = 3.0    # ignore the same code for this long while it stays in view

ROSTER = {student_id: name for student_id, name in STUDENTS}


def draw_qr_outline(img, points, color, label):
    pts = points.reshape(-1, 2).astype(int)
    cv2.polylines(img, [pts], True, color, 4, cv2.LINE_AA)


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
    last_data, last_time = None, 0.0

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
                print("Scanned:", data)
                last_data = data
            last_time = now

        if data and points is not None:
            draw_qr_outline(frame, points, (0, 255, 0), "")

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

from qr_generator import CLASS_NAME, STUDENTS

WINDOW_NAME = "QR ATTENDANCE SCANNER"

CAM_SOURCE = 0
# Laptop with a built-in webcam: leave as the device index above (0).
# Lab PC with no webcam: set to your phone's IP Webcam stream tunneled over
# USB via \`adb forward tcp:8080 tcp:8080\`, e.g.:
#   CAM_SOURCE = "http://localhost:8080/video"

ATTENDANCE_FILE = Path(__file__).parent / "attendance.csv"

RESCAN_COOLDOWN = 3.0    # ignore the same code for this long while it stays in view

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


def draw_qr_outline(img, points, color, label):
    pts = points.reshape(-1, 2).astype(int)
    cv2.polylines(img, [pts], True, color, 4, cv2.LINE_AA)


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
    last_data, last_time = None, 0.0
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
                print("Scanned:", data)
                last_data = data
            last_time = now

        if data and points is not None:
            draw_qr_outline(frame, points, (0, 255, 0), "")

        cv2.imshow(WINDOW_NAME, frame)

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

from qr_generator import CLASS_NAME, STUDENTS

WINDOW_NAME = "QR ATTENDANCE SCANNER"

CAM_SOURCE = 0
# Laptop with a built-in webcam: leave as the device index above (0).
# Lab PC with no webcam: set to your phone's IP Webcam stream tunneled over
# USB via \`adb forward tcp:8080 tcp:8080\`, e.g.:
#   CAM_SOURCE = "http://localhost:8080/video"

ATTENDANCE_FILE = Path(__file__).parent / "attendance.csv"

RESCAN_COOLDOWN = 3.0    # ignore the same code for this long while it stays in view

# Colors are BGR (OpenCV order)
GREEN = (120, 200, 0)
AMBER = (0, 180, 255)
RED = (80, 80, 235)

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

export const qrSession3: Session = {
  id: "qr-s3",
  sessionNumber: 3,
  track: "QR Attendance (3 of 4)",
  title: "Attendance logic — PRESENT, logged",
  syllabusMapping: "Module 8 — From Script to System (Smart Attendance): timestamps and student records, logged here to a local CSV file (the Google Sheets / database step is beyond this activity)",
  buildsOn: "QR Session 2's live QR reader",
  buildsToward: "source-code/qr-attendance/qr_scanner.py",
  sessionGoal: "Today the scanner starts taking real attendance: it checks each card against the class list, marks each student present once, refuses unknown codes, and records every check-in in attendance.csv — which survives a restart.",
  instructorNotes: [
    "Code-display convention (used in every session): each step shows the entire file so far, with lines added or changed in that step marked as new.",
    "Say this before Step 2: the print(\"Scanned:\", data) line from Session 2 moves four spaces right, into the new cooldown if. In VS Code: select the line and press Tab.",
    "Step 4 replaces both of Session 2's temporary lines — the print line becomes the handle_scan call, and the fixed-green outline call becomes draw_qr_outline(frame, points, last_color, last_label). handle_scan is typed in its final form, including the toast banner dictionaries Session 4 draws.",
    "Step 5 has no new scanner code: it's a guided test of all three results plus a restart. Excel locks attendance.csv while it's open, which crashes the scanner on the next PRESENT — recommend VS Code for watching the file.",
    "After this session the only things left for Session 4 are additions: drawing helpers, the HUD, the banner, screenshots, the focus fix and a tidy-up. No more lines get replaced."
  ],
  steps: [
    {
      id: "qr-s3-1",
      index: 0,
      title: "Reuse the class list from qr_generator.py",
      say: "To take attendance, the scanner has to know who's in the class. We don't type the list again — we import it straight from qr_generator.py. One list, two programs: edit the class in one place and both the cards and the scanner agree.\n\nThen we turn that list into a lookup table called ROSTER, so that given an ID, the scanner can find the name instantly.",
      commands: [],
      runCommand: "python qr_scanner.py",
      runResult: "The scanner runs exactly as before. Check one thing in the terminal: no Saved … lines appear. If you see the generator making cards when the scanner starts, the if __name__ == \"__main__\" guard in qr_generator.py is missing.",
      why: "from qr_generator import CLASS_NAME, STUDENTS runs qr_generator.py and pulls out those two values. Python finds qr_generator.py because it looks in the same folder as the program you started — which is exactly why the two files must sit side by side.\n\nWhen a file is imported, every line in it runs, top to bottom. The generator's main() would make all the cards again — except that the guard from Session 1 checks if __name__ == \"__main__\", which is false during an import. So importing reads the list and makes nothing.\n\nROSTER = {student_id: name for student_id, name in STUDENTS} builds a dictionary: a table where each ID points to its name. Looking up ROSTER[\"2024-0003\"] gives \"Jose Rizal\" straight away, without searching through the list. We use CLASS_NAME in Session 4's header.",
      glossary: [
        {
          term: "from qr_generator import CLASS_NAME, STUDENTS",
          explanation: "loads two values from your own qr_generator.py file, so this file can use them."
        },
        {
          term: "Module",
          explanation: "any Python file another file can import — your own files count too."
        },
        {
          term: "Dictionary { key: value }",
          explanation: "a lookup table: give it a key (here, an ID) and it gives back the matching value (the name)."
        },
        {
          term: "{student_id: name for student_id, name in STUDENTS}",
          explanation: "builds a dictionary in one line by going through every (ID, name) pair in the list."
        }
      ],
      commonProblems: [
        {
          error: "ModuleNotFoundError: No module named 'qr_generator'",
          solution: "qr_scanner.py and qr_generator.py aren't in the same folder, or the generator file is named differently (qr-generator.py, QR_Generator.py, qr_generator.py.txt). Put both in qr-attendance with exactly those names, and run the scanner from that folder."
        },
        {
          error: "ImportError: cannot import name 'STUDENTS' from 'qr_generator'",
          solution: "The name is spelled differently in qr_generator.py (Students, STUDENT). It must be STUDENTS and CLASS_NAME in capitals in both files."
        },
        {
          error: "Starting the scanner prints Saved 2024-0001… lines",
          solution: "qr_generator.py is missing its last two lines, if __name__ == \"__main__\": and main(). Without them, importing it makes all the cards again."
        },
        {
          error: "The scanner starts slowly the first time",
          solution: "Python is reading qr_generator.py for the first time and saving a quick-start copy in a __pycache__ folder. That folder is normal — leave it."
        }
      ],
      file: {
        filename: "qr_scanner.py",
        code: step1Code,
        newLineIndices: [2, 12]
      }
    },
    {
      id: "qr-s3-2",
      index: 1,
      title: "One scan per card: a cooldown",
      say: "Remember the flood of Scanned: lines? A card held in front of the camera is read 20 or 30 times a second. For attendance, a card in view should count once.\n\nSo the scanner remembers the last code it reacted to (last_data) and when it last saw it (last_time). It reacts again only if a different code shows up, or the same card has been out of view for longer than RESCAN_COOLDOWN, 3 seconds.\n\nOne line you already have moves this step: the print(\"Scanned:\", data) line now sits inside the new if, so it moves 4 spaces to the right. In VS Code, select it and press Tab.",
      commands: [],
      runCommand: "python qr_scanner.py",
      runResult: "Show a card and hold it there: Scanned: prints once, not over and over. Show a second card: one line for it. Take a card away, wait more than 3 seconds, show it again: it prints once more.",
      why: "time.time() is the current time as a number of seconds, so now - last_time is how many seconds have passed since the code was last seen.\n\nThe check is: if data != last_data or now - last_time > RESCAN_COOLDOWN. Read it as: react if this is a different code from last time, or it's been more than 3 seconds since we last saw this code. Either one is enough — that's what or means.\n\nThe important detail is that last_time = now runs on every frame the card is in view, outside the inner if. So the 3 seconds only start counting once the card leaves. A card held up for a whole minute still counts once.\n\nlast_data starts as None and last_time as 0.0 (\"no code yet, a long time ago\"), so the very first card always counts. None never equals real text.",
      glossary: [
        {
          term: "import time / time.time()",
          explanation: "the current time as seconds (with decimals), used to measure how long something took."
        },
        {
          term: "RESCAN_COOLDOWN = 3.0",
          explanation: "how many seconds a card must be out of view before it counts again."
        },
        {
          term: "last_data, last_time = None, 0.0",
          explanation: "sets two starting values in one line: no code seen yet, at time zero."
        },
        {
          term: "None",
          explanation: "Python's value for \"nothing\" or \"not set yet\"."
        },
        {
          term: "!=",
          explanation: "\"is not equal to\"."
        },
        {
          term: "or",
          explanation: "true if either side is true."
        }
      ],
      commonProblems: [
        {
          error: "It still prints on every frame",
          solution: "last_time = now is inside the inner if (16 spaces). It must be at 12 spaces — inside if data:, but not inside the cooldown if — so it updates on every frame the card is in view."
        },
        {
          error: "IndentationError: expected an indented block after 'if' statement",
          solution: "The print line didn't move. Everything under the cooldown if — the print and last_data = data — needs 16 spaces."
        },
        {
          error: "NameError: name 'now' is not defined",
          solution: "now = time.time() must come right after the detectAndDecode line, inside the loop, before the if data: block uses it."
        },
        {
          error: "NameError: name 'time' is not defined",
          solution: "Add import time at the very top of the file."
        },
        {
          error: "UnboundLocalError: cannot access local variable 'last_data'",
          solution: "last_data, last_time = None, 0.0 must be inside main, above the while loop, at 4 spaces."
        },
        {
          error: "Showing the same card again after 2 seconds doesn't print",
          solution: "Correct — it has to be out of view for more than 3 seconds. Change RESCAN_COOLDOWN if you want a different wait."
        }
      ],
      file: {
        filename: "qr_scanner.py",
        code: step2Code,
        newLineIndices: [0, 14, 38, 49, ...range(59, 63)]
      }
    },
    {
      id: "qr-s3-3",
      index: 2,
      title: "The attendance file: log_attendance and load_today",
      say: "Attendance needs a record that survives after the program closes. We'll write every check-in to a file called attendance.csv: one row per student, with the date, the time, their ID and their name. CSV files open in Excel, Google Sheets or VS Code.\n\nWe write two functions. log_attendance adds one row to the file. load_today reads the file back and picks out only today's rows — so if the scanner crashes or gets restarted mid-class, it remembers who already checked in.\n\nAt startup the scanner now says how many students are already checked in today.",
      commands: [],
      runCommand: "python qr_scanner.py",
      runResult: "The terminal now starts with Scanner running. 0 already checked in today. Press Q to quit. Scanning still only prints Scanned: — log_attendance isn't used until the next step, so no attendance.csv file appears yet.",
      why: "ATTENDANCE_FILE uses Path(__file__).parent, like the generator's qr_codes folder, so the file always lands next to qr_scanner.py.\n\nIn log_attendance, open(..., \"a\") opens the file in append mode: new rows go on the end, and nothing already there is erased. If the file doesn't exist yet, it's created — so we check first (new_file) and write a header row with the column names only that one time.\n\nnewline=\"\" is required by Python's csv module on Windows; without it, every row is followed by an empty row. encoding=\"utf-8\" keeps names with accents (like Peña) intact.\n\nstrftime formats a date or time as text: %Y-%m-%d gives 2026-11-12, %H:%M:%S gives 14:05:09 (24-hour, for the file), and %I:%M %p gives 02:05 PM (12-hour, for showing on screen). The function returns that friendly time for later.\n\nload_today uses csv.DictReader, which reads each row as a dictionary keyed by the header names — row[\"date\"], row[\"name\"]. It keeps only rows whose date is today, so tomorrow the list starts empty while yesterday's record stays in the file.\n\nwith open(...) as f: closes the file automatically when the indented block ends, even if something goes wrong.",
      glossary: [
        {
          term: "import csv",
          explanation: "Python's tool for reading and writing CSV files."
        },
        {
          term: "CSV file",
          explanation: "a plain text table: one row per line, columns separated by commas. Opens in Excel and Google Sheets."
        },
        {
          term: "from datetime import datetime / datetime.now()",
          explanation: "the current date and time."
        },
        {
          term: ".strftime(\"%Y-%m-%d\")",
          explanation: "writes a date or time as text in the pattern you give; %H:%M:%S is 24-hour time, %I:%M %p is 12-hour time with AM/PM."
        },
        {
          term: "ATTENDANCE_FILE.exists()",
          explanation: "true if the file is already there."
        },
        {
          term: "with open(path, \"a\", newline=\"\", encoding=\"utf-8\") as f:",
          explanation: "opens a file to add to the end (\"a\"); the file closes by itself when the block ends."
        },
        {
          term: "csv.writer(f) / writer.writerow([...])",
          explanation: "writes a list of values as one comma-separated row."
        },
        {
          term: "csv.DictReader(f)",
          explanation: "reads each row as a dictionary, using the header row's names as keys."
        },
        {
          term: "checked_in.append((...))",
          explanation: "adds one item to the end of a list — here, a (ID, name, time) group."
        },
        {
          term: "not",
          explanation: "flips true to false and false to true."
        }
      ],
      commonProblems: [
        {
          error: "NameError: name 'csv' / 'datetime' / 'Path' is not defined",
          solution: "One of the three new import lines at the top is missing or misspelled. It's from datetime import datetime — the word twice."
        },
        {
          error: "AttributeError: module 'datetime' has no attribute 'now'",
          solution: "You wrote import datetime. It must be from datetime import datetime."
        },
        {
          error: "KeyError: 'date' when the scanner starts",
          solution: "attendance.csv exists but its first row isn't date,time,student_id,name — maybe you edited or re-saved it in Excel. Delete attendance.csv (it's made again on the next scan)."
        },
        {
          error: "Scanner running. … already checked in today never prints",
          solution: "The print line is missing, or it's below the while True: loop. It goes just before the loop, at 4 spaces."
        },
        {
          error: "No attendance.csv appears yet",
          solution: "Correct for this step. Nothing calls log_attendance until Step 4."
        },
        {
          error: "SyntaxError on the strftime lines",
          solution: "Each pattern is inside quotes, and the brackets close: now.strftime(\"%Y-%m-%d\"). Watch the commas between the four values in writer.writerow([...])."
        }
      ],
      file: {
        filename: "qr_scanner.py",
        code: step3Code,
        newLineIndices: [0, ...range(2, 3), 17, ...range(24, 44), 66, 68]
      }
    },
    {
      id: "qr-s3-4",
      index: 3,
      title: "Decide what a scan means: PRESENT, ALREADY SCANNED or UNKNOWN",
      say: "This is the heart of the attendance system: a function, handle_scan, that decides what one scanned code means. There are three possible answers:\n• UNKNOWN — the ID isn't on the class list (red).\n• ALREADY SCANNED — they're on the list but already checked in today (amber).\n• PRESENT — first scan today: log them to attendance.csv and add them to the list (green).\n\nTwo temporary lines from Session 2 are replaced this step. The print(\"Scanned:\", data) line is gone: in its place, call handle_scan. And the fixed-green outline line changes to use the colour and label handle_scan chose.\n\nhandle_scan also returns a third thing — a small message for a pop-up banner. We store it now and draw it in Session 4.",
      commands: [],
      runCommand: "python qr_scanner.py",
      runResult: "Show a card: the terminal prints PRESENT: 2024-0001 Juan Dela Cruz at 10:15 AM and the outline is green, and an attendance.csv file appears next to your scripts. Take it away for 3 seconds and show it again: nothing new is printed and the outline turns amber — already scanned. A code that isn't on the list turns red (we test that in the next step).",
      why: "data.partition(\"|\") splits the text at the first | into three parts: before, the | itself, and after. \"2024-0001|Juan Dela Cruz\" becomes \"2024-0001\", \"|\", \"Juan Dela Cruz\". We keep the ID and ignore the separator with _.\n\nThe checks run in order, and return leaves the function as soon as one matches. First: is the ID in ROSTER at all? If not, it's UNKNOWN — any QR code that isn't one of our cards, like a website link, ends up here.\n\nNotice name = ROSTER[student_id]: we use the name from our own class list, not the name written in the code. If someone made a fake card with a real ID and a joke name, the screen still shows the real student's name.\n\nany(sid == student_id for sid, _, _ in checked_in) asks \"is this ID anywhere in today's checked-in list?\" — True as soon as one entry matches.\n\nOnly the PRESENT path writes to the file and adds to checked_in, so each student is logged once per day. Colours are written blue-green-red in OpenCV, so (0, 180, 255) — lots of red, some green, a little blue — is amber.",
      glossary: [
        {
          term: "data.partition(\"|\")",
          explanation: "splits text at the first | into three parts: before, the | itself, and after."
        },
        {
          term: "student_id, _, name = ...",
          explanation: "unpacks three parts into names; _ means \"ignore this one\"."
        },
        {
          term: "not in ROSTER",
          explanation: "true if that key isn't in the dictionary — here, the ID isn't on the class list."
        },
        {
          term: "ROSTER[student_id]",
          explanation: "looks up the name that belongs to this ID."
        },
        {
          term: "any(...)",
          explanation: "true if at least one item in the list passes the check."
        },
        {
          term: "return RED, \"UNKNOWN\", {...}",
          explanation: "sends back three things at once: a colour, a label, and the banner message."
        },
        {
          term: "BGR colour",
          explanation: "OpenCV writes colours as (blue, green, red) — the opposite order to most other programs."
        },
        {
          term: "toast",
          explanation: "a small message banner that pops up and fades away; drawn in Session 4."
        }
      ],
      commonProblems: [
        {
          error: "PermissionError: [Errno 13] Permission denied: '…attendance.csv' — the scanner crashes on a scan",
          solution: "attendance.csv is open in Excel, and Excel locks the file so nothing else can write to it. Close it in Excel, then run the scanner again. To watch the file fill up while scanning, open it in VS Code instead — VS Code doesn't lock it."
        },
        {
          error: "The terminal still shows Scanned: lines",
          solution: "The old temporary print line is still there. Delete it — the line under the cooldown if is now last_color, last_label, toast = handle_scan(data, checked_in)."
        },
        {
          error: "Every card shows UNKNOWN (red)",
          solution: "The ID in the code doesn't match the ID in STUDENTS. If you edited the class list after making the cards, run python qr_generator.py again to remake them. Also check partition uses \"|\", the same character as the generator."
        },
        {
          error: "ValueError: too many values to unpack (expected 2)",
          solution: "The handle_scan call must unpack three names: last_color, last_label, toast = handle_scan(...)."
        },
        {
          error: "NameError: name 'GREEN' is not defined (or AMBER, RED)",
          solution: "The three colour lines must be at the top of the file, at the left edge, above ROSTER."
        },
        {
          error: "The outline is still always green",
          solution: "The outline line still has (0, 255, 0), \"\". Change it to draw_qr_outline(frame, points, last_color, last_label)."
        },
        {
          error: "A student shows PRESENT twice in one day",
          solution: "checked_in.append(...) is missing, so the scanner forgets them. It must come right after at = log_attendance(...)."
        },
        {
          error: "SyntaxError around the { } banner lines",
          solution: "Each banner dictionary opens with { at the end of the return line and closes with } on its own line. Each key-value pair is \"key\": value, separated by commas."
        }
      ],
      file: {
        filename: "qr_scanner.py",
        code: step4Code,
        newLineIndices: [...range(21, 24), ...range(57, 81), 99, 101, 125, 130]
      }
    },
    {
      id: "qr-s3-5",
      index: 4,
      title: "Test all three results and open attendance.csv",
      say: "Nothing new to type in the scanner — this step is a proper test of what we built. We want to see all three results and the file filling up.\n\nFor UNKNOWN we need a QR code that isn't on the class list. The first command makes one called stranger.png, using the same qrcode package as the generator.\n\nThen run the scanner and work through the checklist below. Finally, quit and start the scanner again — it should remember who already checked in.",
      commands: [
        {
          label: "1. Make a QR code that isn't on the class list (saves stranger.png)",
          language: "bash",
          code: "python -c \"import qrcode; qrcode.make('9999-0000|Stranger').save('stranger.png')\""
        },
        {
          label: "2. Run the scanner and try each result",
          language: "bash",
          code: "python qr_scanner.py\n\n# Card 1, first time   -> green  PRESENT: ... in the terminal\n# Card 1, again        -> amber  (already scanned)\n# stranger.png         -> red    (UNKNOWN)\n# Card 2               -> green  PRESENT: ..."
        },
        {
          label: "3. Quit (Q), then start it again — it should remember",
          language: "bash",
          code: "python qr_scanner.py\n# Scanner running. 2 already checked in today. Press Q to quit."
        }
      ],
      runResult: "attendance.csv appears next to your scripts. Open it in VS Code: a header row date,time,student_id,name, then one row per PRESENT scan. Rescans and unknown codes never add rows.",
      why: "Testing every path on purpose — including the \"wrong\" ones like an unknown code — is how you know a program really works, not just the happy case you tried first.\n\nThe restart test proves load_today: the scanner rebuilt its checked-in list from the file, so a crash in the middle of class doesn't lose anyone and doesn't let anyone check in twice. Tomorrow, load_today finds no rows with tomorrow's date, so everyone can check in again — while today's rows stay in the file as a record.\n\nTo start completely fresh while testing, quit the scanner and delete attendance.csv — a new one is made on the next scan.",
      glossary: [
        {
          term: "python -c \"...\"",
          explanation: "runs a short piece of Python straight from the terminal, without a file."
        },
        {
          term: "qrcode.make(text).save(file)",
          explanation: "the quick way to make a plain QR code of any text and save it as a picture."
        },
        {
          term: "Header row",
          explanation: "the first row of a CSV file, naming each column."
        }
      ],
      commonProblems: [
        {
          error: "PermissionError: [Errno 13] Permission denied: '…attendance.csv' — the scanner crashes on a scan",
          solution: "attendance.csv is open in Excel, and Excel locks the file so nothing else can write to it. Close it in Excel, then run the scanner again. To watch the file fill up while scanning, open it in VS Code instead — VS Code doesn't lock it."
        },
        {
          error: "stranger.png scans as nothing at all",
          solution: "Show it bigger — open it and zoom in, the same way as the cards (Session 2, Step 3). It's a plain code without a card around it, but it reads the same way."
        },
        {
          error: "Every row in Excel is crammed into column A",
          solution: "Your computer's region uses ; instead of , for lists. Open the file in VS Code or Google Sheets, or in Excel use Data → From Text/CSV and pick comma."
        },
        {
          error: "Excel shows the time or date differently from the file",
          solution: "Excel reformats dates and times for display. The file itself is plain text — open it in VS Code to see exactly what was written."
        },
        {
          error: "After restarting, it says 0 already checked in",
          solution: "Either the date changed (rows are only counted for today), or the scanner is writing to a different attendance.csv — check you're running the scanner from the qr-attendance folder, and that only one attendance.csv exists there."
        },
        {
          error: "SyntaxError when running the python -c command",
          solution: "Copying quotes is easy to get wrong: the outside quotes are double \", the inside ones single '. Type it exactly as shown."
        },
        {
          error: "You want to try it with the whole class",
          solution: "Go for it — share the qr_codes PNGs, and each student shows their own card. Delete attendance.csv first for a clean record."
        }
      ],
      file: null
    }
  ],
  wrapUp: "The scanner now takes attendance for real: one class list shared with the generator, one check-in per student per day, unknown codes refused, and a CSV record that survives a restart. That's a complete system — just not a pretty one yet. Next session we make it look and feel like a real attendance kiosk: a header with a live clock and count, a checked-in sidebar, a scan guide, pop-up results, and screenshots."
};
