# Session: Setup & Environment

**Track:** Lead-in (before Hand Tracking and Face Tracking)
**Maps to syllabus:** Module 1 (abbreviated) — installing Python, pip, and a virtual environment; installing OpenCV; "Hello, Image" first program
**Session goal (say this out loud at the start):** "By the end of today, everyone has Python, an isolated project environment, and both activities' libraries installed — and we've proven the camera works from Python before we build anything real on top of it."

> **Resolved:** `source code/hand-tracking/requirements.txt` now also pins `mediapipe==0.10.14`, matching `source code/facial-recognition/requirements.txt`. Step 5 keeps the discussion of *why* pinning matters, since it's a useful, real example for students, but there's no longer a live mismatch in the repo.

> **Two-path classroom note:** Lab PCs have no built-in webcam and the room has no WiFi (Ethernet only). Students on lab PCs use their Android phone over USB as the camera instead; students with their own laptop keep using its built-in webcam. Step 6 below covers both — see the full research behind this at `.scratch/cv-iot-student-guide/research/camera-source-lab-computers.md`. Both `hand_ar.py` and `face_tracker.py` now read a single `CAM_SOURCE` config value (an `int` device index, or a URL string) instead of a hardcoded camera index, so the same script works either way.

---

## Step 1 — Confirm Python is installed and on PATH

**Say:** Before anything else, we need to know which Python we're actually running — mediapipe (the ML library both activities depend on) only ships pre-built wheels for specific Python versions, so "some Python is installed" isn't enough; we need to know *which* one.

**Type (terminal):**
```bash
python --version
```
*(Windows users: if that fails, try `py --version` instead.)*

**New in this step:**
- `python --version` — a command that asks Python to tell you which version of itself is installed.
- **PATH** — a list your computer checks to find a program when you type its name in the terminal. If a program "isn't on PATH," the terminal doesn't know where to find it.
- `py` — an alternative launcher command Windows installs alongside Python; useful when plain `python` doesn't work.

**Why it matters:** mediapipe's published wheels typically trail the newest Python release by a few months. If `python --version` reports something very new (e.g. a version released in the last month or two), `pip install mediapipe` in Step 5 may fail with no matching distribution — better to catch that now than mid-install.

**Common problems:**
- `'python' is not recognized...` (Windows) — Python isn't on PATH. Reinstall from python.org with "Add python.exe to PATH" checked, or use the `py` launcher instead.
- Windows opens the Microsoft Store instead of running Python — that's the store-app stub shadowing the real `python` command; same fix as above, or use `py`.
- macOS/Linux: `python` not found but `python3` works — that's normal on those platforms; use `python3` for every command in this session.
- Multiple Pythons installed, unsure which one's active — `where python` (Windows) / `which python` (macOS/Linux) shows the exact path being used.

---

## Step 2 — Create the project folder and a virtual environment

**Say:** We're about to install two different sets of libraries into "Python." If we install them globally, they'll collide with whatever else is on this machine — maybe a different mediapipe version another course needs. A **virtual environment** is a private, throwaway copy of Python just for this course's packages.

**Type (terminal):**
```bash
mkdir cv-iot-class
cd cv-iot-class
python -m venv venv
```

**New in this step:**
- **Virtual environment (venv)** — a private, separate copy of Python just for this one project, so the packages it needs don't mix with anything else on your computer.
- `python -m venv venv` — the command that creates that private copy, in a folder named `venv`.
- `mkdir` / `cd` — terminal commands for making a new folder and moving into it.

**Why it matters:** `python -m venv venv` creates a `venv/` folder containing its own private `python` and `pip`. Nothing installed inside it touches the system-wide Python.

**Common problems:**
- Forgetting `-m` (`python venv venv` instead of `python -m venv venv`) — `venv` is a module, not a standalone command.
- On minimal Linux installs, `venv` module is missing — `sudo apt install python3-venv` fixes it.
- Creating the project folder inside a OneDrive-synced directory on Windows can cause odd permission/lock errors — prefer a local, non-synced folder (e.g. `C:\dev\cv-iot-class`) if this happens.

---

## Step 3 — Activate the virtual environment

**Say:** Creating the venv doesn't turn it on — we still have to *activate* it in this terminal session so `python`/`pip` point inside `venv/` instead of the system install.

**Type (terminal) — pick the line for your shell:**
```bash
# Windows PowerShell
.\venv\Scripts\Activate.ps1

# Windows cmd.exe
venv\Scripts\activate.bat

# macOS / Linux / Git Bash on Windows
source venv/bin/activate
```

