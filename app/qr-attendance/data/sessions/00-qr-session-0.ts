import type { Session } from "../types";
import { allLines } from "../lib";

// Session 0's throwaway camera check. The CAM_SOURCE block and the
// camera-opening block are written exactly as they appear in
// `source-code/qr-attendance/qr_scanner.py`, so students meet them once
// here and recognise them in Session 2. The `CAM_SOURCE = 0` line is
// personalised per student by lib/camSource.ts.
const cameraCheckCode = `import cv2

CAM_SOURCE = 0
# Laptop with a built-in webcam: leave as the device index above (0).
# Lab PC with no webcam: set to your phone's IP Webcam stream tunneled over
# USB via \`adb forward tcp:8080 tcp:8080\`, e.g.:
#   CAM_SOURCE = "http://localhost:8080/video"

if isinstance(CAM_SOURCE, int):
    cap = cv2.VideoCapture(CAM_SOURCE, cv2.CAP_DSHOW)
    if not cap.isOpened():
        cap = cv2.VideoCapture(CAM_SOURCE)
else:
    cap = cv2.VideoCapture(CAM_SOURCE)  # URL source: let OpenCV pick the FFmpeg backend
if not cap.isOpened():
    raise RuntimeError("Could not open webcam. Check CAM_SOURCE / camera permissions.")

while True:
    ok, frame = cap.read()
    if not ok:
        break

    frame = cv2.flip(frame, 1)
    cv2.imshow("QR camera check", frame)
    if cv2.waitKey(1) & 0xFF == ord("q"):
        break

cap.release()
cv2.destroyAllWindows()`;

// Hand Tracking's Setup steps and troubleshooting pages — linked, not
// re-taught. Hand Tracking unlocks its steps in order, so a student who
// never opened it on this browser may land on an earlier step first.
const HAND_LOCK_NOTE = "(That guide unlocks in order — if it opens on an earlier step, click Next until you reach it.)";
const PYTHON_TROUBLESHOOTING = {
  label: "Troubleshooting: Python, pip & venv problems",
  href: "/hand-tracking/troubleshooting/python-pip-venv",
};
const ADB_TROUBLESHOOTING = {
  label: "Troubleshooting: ADB & Android connection problems",
  href: "/hand-tracking/troubleshooting/adb-android",
};

