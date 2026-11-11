# QR Attendance — Session 0: Project setup

**Track:** QR Attendance — lead-in  
**Syllabus mapping:** Module 1 (abbreviated) — a fresh virtual environment and installing this project's libraries; Module 3 — VideoCapture and "any camera is just a source" (laptop webcam vs. phone stream)  
**Builds toward:** `source-code/qr-attendance/ (qr_generator.py and qr_scanner.py)`

> Source record for `app/qr-attendance/data/sessions/00-qr-session-0.ts` (generated from it — the TS file is what ships).

## Session goal

By the end of today, everyone has a fresh qr-attendance project folder with its own virtual environment, OpenCV, qrcode, Pillow and NumPy installed, a camera source chosen, and a live camera window proven from Python — the base the QR generator and scanner are built on.

## Instructor notes

- This session assumes Python is already installed — everyone did Hand Tracking's Setup. Anyone who still needs Python, or a first-time phone-over-USB setup on a lab PC, follows the linked Hand Tracking Setup steps; they aren't re-taught here.
- Fresh folder and fresh venv on purpose: the QR project's packages (qrcode, Pillow) are separate from the MediaPipe projects, and the scanner imports the generator by file name, so both scripts must sit together in this one folder.
- Step 5's camera choice is remembered by this guide and fills in the CAM_SOURCE line in every QR code panel. If a student already picked a camera path in Hand Tracking's Setup on the same browser, it's pre-selected — they can switch it.

---

## Step 1 — Create the qr-attendance project folder

**Say:** New project, new folder. Both scripts we write — qr_generator.py and qr_scanner.py — will live side by side in here, and that matters later: the scanner reads the class list straight out of the generator file, which only works when they share a folder.

First, a quick check that Python still answers. If python --version doesn't print a version number, stop and follow the Hand Tracking Setup link below before going on. (Windows: try py --version. macOS/Linux: use python3 in place of python everywhere today.)

*Check Python, then make the folder and step into it*

```bash
python --version
mkdir qr-attendance
cd qr-attendance
```

### New in this step

- **python --version** — asks Python which version of itself is installed. If it prints a number, Python is ready.
- **mkdir** — short for "make directory" — creates a new folder.
- **cd** — short for "change directory" — moves the terminal into a folder, so the next commands run there.
- **Project folder** — one folder that holds everything for one project: its code, its virtual environment, and the files it creates.

### Why it matters

Giving each project its own folder keeps its files, its venv, and everything it generates later — the qr_codes/ folder of cards and the attendance.csv log — from mixing with the Hand and Face projects. Open this folder in VS Code now (File → Open Folder… → qr-attendance) so VS Code's terminal starts inside it every time.

### Common problems

- **'python' is not recognized as an internal or external command (Windows)** — Try py --version instead. If that also fails, Python isn't installed or isn't on PATH — follow the Hand Tracking Setup link below, then come back.
- **Windows opens the Microsoft Store when you type python** — That's a store shortcut pretending to be Python. Use py instead, or reinstall Python from python.org with "Add python.exe to PATH" ticked (Hand Tracking Setup covers it).
- **macOS/Linux: python: command not found, but python3 works** — Normal on those systems. Use python3 wherever this guide says python.
- **mkdir: A subdirectory or file qr-attendance already exists** — You've made it before — that's fine. Just run cd qr-attendance and carry on.
- **You made the folder inside another project's venv folder (or inside cv-iot-class\venv)** — Never put project files inside a venv folder. Go back up with cd .. until you're somewhere ordinary (like Documents or C:\dev), then make qr-attendance there.
- **Strange "access denied" or "file in use" errors later, and the folder is inside OneDrive** — OneDrive syncing can lock files while Python is writing them. Make the folder somewhere OneDrive doesn't sync, such as C:\dev\qr-attendance.

### Need more help?