**New in this step:**
- **Activate** — switches your current terminal to use the virtual environment's private Python instead of the computer's main one.
- `source` (macOS/Linux) — runs a script's commands directly inside your current terminal, rather than starting it as a separate process. That's needed here, since activation only works if it changes *this* terminal's own settings.

**Why it matters:** Activation temporarily rewrites PATH for this terminal window only, so `pip install` in Step 5 lands inside `venv/` instead of globally. You'll see `(venv)` appear at the start of the prompt when it worked.

**Common problems:**
- PowerShell error: *"cannot be loaded because running scripts is disabled on this system"* — PowerShell's execution policy is blocking the activation script. Fix (run once, in an admin PowerShell): `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.
- Opening a *new* terminal tab/window later in the semester and forgetting to reactivate — if `(venv)` isn't showing, packages will silently install globally again.
- VS Code's integrated terminal or "Run" button using a different Python interpreter than the one you activated manually — see Step 4.

---

## Step 4 — Confirm the venv is actually active

**Say:** This is the single most common setup mistake, so we check it explicitly instead of assuming Step 3 worked.

**Type (terminal):**
```bash
# Windows
where python

# macOS / Linux
which python
```

**New in this step:**
- `where` (Windows) / `which` (macOS/Linux) — asks the terminal exactly which file it would run when you type a command's name.

**Why it matters:** The path printed should be *inside* your `cv-iot-class/venv/` folder, not a system path like `C:\Python312\python.exe` or `/usr/bin/python3`. If installs later seem to "disappear," this is the first thing to re-check.

**Common problems:**
- Path points outside `venv/` — activation didn't take; repeat Step 3.
- In VS Code specifically: the terminal can be activated correctly while the "Run Python File" button uses a *different*, VS Code–selected interpreter. Use the interpreter picker (bottom-right status bar, or `Ctrl+Shift+P` → "Python: Select Interpreter") and choose the one inside `venv/`.

---

## Step 5 — Install both activities' dependencies

**Say:** Both activities need OpenCV (camera + image handling) and MediaPipe (the hand/face ML models); the hand-tracking activity also uses NumPy directly for the trail math.

**Type (terminal):**
```bash
pip install opencv-python mediapipe==0.10.14 numpy
```

**New in this step:**
- `pip install` — downloads and installs a Python package (a piece of reusable code someone else wrote) so your own code can use it.
- `==0.10.14` (a version pin) — tells pip to install that *exact* version, not just "whatever's newest."

**Why it matters:** `opencv-python` gives us `cv2` — capturing webcam frames, drawing shapes, showing windows. `mediapipe` gives us the pretrained hand-landmark and face-mesh/detection models we'll use in the next sessions. We're installing with an exact version pin (`==0.10.14`) rather than "whatever's newest" — both activities' `requirements.txt` files pin to this same version, so everyone in class ends up running identical mediapipe behavior instead of drifting depending on install date.

**Common problems:**
- `ERROR: No matching distribution found for mediapipe==0.10.14` — usually means your Python version is too new (or too old, or the wrong CPU architecture) for that mediapipe release. Check `python --version` against mediapipe's supported-version list, or fall back to an unpinned `pip install mediapipe` and note the version that actually installs.
- Install seems to hang — mediapipe's wheel is tens of MB; slow classroom wifi makes this look frozen. Let it run.
- `pip install` succeeds but `import cv2` still fails in VS Code — interpreter mismatch again (see Step 4); reselect the venv interpreter and restart VS Code's terminal.

---

## Step 6 — Set up your camera source: laptop webcam or phone over USB

**Say:** Everyone's camera situation today is one of two paths. If you're on your own laptop with a built-in camera, you're already done — skip to Step 7. If you're on a lab PC, there's no webcam, and this room has no WiFi, so your phone becomes the camera, connected by USB cable only.

**Path A — Laptop with a built-in webcam:** nothing to install. Your camera is device index `0` (occasionally `1` if the laptop has multiple cameras — Step 7 covers what to do if you get a black frame).

**Path B — Lab PC + Android phone over USB (no WiFi needed):**

*One-time, first day only:*
1. On your phone: Settings → About phone → tap "Build number" 7 times to unlock Developer Options.
2. Settings → Developer Options → enable **USB debugging**.
3. Install the **IP Webcam** app (by Pavel Khlebovich) from the Play Store.