export const qrSession0: Session = {
  id: "qr-s0",
  sessionNumber: 0,
  track: "QR Attendance — lead-in",
  title: "Project setup",
  syllabusMapping:
    "Module 1 (abbreviated) — a fresh virtual environment and installing this project's libraries; Module 3 — VideoCapture and \"any camera is just a source\" (laptop webcam vs. phone stream)",
  buildsToward: "source-code/qr-attendance/ (qr_generator.py and qr_scanner.py)",
  sessionGoal:
    "By the end of today, everyone has a fresh qr-attendance project folder with its own virtual environment, OpenCV, qrcode, Pillow and NumPy installed, a camera source chosen, and a live camera window proven from Python — the base the QR generator and scanner are built on.",
  instructorNotes: [
    "This session assumes Python is already installed — everyone did Hand Tracking's Setup. Anyone who still needs Python, or a first-time phone-over-USB setup on a lab PC, follows the linked Hand Tracking Setup steps; they aren't re-taught here.",
    "Fresh folder and fresh venv on purpose: the QR project's packages (qrcode, Pillow) are separate from the MediaPipe projects, and the scanner imports the generator by file name, so both scripts must sit together in this one folder.",
    "Step 5's camera choice is remembered by this guide and fills in the CAM_SOURCE line in every QR code panel. If a student already picked a camera path in Hand Tracking's Setup on the same browser, it's pre-selected — they can switch it.",
  ],
  wrapUp:
    "Everyone now has: a qr-attendance folder with its own activated venv; OpenCV, qrcode, Pillow and NumPy installed and import-checked; a camera source chosen; and a live camera window proven from Python. Next session we write qr_generator.py and make a QR attendance pass for every student on the roster.",
  steps: [
    {
      id: "qr-s0-1",
      index: 0,
      title: "Create the qr-attendance project folder",
      say: "New project, new folder. Both scripts we write — qr_generator.py and qr_scanner.py — will live side by side in here, and that matters later: the scanner reads the class list straight out of the generator file, which only works when they share a folder.\n\nFirst, a quick check that Python still answers. If python --version doesn't print a version number, stop and follow the Hand Tracking Setup link below before going on. (Windows: try py --version. macOS/Linux: use python3 in place of python everywhere today.)",
      file: null,
      commands: [
        { label: "Check Python, then make the folder and step into it", language: "bash", code: "python --version\nmkdir qr-attendance\ncd qr-attendance" },
      ],
      why: "Giving each project its own folder keeps its files, its venv, and everything it generates later — the qr_codes/ folder of cards and the attendance.csv log — from mixing with the Hand and Face projects. Open this folder in VS Code now (File → Open Folder… → qr-attendance) so VS Code's terminal starts inside it every time.",
      glossary: [
        { term: "python --version", explanation: "asks Python which version of itself is installed. If it prints a number, Python is ready." },
        { term: "mkdir", explanation: "short for \"make directory\" — creates a new folder." },
        { term: "cd", explanation: "short for \"change directory\" — moves the terminal into a folder, so the next commands run there." },
        { term: "Project folder", explanation: "one folder that holds everything for one project: its code, its virtual environment, and the files it creates." },
      ],
      commonProblems: [
        { error: "'python' is not recognized as an internal or external command (Windows)", solution: "Try py --version instead. If that also fails, Python isn't installed or isn't on PATH — follow the Hand Tracking Setup link below, then come back." },
        { error: "Windows opens the Microsoft Store when you type python", solution: "That's a store shortcut pretending to be Python. Use py instead, or reinstall Python from python.org with \"Add python.exe to PATH\" ticked (Hand Tracking Setup covers it)." },
        { error: "macOS/Linux: python: command not found, but python3 works", solution: "Normal on those systems. Use python3 wherever this guide says python." },
        { error: "mkdir: A subdirectory or file qr-attendance already exists", solution: "You've made it before — that's fine. Just run cd qr-attendance and carry on." },
        { error: "You made the folder inside another project's venv folder (or inside cv-iot-class\\venv)", solution: "Never put project files inside a venv folder. Go back up with cd .. until you're somewhere ordinary (like Documents or C:\\dev), then make qr-attendance there." },
        { error: "Strange \"access denied\" or \"file in use\" errors later, and the folder is inside OneDrive", solution: "OneDrive syncing can lock files while Python is writing them. Make the folder somewhere OneDrive doesn't sync, such as C:\\dev\\qr-attendance." },
      ],
      links: [
        { label: "Hand Tracking Setup — install Python if you don't have it", href: "/hand-tracking/setup-1b", note: HAND_LOCK_NOTE },
        PYTHON_TROUBLESHOOTING,
      ],
    },
    {
      id: "qr-s0-2",
      index: 1,
      title: "Create a fresh virtual environment",
      say: "Same idea as in Setup: a private copy of Python just for this project. We make a brand-new one here instead of reusing cv-iot-class's venv, so this project's packages stay separate from the MediaPipe projects.\n\nIf your prompt already shows (venv) from another project, type deactivate first, so the new venv is built from your normal Python.",
      file: null,
      commands: [{ language: "bash", code: "python -m venv venv" }],
      why: "python -m venv venv makes a folder called venv/ inside qr-attendance, holding its own private python and pip. Anything installed into it stays in this project only. The venv/ folder is Python's own — never save your scripts inside it; they go next to it, in qr-attendance itself.",
      glossary: [
        { term: "Virtual environment (venv)", explanation: "a private, separate copy of Python for one project, so its packages don't mix with any other project's." },
        { term: "python -m venv venv", explanation: "the command that makes that private copy. The first venv is the tool's name; the second is the folder name it creates." },
        { term: "deactivate", explanation: "turns off whichever virtual environment is currently active in this terminal." },
      ],
      commonProblems: [
        { error: "No module named venv / python venv venv does nothing useful", solution: "The -m is missing. venv is a module run through Python: python -m venv venv." },
        { error: "(venv) was already showing before you ran the command", solution: "Another project's venv was still active, so the new one was built from it. It usually still works, but to be safe: deactivate, delete the new venv folder, and run python -m venv venv again." },
        { error: "Linux: \"The virtual environment was not created successfully because ensurepip is not available\"", solution: "Install the venv module once: sudo apt install python3-venv, then run the command again." },
        { error: "The command seems to hang for a while", solution: "Creating a venv copies Python's files and can take 10–30 seconds on a slow lab disk. Wait for the prompt to come back." },
      ],
      links: [PYTHON_TROUBLESHOOTING],
    },
    {
      id: "qr-s0-3",
      index: 2,
      title: "Activate the venv and confirm it's active",
      say: "Making the venv doesn't switch it on. We activate it in this terminal so python and pip point inside qr-attendance/venv — then check it, because installing into the wrong Python is the most common setup mistake there is.",
      file: null,
      commands: [
        {
          label: "1. Activate — pick the line for your terminal",
          language: "bash",
          code: "# Windows PowerShell (VS Code's default on Windows)\n.\\venv\\Scripts\\Activate.ps1\n\n# Windows cmd.exe\nvenv\\Scripts\\activate.bat\n\n# macOS / Linux / Git Bash on Windows\nsource venv/bin/activate",
        },
        {
          label: "2. Confirm — the first path printed must be inside qr-attendance\\venv",
          language: "bash",
          code: "# Windows\nwhere python\n\n# macOS / Linux\nwhich python",
        },
      ],
      why: "Activation changes this one terminal window only, so pip install in the next step lands inside qr-attendance/venv. You'll see (venv) at the start of the prompt when it worked. The where/which check proves it: the path should end in qr-attendance\\venv\\Scripts\\python.exe (Windows) or qr-attendance/venv/bin/python (macOS/Linux) — not a system Python, and not cv-iot-class's venv.\n\nEvery new terminal you open later needs activating again.",
      glossary: [
        { term: "Activate", explanation: "switches this terminal to use the venv's private Python and pip instead of the computer's main ones." },
        { term: "(venv) in the prompt", explanation: "the sign that a virtual environment is active in this terminal." },
        { term: "where (Windows) / which (macOS/Linux)", explanation: "shows exactly which file the terminal would run for a command name. If several are listed, the first one wins." },
        { term: "source", explanation: "runs a script's commands inside the current terminal; activation needs this so it can change this terminal's own settings." },
      ],
      commonProblems: [
        { error: "PowerShell: \"Activate.ps1 cannot be loaded because running scripts is disabled on this system\"", solution: "PowerShell is blocking scripts. Run this once: Set-ExecutionPolicy -Scope CurrentUser RemoteSigned, answer Y, then activate again." },
        { error: "where python shows cv-iot-class\\venv (or another project's venv) first", solution: "The old venv is still active. Run deactivate, make sure you're inside qr-attendance, then activate again." },
        { error: "where python shows a system path like C:\\Python312\\python.exe or the WindowsApps folder first", solution: "Activation didn't take. Check you're inside qr-attendance (the venv folder must be right here), then run the activate line for your terminal again." },
        { error: "The system cannot find the path specified / No such file or directory", solution: "You're not in the qr-attendance folder, or the venv wasn't created. Run cd qr-attendance, check a venv folder exists, then try again." },
        { error: "VS Code's ▶ Run button uses a different Python than your terminal", solution: "Press Ctrl+Shift+P → \"Python: Select Interpreter\" and pick the one inside qr-attendance\\venv. Do this once per project folder." },
        { error: "Later in the term: packages \"disappeared\" in a new terminal", solution: "That terminal was never activated. Look for (venv) in the prompt; if it's missing, activate first." },
      ],
      links: [PYTHON_TROUBLESHOOTING],
    },
    {
      id: "qr-s0-4",
      index: 3,
      title: "Install the QR project's libraries",
      say: "Three installs, each with a job. opencv-python gives us cv2: the camera, the window, the drawing — and its own built-in QR code reader. qrcode makes the QR images, and the [pil] part also installs Pillow, which we use to draw each student's ID card. NumPy is what the scanner uses for the QR code's corner points.\n\nKeep the quotes around \"qrcode[pil]\" — some terminals treat square brackets as a special pattern. Then run the one-line import check to prove all four load.",
      file: null,
      commands: [
        { label: "1. Install (venv must be active)", language: "bash", code: "pip install opencv-python \"qrcode[pil]\" numpy" },
        { label: "2. Check all four import — should print the OpenCV version", language: "bash", code: "python -c \"import cv2, qrcode, PIL, numpy; print('Ready! OpenCV', cv2.__version__)\"" },
      ],
      why: "The import check runs a tiny program straight from the terminal. If it prints Ready!, every library our two scripts need is installed in this venv. If one is missing, Python names it in a ModuleNotFoundError — far easier to fix now than halfway through the generator.\n\nThe course syllabus mentions pyzbar for reading QR codes. We use OpenCV's built-in QR reader instead: one less install, and nothing extra to set up on Windows.",
      glossary: [
        { term: "pip install", explanation: "downloads a package (code someone else wrote) and installs it into the active Python, so your code can use it." },
        { term: "opencv-python (cv2)", explanation: "the OpenCV package. You install it as opencv-python but import it in code as cv2." },
        { term: "qrcode", explanation: "a package that turns text into a QR code image." },
        { term: "\"qrcode[pil]\"", explanation: "the square brackets ask pip for an \"extra\": qrcode plus the Pillow package it needs to save images. The quotes stop the terminal treating [ ] as special." },
        { term: "Pillow (PIL)", explanation: "an image package for drawing shapes and text onto pictures. Installed as Pillow, imported as PIL." },
        { term: "NumPy", explanation: "a package for working with lists of numbers quickly; OpenCV pictures and QR corner points are NumPy arrays." },
        { term: "python -c \"...\"", explanation: "runs the Python code inside the quotes straight away, without making a file." },
        { term: "ModuleNotFoundError", explanation: "the error Python gives when your code imports a package that isn't installed in the Python being used." },
      ],
      commonProblems: [
        { error: "ModuleNotFoundError: No module named 'qrcode'", solution: "qrcode isn't in the Python you're running — almost always because the venv wasn't active when you installed, or you're running a different Python now. Check (venv) is showing and where python points into qr-attendance\\venv (Step 3), then run the pip install line again." },
        { error: "ModuleNotFoundError: No module named 'PIL'", solution: "qrcode was installed without its [pil] extra. Run pip install \"qrcode[pil]\" (with the quotes), or pip install pillow." },
        { error: "zsh: no matches found: qrcode[pil] (macOS)", solution: "The quotes were left off, so the terminal tried to treat [pil] as a file pattern. Type it exactly as shown: pip install opencv-python \"qrcode[pil]\" numpy." },
        { error: "ERROR: No matching distribution found for PIL", solution: "PIL is the name you import, not the name you install. The install name is Pillow — and \"qrcode[pil]\" already installs it for you." },
        { error: "'pip' is not recognized as an internal or external command", solution: "Use python -m pip install opencv-python \"qrcode[pil]\" numpy instead — it runs the venv's pip through its python." },
        { error: "WARNING: Retrying ... Read timed out, or the install looks frozen", solution: "opencv-python is a big download (tens of MB) and the lab network can be slow. Let it run; if it fails, run the same line again — pip skips what's already done." },
        { error: "The import check works in the terminal, but VS Code underlines import qrcode / import cv2", solution: "VS Code has a different interpreter selected. Ctrl+Shift+P → \"Python: Select Interpreter\" → pick the one inside qr-attendance\\venv." },
      ],
      links: [PYTHON_TROUBLESHOOTING],
    },
    {
      id: "qr-s0-5",
      index: 4,
      title: "Choose your camera source: laptop webcam or phone over USB",
      say: "Same two paths as in Setup. Pick the one that matches the computer you're on today. This guide remembers your pick and fills in the right CAM_SOURCE line in every QR code panel from here on — the camera check in the next step, and the scanner in Sessions 2 to 4.\n\nIf you already picked a path in Hand Tracking on this browser, it's pre-selected. On a different computer than usual today? Switch it.",
      file: null,
      commands: [],
      why: "OpenCV can open a camera two ways: by number (0 is the laptop's own webcam) or by web address (the phone's IP Webcam stream). The scanner reads one setting, CAM_SOURCE, and works either way — so the only thing that changes between the two paths is that one line.\n\nOn a lab PC, adb forward makes the phone's stream show up on the PC as http://localhost:8080/video, carried over the USB cable — no WiFi needed. It has to be forward, not reverse: IP Webcam already uses port 8080 on the phone, so reverse fails with \"address already in use\".",
      glossary: [
        { term: "Camera source", explanation: "where the picture comes from: the laptop's own webcam, or your phone's camera streamed to the PC." },
        { term: "CAM_SOURCE", explanation: "the one line in our scripts that says which camera to open — a number for a webcam, or a web address for the phone stream." },
        { term: "IP Webcam", explanation: "an Android app that turns your phone into a camera the computer can read over a web address." },
        { term: "adb devices", explanation: "lists the Android phones the computer can talk to over USB, and whether each one has allowed it." },
        { term: "adb forward tcp:8080 tcp:8080", explanation: "connects the PC's port 8080 to the phone's port 8080 through the USB cable, so the phone's stream appears on the PC." },
        { term: "localhost", explanation: "a web address that means \"this same computer\" — here, the phone's stream arriving through the USB tunnel." },
      ],
      commonProblems: [
        { error: "The wrong path is pre-selected (you used a laptop last time, a lab PC today)", solution: "Click \"Not on this path? Switch\" in the panel. Your new pick is saved for the QR guide only — Hand Tracking keeps its own." },
        { error: "(Phone over USB) 'adb' is not recognized as an internal or external command", solution: "Android Platform Tools isn't installed or isn't on PATH on this PC. Tell your instructor — it's normally set up once per lab machine. The ADB troubleshooting page below has the steps." },
        { error: "(Phone over USB) adb devices lists nothing", solution: "Try another cable first — many charging cables carry power only, no data. Then re-check the order: cable plugged in first, USB debugging switched on, unplug and replug once." },
        { error: "(Phone over USB) adb devices shows your phone as unauthorized", solution: "Look at the phone: there's an \"Allow USB debugging?\" prompt waiting. Tick \"Always allow from this computer\" and tap Allow. It appears again on each new PC." },
        { error: "(Phone over USB) adb: more than one device/emulator", solution: "Another phone (or an emulator) is also connected. Unplug the others, or ask your instructor which device to use." },
        { error: "(Phone over USB) error: cannot bind listener: 'tcp:8080': Address already in use", solution: "You ran adb reverse instead of adb forward. Use adb forward tcp:8080 tcp:8080." },
        { error: "(Phone over USB) http://localhost:8080/video won't load in the browser", solution: "Open IP Webcam on the phone and tap Start server, and run adb forward tcp:8080 tcp:8080 again — the tunnel resets whenever the phone is unplugged." },
      ],
      fork: {
        prompt: "Which camera source are you using today?",
        pathA: {
          letter: "A",
          label: "Path A · Laptop webcam",
          body: "Nothing to set up. Your camera is device number 0, so CAM_SOURCE stays 0. If the next step shows a black window or the wrong camera, try 1 instead.",
          commands: [],
        },
        pathB: {
          letter: "B",
          label: "Path B · Phone over USB",
          body: "First time with this phone? Do the one-time phone setup in Hand Tracking's Setup first (Developer Options, USB debugging, the IP Webcam app) — link under \"Need more help?\".\n\nEvery session:\n1. Plug your phone into the lab PC with a data cable.\n2. If the phone asks \"Allow USB debugging?\", tick \"Always allow from this computer\" and tap Allow.\n3. Check the PC sees the phone, then tunnel its stream over USB — forward, not reverse.\n4. Open IP Webcam → scroll down → tap Start server. Keep the phone screen on.\n5. Open http://localhost:8080/video in a browser on the PC. If you see your camera, you're ready.",
          commands: [
            { label: "Every session — the phone should show as \"device\", not \"unauthorized\"", language: "bash", code: "adb devices" },
            { label: "Every session — tunnel the phone's stream over USB", language: "bash", code: "adb forward tcp:8080 tcp:8080" },
          ],
        },
      },
      links: [
        { label: "Hand Tracking Setup — one-time phone setup (Path B)", href: "/hand-tracking/setup-6", note: HAND_LOCK_NOTE },
        ADB_TROUBLESHOOTING,
      ],
    },
    {
      id: "qr-s0-6",
      index: 5,
      title: "Camera check: prove the camera opens from this venv",
      say: "New folder, new venv, new installs — so we prove the camera again before building anything on it. This is the same check as Hello, Camera in Setup, with one difference: the CAM_SOURCE lines and the camera-opening lines are written exactly as they'll appear at the top of qr_scanner.py, so they'll look familiar in Session 2.\n\nYour CAM_SOURCE line below already matches the camera you picked in Step 5.",
      file: {
        filename: "camera_check.py",
        code: cameraCheckCode,
        newLineIndices: allLines(cameraCheckCode),
        newFileNote:
          "Create a new file called camera_check.py inside your qr-attendance folder — right next to the venv folder, not inside it. In VS Code: File → New File → type the name camera_check.py → save it in qr-attendance.",
      },
      commands: [],
      runCommand: "python camera_check.py",
      runResult:
        "A mirrored, live camera window titled \"QR camera check\" opens. Wave — it should follow you smoothly. Click the window, then press q to close it. You can keep camera_check.py; we won't need it again.",
      why: "isinstance(CAM_SOURCE, int) picks how to open the camera. A number means a webcam: first try cv2.CAP_DSHOW (Windows' fastest way to open a webcam), and if that fails — on macOS or Linux, for example — try again with OpenCV's default. A web address means the phone stream, which OpenCV opens on its own.\n\nThe while True loop grabs and shows one frame after another, which is what makes it live video. cv2.flip(frame, 1) mirrors it so moving left looks like moving left. cv2.waitKey(1) waits 1 millisecond for a key and lets the window redraw. After the loop, cap.release() frees the camera so the next program can open it.\n\nThe lines starting with # are comments — notes for people, ignored by Python. They're how the real scanner reminds you of the phone address.",
      glossary: [
        { term: "import cv2", explanation: "loads OpenCV so this file can use it." },
        { term: "# comment", explanation: "anything after a # on a line is a note for people; Python skips it." },
        { term: "isinstance(x, int)", explanation: "checks whether a value is a whole number, so the code can choose between two ways of opening the camera." },
        { term: "cv2.VideoCapture(...)", explanation: "opens a camera or video stream." },
        { term: "cv2.CAP_DSHOW", explanation: "tells OpenCV to use DirectShow, Windows' own fast way of opening a webcam." },
        { term: "cap.isOpened()", explanation: "True if the camera actually opened, False if not." },
        { term: "raise RuntimeError(...)", explanation: "stops the program with a clear error message." },
        { term: "while True:", explanation: "a loop that repeats until something inside it says break." },
        { term: "cap.read()", explanation: "grabs one picture from the camera. It gives back ok (did it work?) and frame (the picture)." },
        { term: "break", explanation: "leaves the loop straight away." },
        { term: "cv2.flip(frame, 1)", explanation: "mirrors the picture left-to-right." },
        { term: "cv2.imshow(title, frame)", explanation: "shows a picture in a window with that title." },
        { term: "cv2.waitKey(1) & 0xFF == ord(\"q\")", explanation: "waits 1 millisecond for a key press and checks whether it was q." },
        { term: "cap.release()", explanation: "lets go of the camera so other programs can use it." },
        { term: "cv2.destroyAllWindows()", explanation: "closes every window the program opened." },
      ],
      commonProblems: [
        { error: "ModuleNotFoundError: No module named 'cv2'", solution: "The venv isn't active in this terminal, or VS Code's ▶ button is using another Python. Activate (Step 3) and run python camera_check.py from the terminal; fix VS Code with \"Python: Select Interpreter\"." },
        { error: "python: can't open file '...camera_check.py': [Errno 2] No such file or directory", solution: "The terminal isn't in the folder where you saved the file — or you saved it inside venv/. Move camera_check.py into qr-attendance and run cd qr-attendance." },
        { error: "AttributeError: module 'cv2' has no attribute 'cap_dshow' (or 'waitkey', 'destroyAllwindows')", solution: "OpenCV names are case-sensitive: cv2.CAP_DSHOW, cv2.waitKey, cv2.destroyAllWindows. Compare your casing letter by letter." },
        { error: "RuntimeError: Could not open webcam. Check CAM_SOURCE / camera permissions.", solution: "Another program has the camera — Zoom, Teams, a browser tab, or a Hand/Face script still running in another terminal. Close it and run again. On the phone path, re-run adb forward tcp:8080 tcp:8080 and check IP Webcam's server is on." },
        { error: "(Laptop webcam) The window is black, or shows the wrong camera", solution: "Some laptops list an infrared face-login camera as 0. Change CAM_SOURCE = 0 to CAM_SOURCE = 1 and run again." },
        { error: "(Laptop webcam, macOS) Nothing happens after running", solution: "A \"Terminal would like to access the camera\" permission box may be hiding behind other windows. Allow it, then run again." },
        { error: "(Phone over USB) The window opens but freezes after a few seconds", solution: "The phone screen locked or IP Webcam went into the background. Reopen IP Webcam, tap Start server, and keep the screen on." },
        { error: "Pressing q does nothing", solution: "Click on the camera window first. Key presses go to whichever window is selected — usually the terminal by mistake." },
        { error: "The window opens and closes instantly with no error", solution: "Check the loop: it must be if not ok: break. Writing if ok: break leaves the loop on the very first good frame." },
      ],
    },
  ],
};