- [Hand Tracking Setup — install Python if you don't have it](/hand-tracking/setup-1b) (That guide unlocks in order — if it opens on an earlier step, click Next until you reach it.)
- [Troubleshooting: Python, pip & venv problems](/hand-tracking/troubleshooting/python-pip-venv)

---

## Step 2 — Create a fresh virtual environment

**Say:** Same idea as in Setup: a private copy of Python just for this project. We make a brand-new one here instead of reusing cv-iot-class's venv, so this project's packages stay separate from the MediaPipe projects.

If your prompt already shows (venv) from another project, type deactivate first, so the new venv is built from your normal Python.

```bash
python -m venv venv
```

### New in this step

- **Virtual environment (venv)** — a private, separate copy of Python for one project, so its packages don't mix with any other project's.
- **python -m venv venv** — the command that makes that private copy. The first venv is the tool's name; the second is the folder name it creates.
- **deactivate** — turns off whichever virtual environment is currently active in this terminal.

### Why it matters

python -m venv venv makes a folder called venv/ inside qr-attendance, holding its own private python and pip. Anything installed into it stays in this project only. The venv/ folder is Python's own — never save your scripts inside it; they go next to it, in qr-attendance itself.

### Common problems

- **No module named venv / python venv venv does nothing useful** — The -m is missing. venv is a module run through Python: python -m venv venv.
- **(venv) was already showing before you ran the command** — Another project's venv was still active, so the new one was built from it. It usually still works, but to be safe: deactivate, delete the new venv folder, and run python -m venv venv again.
- **Linux: "The virtual environment was not created successfully because ensurepip is not available"** — Install the venv module once: sudo apt install python3-venv, then run the command again.
- **The command seems to hang for a while** — Creating a venv copies Python's files and can take 10–30 seconds on a slow lab disk. Wait for the prompt to come back.

### Need more help?

- [Troubleshooting: Python, pip & venv problems](/hand-tracking/troubleshooting/python-pip-venv)

---

## Step 3 — Activate the venv and confirm it's active

**Say:** Making the venv doesn't switch it on. We activate it in this terminal so python and pip point inside qr-attendance/venv — then check it, because installing into the wrong Python is the most common setup mistake there is.

*1. Activate — pick the line for your terminal*

```bash
# Windows PowerShell (VS Code's default on Windows)
.\venv\Scripts\Activate.ps1

# Windows cmd.exe
venv\Scripts\activate.bat

# macOS / Linux / Git Bash on Windows
source venv/bin/activate
```

*2. Confirm — the first path printed must be inside qr-attendance\venv*

```bash
# Windows
where python

# macOS / Linux
which python
```

### New in this step

- **Activate** — switches this terminal to use the venv's private Python and pip instead of the computer's main ones.
- **(venv) in the prompt** — the sign that a virtual environment is active in this terminal.
- **where (Windows) / which (macOS/Linux)** — shows exactly which file the terminal would run for a command name. If several are listed, the first one wins.
- **source** — runs a script's commands inside the current terminal; activation needs this so it can change this terminal's own settings.

### Why it matters

Activation changes this one terminal window only, so pip install in the next step lands inside qr-attendance/venv. You'll see (venv) at the start of the prompt when it worked. The where/which check proves it: the path should end in qr-attendance\venv\Scripts\python.exe (Windows) or qr-attendance/venv/bin/python (macOS/Linux) — not a system Python, and not cv-iot-class's venv.

Every new terminal you open later needs activating again.

### Common problems

- **PowerShell: "Activate.ps1 cannot be loaded because running scripts is disabled on this system"** — PowerShell is blocking scripts. Run this once: Set-ExecutionPolicy -Scope CurrentUser RemoteSigned, answer Y, then activate again.
- **where python shows cv-iot-class\venv (or another project's venv) first** — The old venv is still active. Run deactivate, make sure you're inside qr-attendance, then activate again.
- **where python shows a system path like C:\Python312\python.exe or the WindowsApps folder first** — Activation didn't take. Check you're inside qr-attendance (the venv folder must be right here), then run the activate line for your terminal again.
- **The system cannot find the path specified / No such file or directory** — You're not in the qr-attendance folder, or the venv wasn't created. Run cd qr-attendance, check a venv folder exists, then try again.
- **VS Code's ▶ Run button uses a different Python than your terminal** — Press Ctrl+Shift+P → "Python: Select Interpreter" and pick the one inside qr-attendance\venv. Do this once per project folder.
- **Later in the term: packages "disappeared" in a new terminal** — That terminal was never activated. Look for (venv) in the prompt; if it's missing, activate first.

### Need more help?

- [Troubleshooting: Python, pip & venv problems](/hand-tracking/troubleshooting/python-pip-venv)

---

## Step 4 — Install the QR project's libraries

**Say:** Three installs, each with a job. opencv-python gives us cv2: the camera, the window, the drawing — and its own built-in QR code reader. qrcode makes the QR images, and the [pil] part also installs Pillow, which we use to draw each student's ID card. NumPy is what the scanner uses for the QR code's corner points.

Keep the quotes around "qrcode[pil]" — some terminals treat square brackets as a special pattern. Then run the one-line import check to prove all four load.

*1. Install (venv must be active)*

```bash
pip install opencv-python "qrcode[pil]" numpy
```

*2. Check all four import — should print the OpenCV version*

```bash
python -c "import cv2, qrcode, PIL, numpy; print('Ready! OpenCV', cv2.__version__)"
```

### New in this step

- **pip install** — downloads a package (code someone else wrote) and installs it into the active Python, so your code can use it.
- **opencv-python (cv2)** — the OpenCV package. You install it as opencv-python but import it in code as cv2.
- **qrcode** — a package that turns text into a QR code image.
- **"qrcode[pil]"** — the square brackets ask pip for an "extra": qrcode plus the Pillow package it needs to save images. The quotes stop the terminal treating [ ] as special.
- **Pillow (PIL)** — an image package for drawing shapes and text onto pictures. Installed as Pillow, imported as PIL.
- **NumPy** — a package for working with lists of numbers quickly; OpenCV pictures and QR corner points are NumPy arrays.
- **python -c "..."** — runs the Python code inside the quotes straight away, without making a file.
- **ModuleNotFoundError** — the error Python gives when your code imports a package that isn't installed in the Python being used.

### Why it matters

The import check runs a tiny program straight from the terminal. If it prints Ready!, every library our two scripts need is installed in this venv. If one is missing, Python names it in a ModuleNotFoundError — far easier to fix now than halfway through the generator.

The course syllabus mentions pyzbar for reading QR codes. We use OpenCV's built-in QR reader instead: one less install, and nothing extra to set up on Windows.

### Common problems

- **ModuleNotFoundError: No module named 'qrcode'** — qrcode isn't in the Python you're running — almost always because the venv wasn't active when you installed, or you're running a different Python now. Check (venv) is showing and where python points into qr-attendance\venv (Step 3), then run the pip install line again.
- **ModuleNotFoundError: No module named 'PIL'** — qrcode was installed without its [pil] extra. Run pip install "qrcode[pil]" (with the quotes), or pip install pillow.
- **zsh: no matches found: qrcode[pil] (macOS)** — The quotes were left off, so the terminal tried to treat [pil] as a file pattern. Type it exactly as shown: pip install opencv-python "qrcode[pil]" numpy.
- **ERROR: No matching distribution found for PIL** — PIL is the name you import, not the name you install. The install name is Pillow — and "qrcode[pil]" already installs it for you.
- **'pip' is not recognized as an internal or external command** — Use python -m pip install opencv-python "qrcode[pil]" numpy instead — it runs the venv's pip through its python.
- **WARNING: Retrying ... Read timed out, or the install looks frozen** — opencv-python is a big download (tens of MB) and the lab network can be slow. Let it run; if it fails, run the same line again — pip skips what's already done.
- **The import check works in the terminal, but VS Code underlines import qrcode / import cv2** — VS Code has a different interpreter selected. Ctrl+Shift+P → "Python: Select Interpreter" → pick the one inside qr-attendance\venv.

### Need more help?

- [Troubleshooting: Python, pip & venv problems](/hand-tracking/troubleshooting/python-pip-venv)

---

## Step 5 — Choose your camera source: laptop webcam or phone over USB

**Say:** Same two paths as in Setup. Pick the one that matches the computer you're on today. This guide remembers your pick and fills in the right CAM_SOURCE line in every QR code panel from here on — the camera check in the next step, and the scanner in Sessions 2 to 4.

If you already picked a path in Hand Tracking on this browser, it's pre-selected. On a different computer than usual today? Switch it.

**Fork — Which camera source are you using today?**

### Path A · Laptop webcam

Nothing to set up. Your camera is device number 0, so CAM_SOURCE stays 0. If the next step shows a black window or the wrong camera, try 1 instead.

### Path B · Phone over USB

First time with this phone? Do the one-time phone setup in Hand Tracking's Setup first (Developer Options, USB debugging, the IP Webcam app) — link under "Need more help?".

Every session:
1. Plug your phone into the lab PC with a data cable.
2. If the phone asks "Allow USB debugging?", tick "Always allow from this computer" and tap Allow.
3. Check the PC sees the phone, then tunnel its stream over USB — forward, not reverse.
4. Open IP Webcam → scroll down → tap Start server. Keep the phone screen on.
5. Open http://localhost:8080/video in a browser on the PC. If you see your camera, you're ready.

*Every session — the phone should show as "device", not "unauthorized"*

```bash
adb devices
```

*Every session — tunnel the phone's stream over USB*

```bash
adb forward tcp:8080 tcp:8080
```

### New in this step

- **Camera source** — where the picture comes from: the laptop's own webcam, or your phone's camera streamed to the PC.
- **CAM_SOURCE** — the one line in our scripts that says which camera to open — a number for a webcam, or a web address for the phone stream.
- **IP Webcam** — an Android app that turns your phone into a camera the computer can read over a web address.
- **adb devices** — lists the Android phones the computer can talk to over USB, and whether each one has allowed it.
- **adb forward tcp:8080 tcp:8080** — connects the PC's port 8080 to the phone's port 8080 through the USB cable, so the phone's stream appears on the PC.
- **localhost** — a web address that means "this same computer" — here, the phone's stream arriving through the USB tunnel.

### Why it matters

OpenCV can open a camera two ways: by number (0 is the laptop's own webcam) or by web address (the phone's IP Webcam stream). The scanner reads one setting, CAM_SOURCE, and works either way — so the only thing that changes between the two paths is that one line.

On a lab PC, adb forward makes the phone's stream show up on the PC as http://localhost:8080/video, carried over the USB cable — no WiFi needed. It has to be forward, not reverse: IP Webcam already uses port 8080 on the phone, so reverse fails with "address already in use".

### Common problems

- **The wrong path is pre-selected (you used a laptop last time, a lab PC today)** — Click "Not on this path? Switch" in the panel. Your new pick is saved for the QR guide only — Hand Tracking keeps its own.
- **(Phone over USB) 'adb' is not recognized as an internal or external command** — Android Platform Tools isn't installed or isn't on PATH on this PC. Tell your instructor — it's normally set up once per lab machine. The ADB troubleshooting page below has the steps.
- **(Phone over USB) adb devices lists nothing** — Try another cable first — many charging cables carry power only, no data. Then re-check the order: cable plugged in first, USB debugging switched on, unplug and replug once.
- **(Phone over USB) adb devices shows your phone as unauthorized** — Look at the phone: there's an "Allow USB debugging?" prompt waiting. Tick "Always allow from this computer" and tap Allow. It appears again on each new PC.
- **(Phone over USB) adb: more than one device/emulator** — Another phone (or an emulator) is also connected. Unplug the others, or ask your instructor which device to use.
- **(Phone over USB) error: cannot bind listener: 'tcp:8080': Address already in use** — You ran adb reverse instead of adb forward. Use adb forward tcp:8080 tcp:8080.
- **(Phone over USB) http://localhost:8080/video won't load in the browser** — Open IP Webcam on the phone and tap Start server, and run adb forward tcp:8080 tcp:8080 again — the tunnel resets whenever the phone is unplugged.

### Need more help?

- [Hand Tracking Setup — one-time phone setup (Path B)](/hand-tracking/setup-6) (That guide unlocks in order — if it opens on an earlier step, click Next until you reach it.)
- [Troubleshooting: ADB & Android connection problems](/hand-tracking/troubleshooting/adb-android)

---

## Step 6 — Camera check: prove the camera opens from this venv

**Say:** New folder, new venv, new installs — so we prove the camera again before building anything on it. This is the same check as Hello, Camera in Setup, with one difference: the CAM_SOURCE lines and the camera-opening lines are written exactly as they'll appear at the top of qr_scanner.py, so they'll look familiar in Session 2.

Your CAM_SOURCE line below already matches the camera you picked in Step 5.

> **Create a new file:** Create a new file called camera_check.py inside your qr-attendance folder — right next to the venv folder, not inside it. In VS Code: File → New File → type the name camera_check.py → save it in qr-attendance.

**Type (new file `camera_check.py`):**

```python
import cv2

CAM_SOURCE = 0
# Laptop with a built-in webcam: leave as the device index above (0).
# Lab PC with no webcam: set to your phone's IP Webcam stream tunneled over
# USB via `adb forward tcp:8080 tcp:8080`, e.g.:
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
cv2.destroyAllWindows()
```

**Run:** `python camera_check.py`

A mirrored, live camera window titled "QR camera check" opens. Wave — it should follow you smoothly. Click the window, then press q to close it. You can keep camera_check.py; we won't need it again.

### New in this step

- **import cv2** — loads OpenCV so this file can use it.
- **# comment** — anything after a # on a line is a note for people; Python skips it.
- **isinstance(x, int)** — checks whether a value is a whole number, so the code can choose between two ways of opening the camera.
- **cv2.VideoCapture(...)** — opens a camera or video stream.
- **cv2.CAP_DSHOW** — tells OpenCV to use DirectShow, Windows' own fast way of opening a webcam.
- **cap.isOpened()** — True if the camera actually opened, False if not.
- **raise RuntimeError(...)** — stops the program with a clear error message.
- **while True:** — a loop that repeats until something inside it says break.
- **cap.read()** — grabs one picture from the camera. It gives back ok (did it work?) and frame (the picture).
- **break** — leaves the loop straight away.
- **cv2.flip(frame, 1)** — mirrors the picture left-to-right.
- **cv2.imshow(title, frame)** — shows a picture in a window with that title.
- **cv2.waitKey(1) & 0xFF == ord("q")** — waits 1 millisecond for a key press and checks whether it was q.
- **cap.release()** — lets go of the camera so other programs can use it.
- **cv2.destroyAllWindows()** — closes every window the program opened.

### Why it matters

isinstance(CAM_SOURCE, int) picks how to open the camera. A number means a webcam: first try cv2.CAP_DSHOW (Windows' fastest way to open a webcam), and if that fails — on macOS or Linux, for example — try again with OpenCV's default. A web address means the phone stream, which OpenCV opens on its own.

The while True loop grabs and shows one frame after another, which is what makes it live video. cv2.flip(frame, 1) mirrors it so moving left looks like moving left. cv2.waitKey(1) waits 1 millisecond for a key and lets the window redraw. After the loop, cap.release() frees the camera so the next program can open it.

The lines starting with # are comments — notes for people, ignored by Python. They're how the real scanner reminds you of the phone address.

### Common problems

- **ModuleNotFoundError: No module named 'cv2'** — The venv isn't active in this terminal, or VS Code's ▶ button is using another Python. Activate (Step 3) and run python camera_check.py from the terminal; fix VS Code with "Python: Select Interpreter".
- **python: can't open file '...camera_check.py': [Errno 2] No such file or directory** — The terminal isn't in the folder where you saved the file — or you saved it inside venv/. Move camera_check.py into qr-attendance and run cd qr-attendance.
- **AttributeError: module 'cv2' has no attribute 'cap_dshow' (or 'waitkey', 'destroyAllwindows')** — OpenCV names are case-sensitive: cv2.CAP_DSHOW, cv2.waitKey, cv2.destroyAllWindows. Compare your casing letter by letter.
- **RuntimeError: Could not open webcam. Check CAM_SOURCE / camera permissions.** — Another program has the camera — Zoom, Teams, a browser tab, or a Hand/Face script still running in another terminal. Close it and run again. On the phone path, re-run adb forward tcp:8080 tcp:8080 and check IP Webcam's server is on.
- **(Laptop webcam) The window is black, or shows the wrong camera** — Some laptops list an infrared face-login camera as 0. Change CAM_SOURCE = 0 to CAM_SOURCE = 1 and run again.
- **(Laptop webcam, macOS) Nothing happens after running** — A "Terminal would like to access the camera" permission box may be hiding behind other windows. Allow it, then run again.
- **(Phone over USB) The window opens but freezes after a few seconds** — The phone screen locked or IP Webcam went into the background. Reopen IP Webcam, tap Start server, and keep the screen on.
- **Pressing q does nothing** — Click on the camera window first. Key presses go to whichever window is selected — usually the terminal by mistake.
- **The window opens and closes instantly with no error** — Check the loop: it must be if not ok: break. Writing if ok: break leaves the loop on the very first good frame.

---

## Wrap-up

Everyone now has: a qr-attendance folder with its own activated venv; OpenCV, qrcode, Pillow and NumPy installed and import-checked; a camera source chosen; and a live camera window proven from Python. Next session we write qr_generator.py and make a QR attendance pass for every student on the roster.
