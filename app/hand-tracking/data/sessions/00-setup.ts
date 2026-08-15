import type { Session } from "../types";
import { allLines } from "../lib";

const helloWebcamCode = `import cv2

#Choose only one 
CAM_SOURCE = 0 # laptop webcam (Path A). 
CAM_SOURCE = "http://localhost:8080/video" # Lab PC + phone (Path B): 

if isinstance(CAM_SOURCE, int):
    cap = cv2.VideoCapture(CAM_SOURCE, cv2.CAP_DSHOW)
else:
    cap = cv2.VideoCapture(CAM_SOURCE)

if not cap.isOpened():
    raise RuntimeError("Could not open camera. Check CAM_SOURCE / camera permissions.")

while True:
    ok, frame = cap.read()
    if not ok:
        break

    frame = cv2.flip(frame, 1)
    cv2.imshow("Hello, Camera", frame)
    if cv2.waitKey(1) & 0xFF == ord("q"):
        break

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
    "Both `requirements.txt` files (hand-tracking and facial-recognition) install mediapipe unpinned, matching Step 6's `pip install` command below — resolves the most common install failure (no matching distribution for an exact-pinned version on a newer/older Python) at the cost of exact version reproducibility across students' machines.",
    "Two-path classroom note: Lab PCs have no built-in webcam and the room has no WiFi (Ethernet only). Students on lab PCs use their Android phone over USB as the camera instead; students with their own laptop keep using its built-in webcam. Step 7 below covers both. Both `hand_ar.py` and `face_tracker.py` read a single `CAM_SOURCE` config value (an int device index, or a URL string) instead of a hardcoded camera index, so the same script works either way.",
    "Step 2 (below) is a genuine conditional branch, not just a hardware fork like the camera step: most students already have Python, so Path A is a no-op \"you're set, continue.\" Path B is only for the rare student who needs to install it from scratch, and merges straight back into Step 3 once done — don't spend class time walking everyone through Path B if only one or two students need it.",
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
      why: "mediapipe's published wheels typically trail the newest Python release by a few months. If `python --version` reports something very new (e.g. a version released in the last month or two), `pip install mediapipe` in Step 6 may fail with no matching distribution — better to catch that now than mid-install.",
      glossary: [
        { term: "python --version", explanation: "a command that asks Python to tell you which version of itself is installed." },
        { term: "PATH", explanation: "a list your computer checks to find a program when you type its name in the terminal. If a program \"isn't on PATH,\" the terminal doesn't know where to find it." },
        { term: "py", explanation: "an alternative launcher command Windows installs alongside Python; useful when plain python doesn't work." },
      ],
      commonProblems: [
        { error: "'python' is not recognized... (Windows)", solution: "Python isn't on PATH. Reinstall from python.org with \"Add python.exe to PATH\" checked, or use the py launcher instead." },
        { error: "Windows opens the Microsoft Store instead of running Python", solution: "That's the store-app stub shadowing the real python command; same fix as above, or use py." },
        { error: "macOS/Linux: python not found but python3 works", solution: "That's normal on those platforms; use python3 for every command in this session." },
        { error: "Multiple Pythons installed, unsure which one's active", solution: "where python (Windows) / which python (macOS/Linux) shows the exact path being used." },
      ],
    },
    {
      id: "setup-1b",
      index: 1,
      title: "Got Python installed already?",
      say: "Quick fork before we go further. If Step 1 printed a real version number, you're already set — just continue. If it didn't (or you don't have Python on this machine at all), install it now; once it's done, you land right back on the same track as everyone else.",
      file: null,
      commands: [],
      why: "Nothing downstream works without a working Python on PATH, so this is the one place in the whole guide where \"go install something first\" has to happen before continuing makes sense — everywhere else assumes Python already exists. Keeping it as an explicit fork (rather than a paragraph students skim past) means the rare student who genuinely needs to install it gets real, complete steps instead of being expected to already know how.",
      glossary: [
        { term: "Installer", explanation: "a program you download and run once to put another program (here, Python itself) onto your computer." },
      ],
      commonProblems: [],
      fork: {
        prompt: "Did python --version (or py --version) just print a real version number in Step 1?",
        pathA: {
          letter: "A",
          label: "A · Already have Python",
          body: "Nothing to do here — Step 1 already confirmed it. Continue to the next step.",
          commands: [],
        },
        pathB: {
          letter: "B",
          label: "B · Need to install it",
          body: "Pick the line for your OS, then re-run python --version (or py --version / python3 --version) to confirm it worked before continuing.",
          commands: [
            {
              label: "Windows",
              language: "bash",
              code: "# Download the installer from python.org/downloads, run it, and\n# CHECK \"Add python.exe to PATH\" on the very first screen before\n# clicking Install — this is the single most common install mistake.\npython --version",
            },
            {
              label: "macOS",
              language: "bash",
              code: "# Download the official installer from python.org/downloads and run it,\n# or with Homebrew already installed:\nbrew install python3\npython3 --version",
            },
            {
              label: "Linux (Debian/Ubuntu)",
              language: "bash",
              code: "sudo apt update\nsudo apt install python3 python3-venv python3-pip\npython3 --version",
            },
          ],
        },
      },
    },
    {
      id: "setup-2",
      index: 2,
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
        { error: "Forgetting -m (python venv venv instead of python -m venv venv)", solution: "venv is a module, not a standalone command." },
        { error: "On minimal Linux installs, venv module is missing", solution: "sudo apt install python3-venv fixes it." },
        { error: "Creating the project folder inside a OneDrive-synced directory on Windows", solution: "Can cause odd permission/lock errors — prefer a local, non-synced folder (e.g. C:\\dev\\cv-iot-class) if this happens." },
      ],
    },
    {
      id: "setup-3",
      index: 3,
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
      why: "Activation temporarily rewrites PATH for this terminal window only, so pip install in Step 6 lands inside venv/ instead of globally. You'll see (venv) appear at the start of the prompt when it worked.",
      glossary: [
        { term: "Activate", explanation: "switches your current terminal to use the virtual environment's private Python instead of the computer's main one." },
        { term: "source (macOS/Linux)", explanation: "runs a script's commands directly inside your current terminal, rather than starting it as a separate process. That's needed here, since activation only works if it changes this terminal's own settings." },
      ],
      commonProblems: [
        { error: "PowerShell error: \"cannot be loaded because running scripts is disabled on this system\"", solution: "PowerShell's execution policy is blocking the activation script. Fix (run once, in an admin PowerShell): Set-ExecutionPolicy -Scope CurrentUser RemoteSigned." },
        { error: "Opening a new terminal tab/window later in the semester and forgetting to reactivate", solution: "If (venv) isn't showing, packages will silently install globally again." },
        { error: "VS Code's integrated terminal or \"Run\" button uses a different Python interpreter than the one you activated manually", solution: "See Step 4." },
      ],
    },
    {
      id: "setup-4",
      index: 4,
      title: "Confirm the venv is actually active",
      say: "This is the single most common setup mistake, so we check it explicitly instead of assuming Step 3 worked.",
      file: null,
      commands: [{ language: "bash", code: "# Windows\nwhere python\n\n# macOS / Linux\nwhich python" }],
      why: "The path printed should be inside your cv-iot-class/venv/ folder, not a system path like C:\\Python312\\python.exe or /usr/bin/python3. If installs later seem to \"disappear,\" this is the first thing to re-check.",
      glossary: [
        { term: "where (Windows) / which (macOS/Linux)", explanation: "asks the terminal exactly which file it would run when you type a command's name." },
      ],
      commonProblems: [
        { error: "Path points outside venv/", solution: "Activation didn't take; repeat Step 3." },
        { error: "In VS Code specifically: the terminal can be activated correctly while the \"Run Python File\" button uses a different, VS Code–selected interpreter", solution: "Use the interpreter picker (bottom-right status bar, or Ctrl+Shift+P → \"Python: Select Interpreter\") and choose the one inside venv/." },
      ],
    },
    {
      id: "setup-5",
      index: 5,
      title: "Install both activities' dependencies",
      say: "Both activities need OpenCV (camera + image handling) and MediaPipe (the hand/face ML models); the hand-tracking activity also uses NumPy directly for the trail math.",
      file: null,
      commands: [{ language: "bash", code: "pip install opencv-python mediapipe numpy" }],
      why: "opencv-python gives us cv2 — capturing webcam frames, drawing shapes, showing windows. mediapipe gives us the pretrained hand-landmark and face-mesh/detection models we'll use in the next sessions. We're installing the latest release of each rather than pinning to an exact version — simpler for a first pip install, and it means pip automatically picks whichever mediapipe build actually matches your installed Python, instead of possibly failing to find a wheel for one exact pinned version. The trade-off is that students on different machines may end up on slightly different mediapipe versions; nothing in either activity depends on exact version behavior, so that's an acceptable trade for this course.",
      glossary: [
        { term: "pip install", explanation: "downloads and installs a Python package (a piece of reusable code someone else wrote) so your own code can use it." },
      ],
      commonProblems: [
        { error: "ERROR: No matching distribution found for mediapipe", solution: "Means your Python version is too new (or too old, or the wrong CPU architecture) for any published mediapipe build yet. Check python --version against mediapipe's supported-version list on PyPI — the fix is usually creating the venv with a supported Python version instead (see Step 1)." },
        { error: "Install seems to hang", solution: "mediapipe's wheel is tens of MB; slow classroom wifi makes this look frozen. Let it run." },
        { error: "pip install succeeds but import cv2 still fails in VS Code", solution: "Interpreter mismatch again (see Step 4); reselect the venv interpreter and restart VS Code's terminal." },
      ],
    },
    {
      id: "setup-6",
      index: 6,
      title: "Set up your camera source: laptop webcam or phone over USB",
      say: "Everyone's camera situation today is one of two paths. If you're on your own laptop with a built-in camera, you're already done — skip to Step 8. If you're on a lab PC, there's no webcam, and this room has no WiFi, so your phone becomes the camera, connected by USB cable only.",
      file: null,
      commands: [],
      why: "adb forward and adb reverse both tunnel a port over the same USB cable, just in opposite directions — forward opens its listening socket on the computer's port 8080 and routes it to the phone; reverse does the opposite, opening its listener on the phone's port 8080. IP Webcam's own server already occupies port 8080 on the phone the moment you tap Start server, so reverse fails there every time with \"address already in use\" — not a fluke, but two things trying to listen on the same phone port. forward sidesteps this because its listener lives on the PC side, which is free. This also avoids installing a third-party virtual-camera driver on every lab PC — school antivirus/locked-down images are far more likely to block or quarantine those than a plain, Google-signed adb.exe. Both real activities read whichever source you set through one shared CAM_SOURCE value, so nothing else in the code changes between Path A and Path B.",
      glossary: [
        { term: "adb (Android Debug Bridge)", explanation: "Google's official tool that lets a computer talk to an Android phone over a USB cable." },
        { term: "adb forward", explanation: "a specific adb command that opens a listening port on the computer and routes it to a server already running on the phone, through that same USB cable." },
        { term: "USB debugging", explanation: "an Android setting that allows tools like adb to actually communicate with the phone; it's off by default for security, which is why it needs turning on." },
        { term: "localhost", explanation: "a special address meaning \"this same computer.\" It's used here because the phone's video stream gets tunneled through USB to look like it's coming from the PC itself." },
      ],
      commonProblems: [
        { error: "(Phone over USB) Phone not detected by adb at all", solution: "Plug in first, then enable USB debugging in Developer Options, then unplug/replug once; enabling it before the cable is connected doesn't reliably stick on some phones." },
        { error: "(Phone over USB) Only ever see \"Transfer photos / File transfer / Charging\" on the phone, never a security prompt", solution: "That's a different, phone-local popup (the USB connection mode picker), unrelated to adb. Keep going — the debugging-authorization dialog is a separate fingerprint prompt that only appears once adb has actually made contact." },
        { error: "(Phone over USB) Nothing shows up in Windows' Device Manager at all, even though the phone charges", solution: "Try a different cable first (some charging cables carry power only, no data); if that's not it, re-check the plug-in-then-enable-debugging order above." },
        { error: "(Phone over USB) adb.exe: error: cannot bind listener: 'tcp:8080': Address already in use", solution: "IP Webcam's own server already owns port 8080 on the phone; the fix is using adb forward (as in this step), not adb reverse." },
        { error: "(Phone over USB) Stream drops mid-class", solution: "The phone's screen locked or IP Webcam got backgrounded; re-open the app and tap Start server again, and confirm both \"Keep screen on\" (in IP Webcam) and \"Stay awake while charging\" (in Developer Options) are enabled." },
        { error: "(Phone over USB) Different PC than last time", solution: "The \"Allow USB debugging?\" prompt reappears, since authorization is per phone-PC pairing, not global to the phone. Tap Allow again." },
        { error: "(Phone over USB) IP Webcam / adb won't cooperate on a given phone", solution: "Documented fallback: try DroidCam (USB mode, free, official Windows client, bundles its own adb) — install the Windows client, connect via USB in the client, then use its assigned device index the same way as Path A." },
      ],
      fork: {
        prompt: "Which camera source are you using today?",
        pathA: {
          letter: "A",
          label: "Path A · Laptop webcam",
          body: "Nothing to install. Your camera is device index 0 (occasionally 1 if the laptop has multiple cameras — Step 8 covers what to do if you get a black frame).",
          commands: [],
        },
        pathB: {
          letter: "B",
          label: "Path B · Phone over USB",
          body: "One-time, first day only:\n1. Confirm adb is installed on this PC — run adb version in a terminal. If it's not found, install Android Platform Tools (the instructor typically does this once per lab machine ahead of time).\n2. On your phone: Settings → About phone → tap \"Build number\" 7 times to unlock Developer Options.\n3. Install the IP Webcam app (by Pavel Khlebovich) from the Play Store.\n\nEvery session:\n1. Plug your phone into the lab PC with a known-good data cable — not one bundled with a charger or power bank; some carry power only, no data.\n2. Only now, with the cable already connected, turn on USB debugging in Developer Options — on some phones the toggle doesn't reliably stick if enabled before the cable is plugged in. Then unplug and replug the cable once, so the phone re-announces itself with debugging switched on.\n3. Watch the phone screen for a security-key fingerprint dialog with \"Always allow from this computer\" — check the box and tap Allow. This is a different popup than the Charging/File Transfer notification.\n4. Confirm the PC sees it, authorized, then tunnel the phone's stream to the PC — forward, not reverse.\n5. Open IP Webcam → scroll down → tap Start server. Enable \"Keep screen on\" in the app, and \"Stay awake while charging\" in Developer Options, so the stream doesn't drop if the screen would otherwise lock.\n6. Sanity check http://localhost:8080/video in a browser on the PC before touching any code.\n7. Point today's script (and both real activities from here on) at that tunnel.",
          commands: [
            { label: "Every session — confirm the phone is authorized", language: "bash", code: "adb devices" },
            { label: "Every session — tunnel the phone's stream over USB", language: "bash", code: "adb forward tcp:8080 tcp:8080" },
            { label: "Every session — set your camera source", language: "python", code: 'CAM_SOURCE = "http://localhost:8080/video"' },
          ],
        },
      },
    },
    {
      id: "setup-7",
      index: 7,
      title: "\"Hello, Camera\": prove your camera source works before writing anything real",
      say: "Before we touch either real project, we isolate one question: does Python see your camera — whichever path you're on — at all? If this fails weeks from now inside a much bigger file, it's hard to tell a camera problem from a code problem. We rule it out now, with the smallest possible script — and we build it up in front of you step by step, mistakes included, because the mistakes below are ones most of you will hit today and it's faster to recognize them than to debug them cold.",
      file: {
        filename: "hello_webcam.py",
        code: helloWebcamCode,
        newLineIndices: allLines(helloWebcamCode),
        newFileNote:
          "Create a new file called hello_webcam.py inside your cv-iot-class folder — the same folder you made in Step 2, right alongside (not inside) the venv/ folder. In VS Code: File → Open Folder… → pick cv-iot-class, then File → New File → type the filename.",
      },
      commands: [],
      runCommand: "python hello_webcam.py",
      runResult:
        "You should see a mirrored, continuously updating camera window — not one static picture. Click the window to focus it, then press q to quit cleanly.",
      why: "the isinstance(CAM_SOURCE, int) check is the whole trick — a plain number means \"open a local device by index\" (cv2.CAP_DSHOW is the Windows-specific backend for that), while a string means \"open this as a network/URL stream,\" and OpenCV picks its FFmpeg backend automatically. This exact branch is what both hand_ar.py and face_tracker.py use from here on, so this tiny script previews the pattern you'll recognize in every session that follows.\n\nThe while True: loop with cap.read() inside it is what makes this a live feed rather than a single photo — every session after this one builds on exactly this read-loop shape, so it's worth getting right here first.\n\ncv2.flip(frame, 1) mirrors the image left-right: a raw webcam feed shows you as others see you, which feels backwards on screen — flipping it once here means every later session inherits the correct, natural view for free.\n\ncv2.waitKey(1) (not waitKey(0)) is what keeps the loop non-blocking — it waits at most 1 ms for a keypress and then lets the loop come back around for the next frame; waitKey(0) blocks forever until a key is pressed, which is exactly why it can only ever show one frame.\n\ncap.release()/cv2.destroyAllWindows() after the loop free the camera and close the window — without cap.release(), the camera can stay \"locked\" by Python even after the window closes, and the next run fails to open it until you restart.",
      glossary: [
        { term: "isinstance(x, int)", explanation: "checks whether a value is a certain type (here: a whole number), so the code can decide which of two paths to take." },
        { term: "cv2.VideoCapture(...)", explanation: "opens a connection to a camera or video stream." },
        { term: "cap.isOpened()", explanation: "checks whether that connection actually worked; gives back True or False." },
        { term: "while True:", explanation: "a loop that repeats forever, until something inside it explicitly stops it." },
        { term: "cap.read()", explanation: "grabs one picture from the camera right now; called once per loop, it's what turns single snapshots into a live feed." },
        { term: "break", explanation: "immediately exits the loop it's inside." },
        { term: "cv2.flip(frame, 1)", explanation: "flips a picture left-to-right, like a mirror." },
        { term: "cv2.imshow(...)", explanation: "opens a window on your screen and shows a picture in it." },
        { term: "cv2.waitKey(1)", explanation: "pauses briefly (here, 1 millisecond) waiting for a keypress, and lets the window redraw while it waits." },
        { term: "& 0xFF", explanation: "keeps only the lowest 8 bits of a number; used here to make key-code comparisons reliable across different computers." },
        { term: "ord(\"q\")", explanation: "converts a single character into the number your computer uses to represent it." },
        { term: "cap.release()", explanation: "lets go of the camera, so other programs (or the next run of your own script) can use it." },
        { term: "cv2.destroyAllWindows()", explanation: "closes every window your script opened." },
        { term: "raise RuntimeError(...)", explanation: "stops the program immediately and shows an error message explaining what went wrong." },
      ],
      commonProblems: [
        { error: "AttributeError: module 'cv2' has no attribute 'cap_DSHOW' (or similar)", solution: "OpenCV's constants and camelCase function names are case-sensitive: it's cv2.CAP_DSHOW, cv2.waitKey, cv2.destroyAllWindows — not cv2.cap_DSHOW, cv2.waitkey, cv2.destroyAllwindows. This is the single most common typo in this whole script; if you see AttributeError, re-check casing against the code above character by character before anything else." },
        { error: "Script shows one picture and then the window seems frozen", solution: "This happens when cap.read() is called once outside any loop, then the camera is released immediately after. There's no code pulling new frames, so nothing more will ever appear; the fix is the whole while True: loop above, with cv2.waitKey(1) (not waitKey(0), which blocks forever waiting for a keypress instead of looping)." },
        { error: "Loop exits instantly, window never even appears, camera \"won't open\"", solution: "This is almost always an inverted condition, e.g. if ok: break instead of if not ok: break. if ok: break exits the very first time a frame is read successfully — before cv2.imshow() ever runs — so it looks like the camera failed when it actually worked perfectly for one frame you never saw. The loop should only break when a read fails." },
        { error: "Live feed looks mirrored/reversed compared to what you'd expect", solution: "This is normal for a raw, unflipped webcam feed; movement looks reversed compared to a mirror. cv2.flip(frame, 1) before imshow fixes it by flipping horizontally, matching the \"selfie camera\" view everyone expects." },
        { error: "(Laptop webcam) Window shows a black frame, or the wrong camera", solution: "Laptops with an IR camera (for Windows Hello face login) often register that as index 0. Try CAM_SOURCE = 1 instead." },
        { error: "(Laptop webcam, macOS) Script looks frozen right after you run it", solution: "A \"Terminal would like to access the camera\" permission dialog can appear behind other windows — check for it if nothing happens." },
        { error: "(Phone over USB) Could not open camera with a URL", solution: "Confirm adb forward tcp:8080 tcp:8080 is still active (it resets if the phone was unplugged/replugged) and that IP Webcam's server is running on the phone." },
        { error: "(Either path) Could not open camera", solution: "Another app (Zoom, Teams, browser tab) already has the camera open; close it and retry." },
        { error: "Pressing q and nothing happening", solution: "The OpenCV window needs to be the focused/clicked window for cv2.waitKey to see the keypress; clicking the terminal instead of the video window is the most common cause." },
        { error: "Editor-only, not a real bug: VS Code/Pylance shows \"Import 'cv2' could not be resolved\"", solution: "The script runs fine from the terminal — VS Code has a different Python interpreter selected than the one with opencv-python installed (Step 4 covers checking this). Fix via Ctrl+Shift+P → \"Python: Select Interpreter\", matching the path printed by python -c \"import sys; print(sys.executable)\"." },
      ],
    },
  ],
};
