import type { Session } from "../types";
import { allLines, range } from "../lib";

const step1Code = `import os

import cv2

MODEL_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "hand_landmarker.task"
)
MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/hand_landmarker/"
    "hand_landmarker/float16/1/hand_landmarker.task"
)

CAM_SOURCE = 0  # laptop webcam. Lab PC + phone: "http://localhost:8080/video"
FRAME_W, FRAME_H = 1280, 720`;

const step2Code = `${step1Code}


def ensure_model():
    if os.path.exists(MODEL_PATH):
        return
    print("Downloading hand landmark model (one-time, ~8 MB)...")
    import urllib.request
    urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)
    print("Model downloaded.")`;

const step3Code = `${step2Code}


def main():
    ensure_model()

    if isinstance(CAM_SOURCE, int):
        cap = cv2.VideoCapture(CAM_SOURCE, cv2.CAP_DSHOW)
    else:
        cap = cv2.VideoCapture(CAM_SOURCE)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, FRAME_W)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, FRAME_H)

    if not cap.isOpened():
        raise RuntimeError("Could not open webcam. Check CAM_SOURCE / camera permissions.")


if __name__ == "__main__":
    main()`;

const step4Code = `import os

import cv2

MODEL_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "hand_landmarker.task"
)
MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/hand_landmarker/"
    "hand_landmarker/float16/1/hand_landmarker.task"
)

CAM_SOURCE = 0  # laptop webcam. Lab PC + phone: "http://localhost:8080/video"
FRAME_W, FRAME_H = 1280, 720


def ensure_model():
    if os.path.exists(MODEL_PATH):
        return
    print("Downloading hand landmark model (one-time, ~8 MB)...")
    import urllib.request
    urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)
    print("Model downloaded.")


def main():
    ensure_model()

    if isinstance(CAM_SOURCE, int):
        cap = cv2.VideoCapture(CAM_SOURCE, cv2.CAP_DSHOW)
    else:
        cap = cv2.VideoCapture(CAM_SOURCE)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, FRAME_W)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, FRAME_H)

    if not cap.isOpened():
        raise RuntimeError("Could not open webcam. Check CAM_SOURCE / camera permissions.")

    print("Hand & Finger AR Tracker running. Press 'q' to quit.")

    while True:
        ok, frame = cap.read()
        if not ok:
            break

        frame = cv2.flip(frame, 1)

        cv2.imshow("Hand & Finger AR Tracker", frame)


if __name__ == "__main__":
    main()`;

const step5Code = `import os

import cv2

MODEL_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "hand_landmarker.task"
)
MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/hand_landmarker/"
    "hand_landmarker/float16/1/hand_landmarker.task"
)

CAM_SOURCE = 0  # laptop webcam. Lab PC + phone: "http://localhost:8080/video"
FRAME_W, FRAME_H = 1280, 720


def ensure_model():
    if os.path.exists(MODEL_PATH):
        return
    print("Downloading hand landmark model (one-time, ~8 MB)...")
    import urllib.request
    urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)
    print("Model downloaded.")


def main():
    ensure_model()

    if isinstance(CAM_SOURCE, int):
        cap = cv2.VideoCapture(CAM_SOURCE, cv2.CAP_DSHOW)
    else:
        cap = cv2.VideoCapture(CAM_SOURCE)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, FRAME_W)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, FRAME_H)

    if not cap.isOpened():
        raise RuntimeError("Could not open webcam. Check CAM_SOURCE / camera permissions.")

    print("Hand & Finger AR Tracker running. Press 'q' to quit.")

    while True:
        ok, frame = cap.read()
        if not ok:
            break

        frame = cv2.flip(frame, 1)

        cv2.imshow("Hand & Finger AR Tracker", frame)
        key = cv2.waitKey(1) & 0xFF
        if key in (ord('q'), 27):
            break

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()`;