*Every session:*
1. Plug your phone into the lab PC with a USB cable. On the phone, tap **Allow** on the "Allow USB debugging?" prompt — check **"Always allow from this computer"** the first time so it doesn't ask again on this PC.
2. Open IP Webcam → scroll down → tap **Start server**. In the app's video preferences, make sure **"Keep screen on"** is enabled so the stream doesn't drop if the phone would otherwise auto-lock.
3. On the PC, open a terminal and run:
   ```bash
   adb reverse tcp:8080 tcp:8080
   ```
   This tunnels the phone's local HTTP stream through the USB cable to `localhost:8080` on the PC — no WiFi or LAN involved at all.
4. In the script you run today (and in both real activities from here on), set:
   ```python
   CAM_SOURCE = "http://localhost:8080/video"
   ```

**New in this step:**
- **adb** (Android Debug Bridge) — Google's official tool that lets a computer talk to an Android phone over a USB cable.
- `adb reverse` — a specific adb command that makes something running on the phone reachable from the computer, through that same USB cable.
- **USB debugging** — an Android setting that allows tools like adb to actually communicate with the phone; it's off by default for security, which is why it needs turning on.
- **localhost** — a special address meaning "this same computer." It's used here because the phone's video stream gets tunneled through USB to look like it's coming from the PC itself.

**Why it matters:** `adb reverse` is official Android developer tooling — it's the *reverse* direction of port forwarding (device → host instead of host → device), so a server the phone is already running on itself becomes reachable on the PC. This avoids installing a third-party virtual-camera driver on every lab PC — school antivirus/locked-down images are far more likely to block or quarantine those than a plain, Google-signed `adb.exe`. Both real activities read whichever source you set through one shared `CAM_SOURCE` value, so nothing else in the code changes between Path A and Path B.

**Common problems:**
- Phone not detected by `adb` at all — install the OEM USB driver for your phone brand (Samsung, Pixel, etc.); needed once per phone model.
- `adb reverse` "command not found" — Android Platform Tools isn't installed/on PATH on this PC; the instructor installs this once per lab machine ahead of time, not per student.
- Stream drops mid-class — the phone's screen locked or IP Webcam got backgrounded; re-open the app and tap Start server again, and double-check "Keep screen on."
- Different PC than last time — the "Allow USB debugging?" prompt reappears, since authorization is per phone-PC pairing, not global to the phone. Tap Allow again.
- **Documented fallback** if IP Webcam / `adb reverse` won't cooperate on a given phone: try **DroidCam** (USB mode, free, official Windows client, bundles its own `adb`) — install the Windows client, connect via USB in the client, then use its assigned device index the same way as Path A.

---

## Step 7 — "Hello, Camera": prove your camera source works before writing anything real

**Say:** Before we touch either real project, we isolate one question: *does Python see your camera — whichever path you're on — at all?* If this fails weeks from now inside a much bigger file, it's hard to tell a camera problem from a code problem. We rule it out now, with the smallest possible script — and we build it up in front of you step by step, mistakes included, because the mistakes below are ones most of you will hit today and it's faster to recognize them than to debug them cold.

**Type (new file `hello_webcam.py`):**
```python
import cv2

CAM_SOURCE = 0  # laptop webcam (Path A). Lab PC + phone (Path B): "http://localhost:8080/video"

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
cv2.destroyAllWindows()
```

**Run it:**
```bash
python hello_webcam.py
```
You should see a mirrored, *continuously updating* camera window — not one static picture. Click the window to focus it, then press `q` to quit cleanly.

**New in this step:**
- `isinstance(x, int)` — checks whether a value is a certain type (here: a whole number), so the code can decide which of two paths to take.
- `cv2.VideoCapture(...)` — opens a connection to a camera or video stream.
- `cap.isOpened()` — checks whether that connection actually worked; gives back `True` or `False`.
- `while True:` — a loop that repeats forever, until something inside it explicitly stops it.
- `cap.read()` — grabs one picture from the camera right now; called once per loop, it's what turns single snapshots into a live feed.
- `break` — immediately exits the loop it's inside.
- `cv2.flip(frame, 1)` — flips a picture left-to-right, like a mirror.
- `cv2.imshow(...)` — opens a window on your screen and shows a picture in it.
- `cv2.waitKey(1)` — pauses briefly (here, 1 millisecond) waiting for a keypress, and lets the window redraw while it waits.
- `& 0xFF` — keeps only the lowest 8 bits of a number; used here to make key-code comparisons reliable across different computers.
- `ord("q")` — converts a single character into the number your computer uses to represent it.
- `cap.release()` — lets go of the camera, so other programs (or the next run of your own script) can use it.
- `cv2.destroyAllWindows()` — closes every window your script opened.
- `raise RuntimeError(...)` — stops the program immediately and shows an error message explaining what went wrong.

