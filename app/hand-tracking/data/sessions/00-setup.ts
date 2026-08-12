import type { Session } from "../types";
import { allLines } from "../lib";

const helloWebcamCode = `import cv2

CAM_SOURCE = 0  # laptop webcam (Path A). Lab PC + phone (Path B): "http://localhost:8080/video"

if isinstance(CAM_SOURCE, int):
    cap = cv2.VideoCapture(CAM_SOURCE, cv2.CAP_DSHOW)
else:
    cap = cv2.VideoCapture(CAM_SOURCE)

if not cap.isOpened():
    raise RuntimeError("Could not open camera. Check CAM_SOURCE / camera permissions.")

ok, frame = cap.read()
if ok:
    cv2.imshow("Hello, Camera", frame)
    cv2.waitKey(0)

cap.release()
cv2.destroyAllWindows()`;

export const setupSession: Session = {
  id: "setup",
  sessionNumber: null,
  track: "Lead-in (before Hand Tracking and Face Tracking)",
  title: "Setup & Environment",
  syllabusMapping:
    "Module 1 (abbreviated) — installing Python, pip, and a virtual environment; installing OpenCV; \"Hello, Image\" first program",
  sessionGoal:
    "By the end of today, everyone has Python, an isolated project environment, and both activities' libraries installed — and we've proven the camera works from Python before we build anything real on top of it.",
  instructorNotes: [
    "`source code/hand-tracking/requirements.txt` now also pins `mediapipe==0.10.14`, matching `source code/facial-recognition/requirements.txt`. Step 5 keeps the discussion of why pinning matters, since it's a useful, real example for students, but there's no longer a live mismatch in the repo.",
    "Two-path classroom note: Lab PCs have no built-in webcam and the room has no WiFi (Ethernet only). Students on lab PCs use their Android phone over USB as the camera instead; students with their own laptop keep using its built-in webcam. Step 6 below covers both. Both `hand_ar.py` and `face_tracker.py` read a single `CAM_SOURCE` config value (an int device index, or a URL string) instead of a hardcoded camera index, so the same script works either way.",
  ],
  wrapUp:
    "Everyone now has: Python confirmed, an isolated virtual environment, both activities' libraries installed at matching versions, and a proven working camera feed in Python — whether that's your laptop's webcam or your phone over USB. Next session, we open `hand_ar.py` and get real hand detection running on top of exactly this same camera loop.",
  steps: [
    {
      id: "setup-1",
      index: 0,
      title: "Confirm Python is installed and on PATH",
      say: "Before anything else, we need to know which Python we're actually running — mediapipe (the ML library both activities depend on) only ships pre-built wheels for specific Python versions, so \"some Python is installed\" isn't enough; we need to know which one.\n\n(Windows users: if `python --version` fails, try `py --version` instead.)",
      file: null,
      commands: [{ language: "bash", code: "python --version" }],
      why: "mediapipe's published wheels typically trail the newest Python release by a few months. If `python --version` reports something very new (e.g. a version released in the last month or two), `pip install mediapipe` in Step 5 may fail with no matching distribution — better to catch that now than mid-install.",
      glossary: [
        { term: "python --version", explanation: "a command that asks Python to tell you which version of itself is installed." },
        { term: "PATH", explanation: "a list your computer checks to find a program when you type its name in the terminal. If a program \"isn't on PATH,\" the terminal doesn't know where to find it." },
        { term: "py", explanation: "an alternative launcher command Windows installs alongside Python; useful when plain python doesn't work." },
      ],
      commonProblems: [
        "'python' is not recognized... (Windows) — Python isn't on PATH. Reinstall from python.org with \"Add python.exe to PATH\" checked, or use the py launcher instead.",
        "Windows opens the Microsoft Store instead of running Python — that's the store-app stub shadowing the real python command; same fix as above, or use py.",
        "macOS/Linux: python not found but python3 works — that's normal on those platforms; use python3 for every command in this session.",
        "Multiple Pythons installed, unsure which one's active — where python (Windows) / which python (macOS/Linux) shows the exact path being used.",
      ],
    },
    {
      id: "setup-2",
      index: 1,
      title: "Create the project folder and a virtual environment",
      say: "We're about to install two different sets of libraries into \"Python.\" If we install them globally, they'll collide with whatever else is on this machine — maybe a different mediapipe version another course needs. A virtual environment is a private, throwaway copy of Python just for this course's packages.",
      file: null,
      commands: [{ language: "bash", code: "mkdir cv-iot-class\ncd cv-iot-class\npython -m venv venv" }],
      why: "python -m venv venv creates a venv/ folder containing its own private python and pip. Nothing installed inside it touches the system-wide Python.",
      glossary: [
        { term: "Virtual environment (venv)", explanation: "a private, separate copy of Python just for this one project, so the packages it needs don't mix with anything else on your computer." },
        { term: "python -m venv venv", explanation: "the command that creates that private copy, in a folder named venv." },
        { term: "mkdir / cd", explanation: "terminal commands for making a new folder and moving into it." },
      ],
      commonProblems: [
        "Forgetting -m (python venv venv instead of python -m venv venv) — venv is a module, not a standalone command.",
        "On minimal Linux installs, venv module is missing — sudo apt install python3-venv fixes it.",
        "Creating the project folder inside a OneDrive-synced directory on Windows can cause odd permission/lock errors — prefer a local, non-synced folder (e.g. C:\\dev\\cv-iot-class) if this happens.",
      ],
    },
    {
      id: "setup-3",
      index: 2,
      title: "Activate the virtual environment",
      say: "Creating the venv doesn't turn it on — we still have to activate it in this terminal session so python/pip point inside venv/ instead of the system install.",
      file: null,
      commands: [
        {
          label: "Pick the line for your shell",
          language: "bash",
          code: "# Windows PowerShell\n.\\venv\\Scripts\\Activate.ps1\n\n# Windows cmd.exe\nvenv\\Scripts\\activate.bat\n\n# macOS / Linux / Git Bash on Windows\nsource venv/bin/activate",
        },
      ],
      why: "Activation temporarily rewrites PATH for this terminal window only, so pip install in Step 5 lands inside venv/ instead of globally. You'll see (venv) appear at the start of the prompt when it worked.",
      glossary: [
        { term: "Activate", explanation: "switches your current terminal to use the virtual environment's private Python instead of the computer's main one." },
        { term: "source (macOS/Linux)", explanation: "runs a script's commands directly inside your current terminal, rather than starting it as a separate process. That's needed here, since activation only works if it changes this terminal's own settings." },
      ],
      commonProblems: [
        "PowerShell error: \"cannot be loaded because running scripts is disabled on this system\" — PowerShell's execution policy is blocking the activation script. Fix (run once, in an admin PowerShell): Set-ExecutionPolicy -Scope CurrentUser RemoteSigned.",
        "Opening a new terminal tab/window later in the semester and forgetting to reactivate — if (venv) isn't showing, packages will silently install globally again.",
        "VS Code's integrated terminal or \"Run\" button using a different Python interpreter than the one you activated manually — see Step 4.",
      ],
    },
    {
      id: "setup-4",
      index: 3,
      title: "Confirm the venv is actually active",
      say: "This is the single most common setup mistake, so we check it explicitly instead of assuming Step 3 worked.",
      file: null,
      commands: [{ language: "bash", code: "# Windows\nwhere python\n\n# macOS / Linux\nwhich python" }],
      why: "The path printed should be inside your cv-iot-class/venv/ folder, not a system path like C:\\Python312\\python.exe or /usr/bin/python3. If installs later seem to \"disappear,\" this is the first thing to re-check.",
      glossary: [
        { term: "where (Windows) / which (macOS/Linux)", explanation: "asks the terminal exactly which file it would run when you type a command's name." },
      ],
      commonProblems: [
        "Path points outside venv/ — activation didn't take; repeat Step 3.",
        "In VS Code specifically: the terminal can be activated correctly while the \"Run Python File\" button uses a different, VS Code–selected interpreter. Use the interpreter picker (bottom-right status bar, or Ctrl+Shift+P → \"Python: Select Interpreter\") and choose the one inside venv/.",
      ],
    },
    {
      id: "setup-5",
      index: 4,
      title: "Install both activities' dependencies",
      say: "Both activities need OpenCV (camera + image handling) and MediaPipe (the hand/face ML models); the hand-tracking activity also uses NumPy directly for the trail math.",
      file: null,
      commands: [{ language: "bash", code: "pip install opencv-python mediapipe==0.10.14 numpy" }],
      why: "opencv-python gives us cv2 — capturing webcam frames, drawing shapes, showing windows. mediapipe gives us the pretrained hand-landmark and face-mesh/detection models we'll use in the next sessions. We're installing with an exact version pin (==0.10.14) rather than \"whatever's newest\" — both activities' requirements.txt files pin to this same version, so everyone in class ends up running identical mediapipe behavior instead of drifting depending on install date.",
      glossary: [
        { term: "pip install", explanation: "downloads and installs a Python package (a piece of reusable code someone else wrote) so your own code can use it." },
        { term: "==0.10.14 (a version pin)", explanation: "tells pip to install that exact version, not just \"whatever's newest.\"" },
      ],
      commonProblems: [
        "ERROR: No matching distribution found for mediapipe==0.10.14 — usually means your Python version is too new (or too old, or the wrong CPU architecture) for that mediapipe release. Check python --version against mediapipe's supported-version list, or fall back to an unpinned pip install mediapipe and note the version that actually installs.",
        "Install seems to hang — mediapipe's wheel is tens of MB; slow classroom wifi makes this look frozen. Let it run.",
        "pip install succeeds but import cv2 still fails in VS Code — interpreter mismatch again (see Step 4); reselect the venv interpreter and restart VS Code's terminal.",
      ],
    },
    {
      id: "setup-6",
      index: 5,
      title: "Set up your camera source: laptop webcam or phone over USB",
      say: "Everyone's camera situation today is one of two paths. If you're on your own laptop with a built-in camera, you're already done — skip to Step 7. If you're on a lab PC, there's no webcam, and this room has no WiFi, so your phone becomes the camera, connected by USB cable only.",
      file: null,
      commands: [],
      why: "adb reverse is official Android developer tooling — it's the reverse direction of port forwarding (device → host instead of host → device), so a server the phone is already running on itself becomes reachable on the PC. This avoids installing a third-party virtual-camera driver on every lab PC — school antivirus/locked-down images are far more likely to block or quarantine those than a plain, Google-signed adb.exe. Both real activities read whichever source you set through one shared CAM_SOURCE value, so nothing else in the code changes between Path A and Path B.",
      glossary: [
        { term: "adb (Android Debug Bridge)", explanation: "Google's official tool that lets a computer talk to an Android phone over a USB cable." },
        { term: "adb reverse", explanation: "a specific adb command that makes something running on the phone reachable from the computer, through that same USB cable." },
        { term: "USB debugging", explanation: "an Android setting that allows tools like adb to actually communicate with the phone; it's off by default for security, which is why it needs turning on." },
        { term: "localhost", explanation: "a special address meaning \"this same computer.\" It's used here because the phone's video stream gets tunneled through USB to look like it's coming from the PC itself." },
      ],
      commonProblems: [
        "Phone not detected by adb at all — install the OEM USB driver for your phone brand (Samsung, Pixel, etc.); needed once per phone model.",
        "adb reverse \"command not found\" — Android Platform Tools isn't installed/on PATH on this PC; the instructor installs this once per lab machine ahead of time, not per student.",
        "Stream drops mid-class — the phone's screen locked or IP Webcam got backgrounded; re-open the app and tap Start server again, and double-check \"Keep screen on.\"",
        "Different PC than last time — the \"Allow USB debugging?\" prompt reappears, since authorization is per phone-PC pairing, not global to the phone. Tap Allow again.",
        "Documented fallback if IP Webcam / adb reverse won't cooperate on a given phone: try DroidCam (USB mode, free, official Windows client, bundles its own adb) — install the Windows client, connect via USB in the client, then use its assigned device index the same way as Path A.",
      ],
      fork: {
        pathA: {
          letter: "A",
          label: "Path A · Laptop webcam",
          body: "Nothing to install. Your camera is device index 0 (occasionally 1 if the laptop has multiple cameras — Step 7 covers what to do if you get a black frame).",
          commands: [],
        },
        pathB: {
          letter: "B",
          label: "Path B · Phone over USB",
          body: "One-time, first day only:\n1. On your phone: Settings → About phone → tap \"Build number\" 7 times to unlock Developer Options.\n2. Settings → Developer Options → enable USB debugging.\n3. Install the IP Webcam app (by Pavel Khlebovich) from the Play Store.\n\nEvery session:\n1. Plug your phone into the lab PC with a USB cable. On the phone, tap Allow on the \"Allow USB debugging?\" prompt — check \"Always allow from this computer\" the first time so it doesn't ask again on this PC.\n2. Open IP Webcam → scroll down → tap Start server. In the app's video preferences, make sure \"Keep screen on\" is enabled so the stream doesn't drop if the phone would otherwise auto-lock.\n3. On the PC, open a terminal and tunnel the phone's local stream through USB — no WiFi or LAN involved at all.\n4. Point today's script (and both real activities from here on) at that tunnel.",
          commands: [
            { label: "Every session — tunnel the phone's stream over USB", language: "bash", code: "adb reverse tcp:8080 tcp:8080" },
            { label: "Every session — set your camera source", language: "python", code: 'CAM_SOURCE = "http://localhost:8080/video"' },
          ],
        },
      },
    },
    {
      id: "setup-7",
      index: 6,
      title: "\"Hello, Camera\": prove your camera source works before writing anything real",
      say: "Before we touch either real project, we isolate one question: does Python see your camera — whichever path you're on — at all? If this fails weeks from now inside a much bigger file, it's hard to tell a camera problem from a code problem. We rule it out now, with the smallest possible script.",
      file: {
        filename: "hello_webcam.py",
        code: helloWebcamCode,
        newLineIndices: allLines(helloWebcamCode),
        newFileNote: "Create a new file called hello_webcam.py.",
      },
      commands: [],
      runCommand: "python hello_webcam.py",
      why: "the isinstance(CAM_SOURCE, int) check is the whole trick — a plain number means \"open a local device by index\" (cv2.CAP_DSHOW is the Windows-specific backend for that), while a string means \"open this as a network/URL stream,\" and OpenCV picks its FFmpeg backend automatically. This exact branch is what both hand_ar.py and face_tracker.py use from here on, so this tiny script previews the pattern you'll recognize in every session that follows. cap.read() grabs one frame as a NumPy array; cv2.imshow/cv2.waitKey(0)/cap.release()/cv2.destroyAllWindows() are the same open → show → release pattern both real activities reuse throughout.",
      glossary: [
        { term: "isinstance(x, int)", explanation: "checks whether a value is a certain type (here: a whole number), so the code can decide which of two paths to take." },
        { term: "cv2.VideoCapture(...)", explanation: "opens a connection to a camera or video stream." },
        { term: "cap.isOpened()", explanation: "checks whether that connection actually worked; gives back True or False." },
        { term: "cap.read()", explanation: "grabs one picture from the camera right now." },
        { term: "cv2.imshow(...)", explanation: "opens a window on your screen and shows a picture in it." },
        { term: "cv2.waitKey(0)", explanation: "pauses the program until you press a key, while keeping the window responsive while it waits." },
        { term: "cap.release()", explanation: "lets go of the camera, so other programs (or the next run of your own script) can use it." },
        { term: "cv2.destroyAllWindows()", explanation: "closes every window your script opened." },
        { term: "raise RuntimeError(...)", explanation: "stops the program immediately and shows an error message explaining what went wrong." },
      ],
      commonProblems: [
        "(Path A) Window shows a black frame, or the wrong camera — laptops with an IR camera (for Windows Hello face login) often register that as index 0. Try CAM_SOURCE = 1 instead.",
        "(Path A) macOS: a permission dialog (\"Terminal would like to access the camera\") can appear behind other windows, making the script look frozen — check for it if nothing happens.",
        "(Path B) Could not open camera with a URL — confirm adb reverse tcp:8080 tcp:8080 is still active (it resets if the phone was unplugged/replugged) and that IP Webcam's server is running on the phone.",
        "Either path: Could not open camera — another app (Zoom, Teams, browser tab) already has the camera open; close it and retry.",
        "Window opens but appears unresponsive/frozen — this is expected with cv2.waitKey(0); it's waiting for a keypress on the image window (click the window first, then press any key).",
      ],
    },
  ],
};