export const handSession1: Session = {
  id: "hand-s1",
  sessionNumber: 1,
  track: "Hand Tracking (1 of 4)",
  title: "Hand Tracking — Session 1 (Webcam Loop)",
  syllabusMapping: "Module 10 — Hand Tracking & Gesture Control (lead-in)",
  buildsToward: "source code/hand-tracking/hand_ar.py",
  sessionGoal:
    "Today we don't detect a single hand — we just get a live, mirrored camera window on screen that we can cleanly quit. Every session after this adds one more layer on top of exactly this loop.",
  instructorNotes: [
    "Code-display convention (used in every session): each step shows the entire file as it should look after that step, with every line added in this step marked as new. Nothing else in the file changes shape between steps.",
    "Camera source note: students already set up their CAM_SOURCE value in the Setup & Environment session (Step 7/8 — laptop webcam as an int, or \"http://localhost:8080/video\" for lab-PC students on Path B). Step 3 below reuses that exact pattern; don't re-teach it from scratch, just point back to it.",
  ],
  wrapUp:
    "That's the whole shape every future session builds on: open the camera through CAM_SOURCE, loop — read, mirror, show, check for quit — then clean up. Nothing was detected today; next session we load the hand landmark model we already prepared for and start drawing a skeleton over real hands.",
  steps: [
    {
      id: "hand-s1-1",
      index: 0,
      title: "Imports and config constants",
      say: "Before we open a camera, we set up the two things this whole file will need: what to import, and where the hand-tracking model file lives on disk (we're not using the model yet — that's next session — but we set up its location now so next session is a one-line addition, not a restructuring).",
      file: {
        filename: "hand_ar.py",
        code: step1Code,
        newLineIndices: allLines(step1Code),
        newFileNote:
          "Create a new file called hand_ar.py inside your cv-iot-class folder — the same folder as hello_webcam.py from the Setup session (not inside venv/). hello_webcam.py isn't touched again after this.",
      },
      commands: [],
      why: "os.path.dirname(os.path.abspath(__file__)) builds a path relative to this file's own location rather than wherever the terminal happens to be cd'd into — so the model always downloads next to hand_ar.py no matter where you run it from. MODEL_PATH/MODEL_URL aren't used yet, but defining them now means Step 2 (and next session's real detection) doesn't require touching this block again.",
      glossary: [
        { term: "import os", explanation: "brings in Python's built-in toolbox for working with files and folders." },
        { term: "os.path.join(...)", explanation: "safely combines folder/file names into one path, using the right slash style for your operating system." },
        { term: "os.path.dirname(...) / os.path.abspath(...)", explanation: "get the folder a file lives in, and turn a path into its full, unambiguous version." },
        { term: "__file__", explanation: "a special variable that always holds the path to the current script itself." },
      ],
      commonProblems: [
        { error: "Running the script from a different folder than expected", solution: "Being surprised the model later downloads somewhere unexpected — os.path.dirname(os.path.abspath(__file__)) is exactly what prevents this; point it out explicitly." },
        { error: "(Phone over USB) Copy-pasting CAM_SOURCE as a plain number when it should be a quoted URL string", solution: "Python will happily accept CAM_SOURCE = http://localhost:8080/video as a syntax error; the quotes matter." },
      ],
    },
    {
      id: "hand-s1-2",
      index: 1,
      title: "Auto-download the hand landmark model (ensure_model)",
      say: "The hand-tracking model is an ~8 MB file we don't want everyone re-downloading every single run. This function checks if it's already there, and only reaches out to the internet if it isn't.",
      file: { filename: "hand_ar.py", code: step2Code, newLineIndices: range(16, 22) },
      commands: [],
      why: "os.path.exists(MODEL_PATH) makes this idempotent — call it every run, and it only actually downloads once. import urllib.request is placed inside the function instead of at the top of the file since it's only needed in the rare case a download actually happens — a small, deliberate choice, not a mistake if students ask why it's not up with the other imports.",
      glossary: [
        { term: "def ensure_model():", explanation: "defines a function: a named, reusable block of code you can run whenever you call ensure_model()." },
        { term: "return", explanation: "exits a function immediately. Here: \"if the file's already there, stop — there's nothing more to do.\"" },
        { term: "print(...)", explanation: "writes a line of text to the terminal, so you can see what's happening." },
        { term: "import urllib.request (inside the function)", explanation: "brings in a built-in tool for downloading things from the internet, loaded only when it's actually needed." },
        { term: "urllib.request.urlretrieve(url, path)", explanation: "downloads whatever's at that web address and saves it to that file path." },
      ],
      commonProblems: [
        { error: "No internet on first run", solution: "The download will fail with a network error; the model needs internet at least once, after which it works fully offline." },
        { error: "School network firewall blocking storage.googleapis.com", solution: "If the download hangs or errors, this is the first thing to check with IT." },
        { error: "An interrupted download can leave a corrupted, partial hand_landmarker.task file", solution: "os.path.exists still returns True on the next run without the file actually being valid — if detection fails oddly next session, deleting the .task file and re-running to force a fresh download is the fix." },
      ],
    },
    {
      id: "hand-s1-3",
      index: 2,
      title: "Open the camera via CAM_SOURCE",
      say: "This is the exact same open-a-camera code from the \"Hello, Camera\" script in the Setup session — same isinstance branch, same idea, just moved into the real project. If that worked for you already, this will too.",
      file: {
        filename: "hand_ar.py",
        code: step3Code,
        newLineIndices: [...range(25, 36), ...range(39, 40)],
      },
      commands: [],
      why: "we now have a real main() function — everything from here on lives inside it. ensure_model() runs first so the download (if needed) happens before we ever touch the camera, not in the middle of a live session. The isinstance check is the whole trick: a plain number means \"open a local device by index\" (cv2.CAP_DSHOW is the Windows backend for that), a string means \"open this as a stream URL\" and OpenCV picks its FFmpeg backend automatically — no other code needs to know or care which path a student is on.",
      goodToKnow:
        "cap.set(CAP_PROP_FRAME_WIDTH/HEIGHT) only has an effect on a real device (Path A / native UVC). On a URL/MJPEG stream (Path B), the phone's app controls the resolution and these two lines quietly do nothing — that's expected, not something to debug.",
      glossary: [
        { term: "cap.set(cv2.CAP_PROP_FRAME_WIDTH, ...)", explanation: "asks the camera to use a specific picture width (and, on the next line, height), when the camera supports changing it." },
        { term: "if __name__ == \"__main__\":", explanation: "a standard Python pattern meaning \"only run this part when the file is run directly, not when it's imported into another file.\"" },
      ],
      commonProblems: [
        { error: "(Phone over USB) Could not open webcam", solution: "Almost always means adb forward tcp:8080 tcp:8080 isn't active anymore (it resets whenever the phone is unplugged/replugged) or IP Webcam's server was stopped on the phone. Re-run the adb forward command and confirm the app still shows \"Streaming.\"" },
        { error: "(Laptop webcam) Wrong camera opens (e.g. an IR camera instead of the real one)", solution: "Try CAM_SOURCE = 1." },
        { error: "(Either path) Another app already has the camera open", solution: "Zoom, Teams, a browser tab, etc. — close it first." },
        { error: "Forgetting the if __name__ == \"__main__\": guard entirely", solution: "Would still technically run in this file today, but it's the standard pattern that lets a file be imported elsewhere without auto-running — worth mentioning once, not worth dwelling on." },
      ],
    },
    {
      id: "hand-s1-4",
      index: 3,
      title: "The capture loop: read, mirror, show",
      say: "Now we actually pull frames from the camera and put them on screen, continuously, mirrored so it feels natural to look at your own hand.",
      file: { filename: "hand_ar.py", code: step4Code, newLineIndices: range(38, 47) },
      commands: [],
      why: "cap.read() returns two things — ok (did we actually get a frame?) and frame (the image itself, as a NumPy array). Checking ok before using frame matters because a dropped Wi-Fi-free USB phone stream or an unplugged webcam will make cap.read() return False — without the check, the next line would crash trying to process None. cv2.flip(frame, 1) mirrors the image left-right: a raw webcam feed shows you as others see you, but for something you're controlling with your own hand in real time, seeing yourself mirrored (like a mirror on a wall) feels natural — try both and you'll immediately feel why.",
      glossary: [
        { term: "while True:", explanation: "a loop that repeats forever, until something inside it explicitly stops it." },
        { term: "ok, frame = cap.read()", explanation: "pulls two values out of what cap.read() hands back, into two separate variables at once." },
        { term: "break", explanation: "immediately exits the loop it's inside." },
        { term: "cv2.flip(frame, 1)", explanation: "flips a picture left-to-right, like a mirror." },
        { term: "NumPy array", explanation: "the format OpenCV stores pictures in: a big grid of numbers representing pixel colors." },
      ],
      commonProblems: [
        { error: "Skipping the if not ok: break check \"because the camera obviously works\"", solution: "Leads to confusion later when the phone stream (Path B) hiccups and the whole thing crashes instead of just ending the loop cleanly." },
        { error: "Forgetting cv2.flip", solution: "Makes every gesture in later sessions feel backwards — moving your hand right visually moves left on screen." },
        { error: "The window won't actually appear yet at the end of this step", solution: "That's expected — we haven't added cv2.waitKey() yet, which is what actually pumps the window's event loop. Don't run it yet; Step 5 finishes it." },
      ],
    },
    {
      id: "hand-s1-5",
      index: 4,
      title: "Quit key handling and cleanup",
      say: "Right now if you ran this, the window would appear to freeze — nothing responds to keys, and there's no way to stop it except killing the terminal. This step fixes both.",
      file: { filename: "hand_ar.py", code: step5Code, newLineIndices: range(48, 53) },
      commands: [],
      runCommand: "python hand_ar.py",
      runResult:
        "You should see a mirrored, live camera window with the title \"Hand & Finger AR Tracker\" — nothing drawn on it yet, but it quits cleanly on q or Esc.",
      why: "cv2.waitKey(1) does two jobs at once — it waits up to 1 millisecond for a keypress, and it's what actually lets the OpenCV window redraw and respond to being clicked/moved; skip it and the window looks frozen even though the loop is still running. & 0xFF masks the result down to its lowest byte — on some platforms waitKey returns extra high-order bits alongside the key code, and without the mask, comparing against ord('q') can silently fail. 27 is the ASCII code for the Esc key, which has no convenient ord() letter form. cap.release() and cv2.destroyAllWindows() after the loop free the camera device and close the window — without cap.release(), the camera can stay \"locked\" by Python even after the window closes, and the next run (or, on Path B, IP Webcam trying to reconnect) fails to open it until you restart.",
      glossary: [
        { term: "cv2.waitKey(1)", explanation: "pauses briefly (here, 1 millisecond) waiting for a keypress, and lets the window redraw while it waits." },
        { term: "& 0xFF", explanation: "keeps only the lowest 8 bits of a number; used here to make key-code comparisons reliable across different computers." },
        { term: "ord('q')", explanation: "converts a single character into the number your computer uses to represent it." },
        { term: "cap.release()", explanation: "lets go of the camera, so other programs (or your next run) can use it." },
        { term: "cv2.destroyAllWindows()", explanation: "closes every window your script opened." },
      ],
      commonProblems: [
        { error: "Pressing q and nothing happening", solution: "The OpenCV window needs to be the focused/clicked window for cv2.waitKey to see the keypress; clicking the terminal instead of the video window is the most common cause." },
        { error: "Forgetting cap.release() (e.g. by editing out the bottom lines while experimenting)", solution: "Leads to \"Could not open webcam\" on the next run — the fix is simply restarting the Python process, which forces the OS to reclaim the device." },
        { error: "Confusing this quit handling with a program crash", solution: "A clean break out of the loop followed by cleanup is the intended, correct way this program ends every single time." },
      ],
    },
  ],
};