**Why it matters:** the `isinstance(CAM_SOURCE, int)` check is the whole trick — a plain number means "open a local device by index" (`cv2.CAP_DSHOW` is the Windows-specific backend for that), while a string means "open this as a network/URL stream," and OpenCV picks its FFmpeg backend automatically. This exact branch is what both `hand_ar.py` and `face_tracker.py` use from here on, so this tiny script previews the pattern you'll recognize in every session that follows. The `while True:` loop with `cap.read()` inside it is what makes this a *live* feed rather than a single photo — every session after this one builds on exactly this read-loop shape, so it's worth getting right here first. `cv2.flip(frame, 1)` mirrors the image left-right: a raw webcam feed shows you as *others* see you, which feels backwards on screen — flipping it once here means every later session inherits the correct, natural view for free. `cv2.waitKey(1)` (not `waitKey(0)`) is what keeps the loop non-blocking — it waits at most 1&nbsp;ms for a keypress and then lets the loop come back around for the next frame; `waitKey(0)` blocks forever until a key is pressed, which is exactly why it can only ever show one frame. `cap.release()`/`cv2.destroyAllWindows()` after the loop free the camera and close the window — without `cap.release()`, the camera can stay "locked" by Python even after the window closes, and the *next* run fails to open it until you restart.

**Common problems (in the order you're likely to hit them, building this up live):**
- `AttributeError: module 'cv2' has no attribute 'cap_DSHOW'` (or similar) — OpenCV's constants and camelCase function names are case-sensitive: it's `cv2.CAP_DSHOW`, `cv2.waitKey`, `cv2.destroyAllWindows` — not `cv2.cap_DSHOW`, `cv2.waitkey`, `cv2.destroyAllwindows`. This is the single most common typo in this whole script; if you see `AttributeError`, re-check casing against the code above character by character before anything else.
- Script shows one picture and then the window seems frozen — this happens when `cap.read()` is called once outside any loop, then the camera is released immediately after. There's no code pulling new frames, so nothing more will ever appear; the fix is the whole `while True:` loop above, with `cv2.waitKey(1)` (**not** `waitKey(0)`, which blocks forever waiting for a keypress instead of looping).
- Loop exits instantly, window never even appears, camera "won't open" — this is almost always an inverted condition, e.g. `if ok: break` instead of `if not ok: break`. `if ok: break` exits the very first time a frame is read successfully — before `cv2.imshow()` ever runs — so it looks like the camera failed when it actually worked perfectly for one frame you never saw. The loop should only `break` when a read *fails*.
- Live feed looks mirrored/reversed compared to what you'd expect — this is normal for a raw, unflipped webcam feed; movement looks reversed compared to a mirror. `cv2.flip(frame, 1)` before `imshow` fixes it by flipping horizontally, matching the "selfie camera" view everyone expects.
- (Path A) Window shows a black frame, or the wrong camera — laptops with an IR camera (for Windows Hello face login) often register *that* as index `0`. Try `CAM_SOURCE = 1` instead.
- (Path A) macOS: a permission dialog ("Terminal would like to access the camera") can appear *behind* other windows, making the script look frozen — check for it if nothing happens.
- (Path B) `Could not open camera` with a URL — confirm `adb reverse tcp:8080 tcp:8080` is still active (it resets if the phone was unplugged/replugged) and that IP Webcam's server is running on the phone.
- Either path: `Could not open camera` — another app (Zoom, Teams, browser tab) already has the camera open; close it and retry.
- Pressing `q` and nothing happening — the OpenCV window needs to be the *focused/clicked* window for `cv2.waitKey` to see the keypress; clicking the terminal instead of the video window is the most common cause.
- **Editor-only, not a real bug:** VS Code/Pylance shows "Import 'cv2' could not be resolved" but the script runs fine from the terminal — VS Code has a different Python interpreter selected than the one with `opencv-python` installed (Step 4 covers checking this). Fix via `Ctrl+Shift+P` → "Python: Select Interpreter", matching the path printed by `python -c "import sys; print(sys.executable)"`.

---

## Wrap-up (say this before ending the session)

"Everyone now has: Python confirmed, an isolated virtual environment, both activities' libraries installed at matching versions, and a proven working camera feed in Python — whether that's your laptop's webcam or your phone over USB. Next session, we open `hand_ar.py` and get real hand detection running on top of exactly this same camera loop."
