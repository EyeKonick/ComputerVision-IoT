# Troubleshooting Scenarios Research — Setup & Environment / Hand Tracking Session 1

Research for ticket [08-research-troubleshooting-scenarios](../issues/08-research-troubleshooting-scenarios.md), feeding tickets 09 and 10 (troubleshooting-page prototype/build).

**Scope note:** Scenarios already covered accurately in `content/01-setup-environment.md` and `content/02-hand-session-1-webcam-loop.md` are listed briefly with a "confirmed, not duplicated" note and a source where one adds real value. Effort is concentrated on the genuine gaps called out in the ticket. Every claim is tagged with its source; anything not verifiable against a primary/official source is explicitly marked **[community-sourced / best-effort]**.

**Primary sources used:**
- Android Developer docs: `developer.android.com/tools/adb`, `/studio/command-line/adb`, `/studio/run/device`, `/studio/run/oem-usb`
- **Live capture**: this machine has Android Platform Tools 36.0.0 (`adb.exe`, `1.0.41` protocol) installed at `C:\Users\Biieejiiee\AppData\Local\Android\Sdk\platform-tools\adb.exe`. Its own `adb --help` output and live error text (run directly, not from a search result) are cited below as "adb --help (captured locally, Platform Tools 36.0.0)" and "adb CLI (captured locally)" — this is the actual tool students will run, so its own output is a primary source.
- Python official docs: `docs.python.org/3/using/windows.html` (py launcher)
- pip official docs: `pip.pypa.io`
- PyPI JSON API for mediapipe: `pypi.org/pypi/mediapipe/0.10.14/json` (queried directly, not scraped from search)
- IP Webcam developer's own doc site: `ip-webcam.appspot.com/static/doc.html`
- DroidCam's own help page: `droidcam.app/help/`

---

## Category A — Python / pip / venv (Windows, macOS, Linux)

### A1. Python not installed / not on PATH / Microsoft Store stub (Windows)
**Status:** Already documented accurately in Step 1 of `01-setup-environment.md`. Not duplicated here.

### A2. Multiple Python installs / wrong one active
**Status:** Already documented (Step 1 / Step 4, `where`/`which`). One addition worth folding in: the modern `py` launcher can enumerate every installed version directly, which is more precise than `where python` when a student has 3+ Pythons and needs to pick one.

- **Symptom:** Student doesn't know which Python versions exist on the machine at all, only which one is currently first on PATH.
- **Cause:** `where`/`which` only shows what's active in the current shell, not everything installed.
- **Fix:** `py --list` (or legacy `py -0` / `py -0p` for path output) lists every installed Python runtime Windows' launcher knows about; `py -3.11` launches a specific one directly.
- **Source:** [Python docs — `py` launcher](https://docs.python.org/3/using/windows.html#the-py-launcher) — quote: *"For compatibility with the old launcher, the `--list`, `--list-paths`, `-0` and `-0p` commands (e.g. `py -0p`) are retained."* and *"To launch a specific runtime, the `py` command accepts a `-V:<TAG>` option... `py -3.7`"*

### A3. `python` vs `python3` vs `py` launcher differences across OSes
**Status:** Already documented (Step 1). One precision worth adding: Windows *does* ship a `python3` command via the modern Python Install Manager, but it's explicitly not meant to be relied on.

- **Symptom:** A student following a macOS/Linux tutorial types `python3 --version` on Windows and it appears to work, leading to confusion about why some Windows docs say to use `python` instead.
- **Cause:** Windows' Python Install Manager includes a `python3` shim "to catch accidental uses of the typical POSIX command," not as a first-class alternative.
- **Fix:** On Windows, standardize on `python` or `py`; don't teach `python3` as the Windows-official form even though it may technically run.
- **Source:** [Python docs — Windows](https://docs.python.org/3/using/windows.html) — quote: *"A `python3` command is also included that mimics the `python` command. It is intended to catch accidental uses of the typical POSIX command on Windows, but is not meant to be widely used or recommended."*

### A4. `venv` module missing on minimal Linux installs
**Status:** Already documented (Step 2, `sudo apt install python3-venv`). Confirmed accurate, not duplicated.

### A5. PowerShell execution-policy blocking `Activate.ps1`
**Status:** Already documented (Step 3, `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`). Confirmed accurate. One alternative worth having in a troubleshooting page as a lighter-touch option than a persistent policy change: `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` scopes the change to just the current terminal window rather than the whole user profile — useful in a lab environment where students shouldn't be changing machine-persistent settings. **[best-effort — this is standard, widely documented PowerShell behavior, not sourced from a single canonical page in this pass, but consistent with Microsoft's documented `-Scope` semantics for `Set-ExecutionPolicy`.]**

### A6. Forgetting to activate the venv / new terminal tab
**Status:** Already documented (Step 3/4). Confirmed accurate, not duplicated.

### A7. VS Code interpreter mismatch
**Status:** Already documented (Step 4). Confirmed accurate, not duplicated.

### A8. OneDrive-synced project folders causing lock/permission errors (Windows)
**Status:** Already documented (Step 2) at a high level. Concrete symptom text worth adding for a troubleshooting page:
- **Symptom:** `PermissionError: [WinError 32] The process cannot access the file because it is being used by another process` during `python -m venv venv`, or a venv that appears to activate but `pip install` silently fails to write files, or OneDrive shows a sync conflict badge on files inside `venv/`.
- **Cause:** OneDrive's sync client briefly locks files while indexing/uploading them; `venv/` and `site-packages/` create/rewrite hundreds of small files quickly, which collides with OneDrive's file-locking window. OneDrive also excludes/mangles some file types by policy in managed environments.
- **Fix:** Create the project outside any OneDrive-synced tree (e.g., `C:\dev\cv-iot-class`) — already the documented fix — or pause OneDrive sync for the session if the folder can't be moved.
- **Source:** **[community-sourced / best-effort]** — this is a very widely reported Windows dev-tooling issue (venv, node_modules, git, etc. against OneDrive/Dropbox), but no single Microsoft primary-source page documents it as a known venv interaction specifically.

### A9. `pip install mediapipe==0.10.14` failing because the student's Python is too new (or too old)
**Status:** Documented at a summary level (Step 5) but under-specified — this is a real, high-priority gap to fill precisely, since it's the single most likely install failure in the whole session.

- **Symptom (exact text):**
  ```
  ERROR: Could not find a version that satisfies the requirement mediapipe==0.10.14 (from versions: ...)
  ERROR: No matching distribution found for mediapipe==0.10.14
  ```
- **Cause (verified directly against PyPI):** mediapipe 0.10.14 ships wheels **only** for CPython 3.9, 3.10, 3.11, and 3.12 (`cp39`/`cp310`/`cp311`/`cp312`), on Windows (`win_amd64`), macOS (`macosx_11_0_universal2` / `macosx_11_0_x86_64`), and Linux (`manylinux_2_17_x86_64`/`aarch64`). There is **no wheel for Python 3.13 or newer, and none for 3.8 or older** — pip has nothing installable to fall back to, hence "No matching distribution found," not a network or permissions error. The package's own PyPI metadata sets no `requires_python` floor/ceiling, so `pip` can't warn about this ahead of time — it just fails when it can't find a matching filename.
- **Fix:** `python --version` (already Step 1) needs to land in the 3.9–3.12 range specifically for this pinned mediapipe version. If a student has 3.13, either install a second Python (3.11 or 3.12 recommended) side-by-side and create the venv with that one specifically (`py -3.11 -m venv venv` on Windows, or the matching `python3.11` on macOS/Linux), or — as the existing content already suggests — fall back to an unpinned `pip install mediapipe` and accept whatever newer version resolves (noting it may not exactly match classmates').
- **Source:** [PyPI JSON API — mediapipe 0.10.14](https://pypi.org/pypi/mediapipe/0.10.14/json) (queried directly): wheel list confirmed as `cp39`/`cp310`/`cp311`/`cp312` × `{macosx_11_0_universal2, macosx_11_0_x86_64, manylinux_2_17_aarch64, manylinux_2_17_x86_64, win_amd64}`, no cp38 or cp313+ wheels present, `requires_python: null`.

### A10. Slow/flaky classroom network making installs look hung
**Status:** Already documented (Step 5) at a conceptual level. Concrete addition: the actual warning text pip prints when a download is timing out (vs. truly hung), plus the documented flag to give installs more slack.
- **Symptom (exact text students may see, not necessarily a hang):**
  ```
  WARNING: Retrying (Retry(total=4, connect=None, read=None, redirect=None, status=None)) after connection broken by
  'ReadTimeoutError("HTTPSConnectionPool(host='pypi.org', port=443): Read timed out. (read timeout=15)")'
  ```
  This is pip *actively retrying*, not frozen — the terminal just looks idle between attempts.
- **Cause:** pip's per-request read timeout defaults to a value tuned for normal broadband; a loaded classroom network (dozens of students installing the same ~30–50 MB mediapipe wheel simultaneously) can exceed it repeatedly.
- **Fix:** `pip install --timeout 120 opencv-python mediapipe==0.10.14 numpy` raises the read timeout; official env var equivalent is `PIP_TIMEOUT=120`.
- **Source:** [pip docs — configuration](https://pip.pypa.io/en/stable/topics/configuration/) — quote: *"`PIP_TIMEOUT=60` is the same as `--timeout=60`"*.

### A11. Corporate/school antivirus quarantining installed packages or blocking the install — **genuine gap, researched**
Two distinct failure shapes, worth separating on a troubleshooting page because they have different fixes:

**A11a — TLS-inspecting network/security appliance breaks `pip install` outright (more likely in a school than actual quarantine of the packages themselves):**
- **Symptom:** `pip install` fails immediately, not after a download attempt, with:
  ```
  SSLError: HTTPSConnectionPool(host='pypi.org', port=443): Max retries exceeded ... [SSL: CERTIFICATE_VERIFY_FAILED] certificate verify failed: unable to get local issuer certificate
  ```
- **Cause:** School/corporate networks commonly run TLS-inspecting proxies (Zscaler, Palo Alto, Bluecoat, or a school-deployed content filter) that intercept HTTPS to PyPI and re-sign it with the organization's own root certificate. Python's bundled `certifi` trust store doesn't know about that private root, so certificate validation fails — this is not a broken install, it's an untrusted-middleman connection.
- **Fix:** The correct fix is making pip trust the organization's root CA (e.g., `pip config set global.cert <path-to-org-root-CA.pem>`, or on Windows, installing `python-certifi-win32` so pip uses the same trust store as the browser, which already trusts the school's certificate). Modern pip (24.2+ on Python 3.10+) validates against the OS trust store by default, which fixes this automatically if the machine already trusts the school's root CA — worth telling students to first try upgrading pip (`python -m pip install --upgrade pip`). Using `--trusted-host pypi.org` bypasses verification and works, but is a workaround, not the "correct" fix, and is worth a caution rather than a default recommendation.
- **Source:** **[community-sourced / best-effort]** — the mechanism (TLS-inspecting proxies + `certifi`) is standard, well-documented behavior of how Python's TLS stack and pip's cert bundle work, but no single Anthropic/Python/pip primary source packages this exact classroom scenario end-to-end; synthesized from pip's own trust-store behavior notes and widely corroborated community reporting.

**A11b — Antivirus quarantining an *actual installed file* (rarer for this course's specific packages):**
- **Symptom:** `import cv2` or `import mediapipe` fails after a seemingly successful install, or Windows Defender/AV pop-up names a file inside `venv/Lib/site-packages/` as a threat and removes it.
- **Cause:** This is a much more common problem for **PyInstaller-built executables** (bundled Python apps) than for plain `pip`-installed wheels like `opencv-python`, `mediapipe`, and `numpy` — those are ordinary Python/compiled-extension files, not self-extracting packed executables, so they trigger AV heuristics far less often. If it does happen in this course, it's more likely a locked-down school AV policy scanning and flagging *any* newly-written `.dll`/`.pyd` file generically, not something specific to these packages.
- **Fix:** Check the AV's quarantine log for the exact flagged file; if it's inside `venv/`, restoring/allow-listing that one file (or the whole `venv/` folder) and re-running `pip install` is the fix. Escalate to school IT if AV policy can't be adjusted per-student.
- **Source:** [PythonGUIs — antivirus false positives with PyInstaller](https://www.pythonguis.com/faq/problems-with-antivirus-software-and-pyinstaller/) **[community-sourced / best-effort — no Microsoft Defender or PyPA primary source specifically confirms plain-wheel installs are quarantine-safe; this is inferred from the PyInstaller-specific reporting being the dominant pattern and the absence of comparable reports for plain wheel installs.]**

### A12. General OS-level "permission denied" (macOS Gatekeeper, Windows SmartScreen, Linux execute bit) — **researched, priority assessment requested by ticket**
The ticket specifically asks whether this is a real risk for the *exact* commands this guide has students run: `python --version`, `python -m venv`, `pip install ...`, `python hello_webcam.py`. Verdict after research: **low priority / mostly not applicable to this course**, and the troubleshooting page should say so explicitly rather than over-teaching a rare edge case. Detail:

- **macOS Gatekeeper:** Gatekeeper's "cannot be opened because the developer cannot be verified" dialog is triggered when **macOS launches a quarantined, unsigned application bundle or binary that was downloaded from the internet** (i.e., double-clicking a downloaded `.app`/installer, or running a downloaded standalone binary directly). Running `python3 hello_webcam.py` does **not** trigger this: the student is invoking the already-installed, already-trusted `python3` interpreter on a `.py` text file they wrote themselves — Gatekeeper does not evaluate interpreted script files passed as arguments. The one place Gatekeeper legitimately shows up in this course is when *installing* Python itself from python.org's `.pkg` — that's outside this session's covered command list (installation is assumed pre-done or covered elsewhere) and shouldn't be conflated with running the taught commands.
  - **Source:** [Apple discussions / community documentation on Gatekeeper](https://techpp.com/2024/04/03/cannot-be-opened-because-the-developer-cannot-be-verified-error-mac/) — mechanism confirmed (quarantine attribute + code-signing check on launched application bundles). **[The scoping conclusion — that `python3 script.py` doesn't trigger it — is derived from how Gatekeeper's quarantine/launch-services check is documented to apply to executed application bundles/binaries, not interpreter arguments; not from a single Apple primary-source sentence naming this exact scenario.]**
- **Windows SmartScreen:** SmartScreen's "Windows protected your PC" screen triggers on launching an **unsigned, internet-downloaded executable** (an `.exe`/`.msi` carrying the Mark-of-the-Web). `python.exe hello_webcam.py` runs the pre-installed interpreter against a local script the student wrote in-editor (never downloaded, never carries Mark-of-the-Web) — SmartScreen does not intercept this. Same caveat as Gatekeeper: the one legitimate SmartScreen moment in this course is the *Python installer .exe itself* from python.org, which is upstream of this session's scope.
  - **Source:** [Microsoft Q&A / SmartScreen behavior](https://learn.microsoft.com/en-us/answers/questions/5909311/windows-protected-your-pc-microsoft-smartscreen-bl) — confirms SmartScreen targets unsigned/untrusted executables, and separately confirms (Microsoft's own PowerShell execution-policy docs) that *"scripts written on the local computer don't require digital signatures"* for execution — reinforcing that locally-authored scripts aren't the target of this warning.
- **Linux execute-bit:** Only relevant if a student runs a script directly as `./hello_webcam.py` (which requires both a shebang line and `chmod +x`). This guide's taught invocation is always `python hello_webcam.py` — Python is invoked explicitly as the interpreter, so the execute bit on the `.py` file is never consulted by the OS at all.
  - **Source:** Standard, uncontested Unix behavior (`chmod`/exec semantics) — not something requiring a citation beyond POSIX conventions.
- **Recommendation for the troubleshooting page:** Include this as a short "you probably won't hit this" note rather than a full scenario page, explicitly naming *why* (interpreter invocation vs. launching a downloaded executable), so a curious student who's heard of Gatekeeper/SmartScreen isn't left wondering why the course doesn't mention it.

### A13. Camera permission dialogs
**Status:** macOS ("Terminal would like to access the camera" behind other windows) already documented (Step 7). Windows camera privacy settings were not yet covered — filling that gap:

- **Symptom:** `cap.isOpened()` returns `False` (or the `RuntimeError("Could not open camera...")` from the guide's own `hello_webcam.py`) even though Device Manager shows the webcam working fine and no other app has it open.
- **Cause:** Windows' camera privacy settings can block **specific apps** (and, on locked-down/managed school images, can block desktop apps or all apps) from using the camera even though the camera itself is enabled.
- **Fix:** Settings → Privacy & security → Camera → confirm "Camera access" is on, and "Let apps access your camera" (and specifically "Let desktop apps access your camera," which governs the Python process) is enabled.
- **Source:** **[community-sourced / best-effort]** — the Windows Settings path and toggle names are consistent across widely corroborated troubleshooting write-ups; no single Microsoft primary-source page was fetched confirming this exact OpenCV interaction, but the privacy-settings location and behavior match Microsoft's documented camera privacy feature generally.

---

## Category B — Android / adb / USB-debugging (host OS-independent)

### B1. adb not installed / not on PATH
**Status:** Already documented (Step 6). Confirmed accurate, not duplicated.

### B2. Phone not detected by adb at all (missing OEM driver) — **deepened with per-brand + Linux specifics**
**Status:** Documented at a summary level ("install the OEM USB driver for your phone brand"). Deepened here with the actual per-brand sources and a Linux-specific requirement the existing content doesn't mention at all.

- **Symptom:** `adb devices` prints an empty list (`List of devices attached` with nothing under it) even though the phone is plugged in and USB debugging is on; on Windows, Device Manager shows the phone under "Other devices" with a yellow warning icon instead of under "Android Device"/"Portable Devices."
- **Cause (Windows):** No matching USB driver bound to the device's ADB interface. Windows doesn't ship every OEM's driver by default.
- **Fix (Windows), verified against Android's own driver index page:**
  - Samsung: [Samsung's official Android USB driver for Windows](https://developer.samsung.com/galaxy/others/android-usb-driver-for-windows)
  - Google Pixel / Nexus: [Google USB driver](https://developer.android.com/studio/run/win-usb) (bundled with Android Studio, or standalone)
  - Xiaomi: Xiaomi's own driver download page (linked from Android's OEM driver index)
  - Generic fallback for any brand: Device Manager → right-click the flagged device → Update driver → "Browse my computer for driver software" → point at the extracted `usb_driver\` folder.
  - **Source:** [Android Developers — Install OEM USB drivers](https://developer.android.com/studio/run/oem-usb) — lists Samsung, Google, Xiaomi (and Acer, Asus, HTC, Huawei, Lenovo, LG, Motorola, Sony, ZTE, etc.) with direct driver links, plus step-by-step Device Manager instructions for Windows 10/11.
- **Cause (Linux) — not previously covered at all:** Even with USB debugging on, a non-root user may lack permission to access the USB device node, independent of any "driver."
  - **Fix (Linux):** add the user to the `plugdev` group and install udev rules for Android devices:
    ```bash
    sudo usermod -aG plugdev $LOGNAME
    sudo apt-get install android-sdk-platform-tools-common
    ```
    then unplug/replug the phone (or log out/in for the group change to take effect).
  - **Source:** [Android Developers — Run apps on a hardware device](https://developer.android.com/studio/run/device) — quote: *"Add user to `plugdev` group: `sudo usermod -aG plugdev $LOGNAME`"* and *"Install `udev` rules: `apt-get install android-sdk-platform-tools-common`"*.
- **macOS:** No additional driver/config needed — confirmed by the same official page (*"macOS & ChromeOS: No additional configuration required"*).

### B3. USB debugging authorization prompt not appearing, or "Always allow" not offered — **genuine gap, researched**
- **Symptom:** `adb devices` shows the device as `unauthorized` instead of `device`:
  ```
  List of devices attached
  R58N90ABCDE     unauthorized
  ```
  ...and no "Allow USB debugging?" dialog ever appeared on the phone to accept.
- **Cause (most common):** The phone's USB connection mode is set to "Charging only" — on many Android versions the RSA-key authorization dialog only surfaces when the USB mode is File Transfer (MTP) or PTP, not charge-only, and/or the phone's screen was locked at the moment of connection (the dialog requires the device to be unlocked to display).
- **Fix:**
  1. Unlock the phone's screen.
  2. Pull down the phone's USB notification and change the mode to "File transfer" (or PTP) instead of "Charging."
  3. Unplug and replug the cable so adb re-triggers the authorization handshake.
  4. If still stuck with no dialog and no "Revoke USB debugging authorizations" option to reset from: on the PC, delete `~/.android/adbkey` and `~/.android/adbkey.pub` (Windows: `%USERPROFILE%\.android\`), then `adb kill-server && adb start-server` and replug — this forces adb to generate a fresh key pair and re-prompt.
  5. As a clean reset from the phone side: Settings → Developer options → **Revoke USB debugging authorizations**, then replug.
- **Source:** Mechanism of the RSA dialog itself is confirmed by [Android Developers — adb docs](https://developer.android.com/tools/adb): *"the system shows a dialog asking whether to accept an RSA key that allows debugging through this computer... it ensures that USB debugging and other adb commands cannot be executed unless you're able to unlock the device and acknowledge the dialog"* (confirms the unlock requirement). The charge-only-mode trigger and adbkey-deletion fix are **[community-sourced / best-effort]** — very widely and consistently reported across multiple independent troubleshooting write-ups, but not stated verbatim on an official Android page in this pass.

### B4. Re-authorization required per new PC
**Status:** Already documented (Step 6: *"Different PC than last time — the 'Allow USB debugging?' prompt reappears... Tap Allow again."*). Confirmed accurate and consistent with the official RSA-key model (each PC has its own keypair, so authorization is inherently per-PC, not global to the phone) — not duplicated further.

### B5. adb bind/listener errors — **confirmed gap, primary focus of Category B research**

This is the deepest gap in current content. Findings below combine (a) the actual `adb --help` output captured directly from this machine's Platform Tools 36.0.0 install, (b) a live-captured error message from running `adb reverse` with no device attached, and (c) cross-referenced GitHub issue reports (React Native, Appium, Detox, scrcpy) for the exact error text students encounter in the wild, since Android's own docs don't enumerate these specific error strings.

**B5a — `adb.exe: error: cannot bind to socket` / `cannot bind listener: Address already in use`**
- **Symptom (exact text, widely and consistently reported):**
  ```
  adb.exe: error: cannot bind listener: 'tcp:8080': Address already in use
  ```
  or (older adb releases):
  ```
  error: cannot bind to socket: Address already in use
  ```
- **Cause:** `adb reverse REMOTE LOCAL` asks the phone to accept connections on `REMOTE` (the port your script's `CAM_SOURCE` URL expects, `tcp:8080` in this course) and relay them, through the adb server, to `LOCAL` on the PC. This fails specifically when the *device side* already has a reverse binding registered on that same remote port — which happens when:
  1. A **previous `adb reverse tcp:8080 tcp:8080` from an earlier session is still registered** on the phone and wasn't cleanly torn down (most common after an unclean unplug or an adb server crash) — see B5c below.
  2. **Another tool on the same PC is also using port 8080 with adb**, most often: Android Studio's bundled adb (a *different* adb binary/version than the standalone Platform Tools one, which can run its own server instance and hold conflicting state), `scrcpy` (which itself uses `adb reverse`/`forward` internally for some connection modes), Genymotion, or another IP-camera/streaming tool a student installed previously and forgot about.
  3. Less commonly, a completely unrelated local process (some other dev server, or another instance of IP Webcam-style software) is bound to `tcp:8080` on the **host** side.
- **Fix:**
  ```bash
  adb kill-server
  adb start-server
  adb reverse tcp:8080 tcp:8080
  ```
  If that doesn't clear it, check what's actually holding the port on the PC:
  - Windows: `netstat -ano | findstr :8080` → note the PID in the last column → `tasklist /fi "PID eq <pid>"` to identify it → `taskkill /PID <pid> /F` to free it (run Command Prompt as Administrator).
  - macOS/Linux: `lsof -i :8080` → `kill <pid>` (or `lsof -ti :8080 | xargs kill` as a one-liner).
  If another Android tool (Android Studio, scrcpy) is the culprit, closing that tool (which usually calls `adb reverse --remove-all` or kills its own adb server on exit) resolves it; if it doesn't clean up after itself, `adb reverse --remove-all` (below) clears everything regardless of which tool created it.
- **Source:** Mechanism (`adb reverse REMOTE LOCAL` semantics, default rebind behavior) verified from `adb --help` (captured locally, Platform Tools 36.0.0): *"reverse [--no-rebind] REMOTE LOCAL / reverse socket connection using: tcp:<port>..."* and *"reverse --remove-all"*. The exact error string and its common triggers (stale reverse entries, conflicting tools) are **[community-sourced]**, cross-referenced across multiple independent reports: [facebook/react-native#26247](https://github.com/facebook/react-native/issues/26247), [microsoft/vscode-react-native#2471](https://github.com/microsoft/vscode-react-native/issues/2471), [appium/appium#5882](https://github.com/appium/appium/issues/5882) — Android's own adb documentation does not enumerate this error text.

**B5b — `error: more than one device/emulator`**
- **Symptom (exact text, confirmed by official docs):**
  ```
  adb: more than one device/emulator
  ```
  (Windows builds typically prefix this `adb.exe:` instead of `adb:`.) This can surface specifically on `adb reverse tcp:8080 tcp:8080` if more than one device/emulator is attached, since the command has no target specified and adb can't guess which one to apply the reverse mapping to.
- **Cause:** More than one device is visible to the adb server at once — most relevantly for this course: a student (or the instructor's shared lab image) also has an Android Studio emulator (AVD) running in the background, or two phones plugged in, or a phone still shows up as a stale/offline entry from a previous session alongside the currently-connected one.
- **Fix:**
  1. `adb devices` to see the full list and every serial number.
  2. Target the specific device explicitly: `adb -s <serial> reverse tcp:8080 tcp:8080` (find `<serial>` from step 1's output).
  3. Or, close whichever extra device/emulator isn't needed (e.g., close the Android Studio emulator window) so only the phone remains.
  4. Alternatively, set `$ANDROID_SERIAL` once per session to avoid needing `-s` on every command.
- **Source:** [Android Developers — Android Debug Bridge (adb)](https://developer.android.com/tools/adb): *"If you issue a command without specifying a target device when multiple devices are available, `adb` displays an error 'adb: more than one device/emulator'"* and *"you can set the `$ANDROID_SERIAL` environment variable to contain the serial number"*. `-s SERIAL` flag confirmed directly from `adb --help` (captured locally): *"-s SERIAL   use device with given serial (overrides $ANDROID_SERIAL)"*.

**B5c — Stale `adb reverse` tunnels surviving a phone replug**
- **Symptom:** The tunnel worked last class session; today, `http://localhost:8080/video` fails to open in `hello_webcam.py`/`hand_ar.py` even though IP Webcam clearly shows "Streaming..." on the phone, and re-running `adb reverse tcp:8080 tcp:8080` either silently "succeeds" but still doesn't work, or throws the bind error from B5a.
- **Cause:** `adb reverse` mappings are tied to the live USB session between the adb server and that specific device connection. Unplugging the phone (even briefly) invalidates the tunnel; the reverse mapping is not automatically restored on replug, and in some cases a partially-registered mapping is left in a broken state rather than being cleanly cleared, causing the next `adb reverse` call to collide with it.
- **Fix:** Always re-run `adb reverse tcp:8080 tcp:8080` after any unplug/replug — this is already implied in the existing content's Step 7 troubleshooting note, but should be called out as the *default expectation* every session, not just a rare edge case. To confirm the tunnel's actual current state rather than guessing:
  ```bash
  adb reverse --list
  ```
  which lists every active reverse mapping for the connected device; an empty list confirms the tunnel really did drop. If a broken/duplicate entry is suspected, clear everything and re-establish cleanly:
  ```bash
  adb reverse --remove-all
  adb reverse tcp:8080 tcp:8080
  ```
- **Source:** `reverse --list` and `reverse --remove-all` syntax confirmed directly from `adb --help` (captured locally, Platform Tools 36.0.0). The "reverse mappings don't survive a USB replug" behavior is **[community-sourced]** but consistently reported: [tranvuongquocdat/SideScreen#18](https://github.com/tranvuongquocdat/SideScreen/issues/18) (reverse tunnel lost after a disconnect/reconnect cycle, fixed by re-running the reverse command) and general adb community troubleshooting guidance to `adb kill-server`/restart when reconnect state gets stuck.

**B5d — Conflicts with other tools that also use adb ports (Android Studio, emulators, scrcpy, Genymotion, other IP-camera software)**
- **Symptom:** Any of B5a/B5b's symptoms, specifically appearing only on lab PCs that have Android Studio or other Android tooling pre-installed (as opposed to a bare Platform-Tools-only machine).
- **Cause:** Android Studio bundles its own copy of `adb.exe` (often a different version than a separately-downloaded Platform Tools copy) and will auto-start its own adb server / auto-launch AVD emulators, which register as additional adb devices and can hold their own port reservations. scrcpy and Genymotion behave similarly — they're all separate consumers of the same single adb server (port 5037) and the same device-side port space, not aware of each other.
- **Fix:**
  1. `adb devices -l` first, always, to see everything currently attached/registered before assuming a fresh phone-only state.
  2. If Android Studio is installed on a lab machine, close it (or at minimum ensure no AVD emulator is running) before the `adb reverse` step.
  3. `adb kill-server` forces a full reset that clears every tool's registered state through that one server, since all these tools share the same server process — after which restarting *only* the intended tool (in this course's case, just running `adb reverse` again) avoids picking up leftover state from the others.
- **Source:** Shared-server architecture (*"all `adb` clients use port 5037 to communicate with the `adb` server"*) confirmed from [Android Developers — adb](https://developer.android.com/tools/adb). The specific claim that Android Studio bundles its own adb binary version is **[community-sourced / best-effort]** — widely reported in scrcpy/React Native troubleshooting threads (e.g., version-mismatch errors when "using several ADB versions simultaneously") but not itself an Android-official statement in the pages fetched for this research.

**Live verification performed for this research:** running `adb reverse tcp:8080 tcp:8080` on this machine with no phone attached produced:
```
adb.exe: no devices/emulators found
```
confirming that a clean "no device" state produces a distinct, unambiguous error from the bind/listener and multi-device errors above — worth including on a troubleshooting page as the "you forgot to plug the phone in / USB debugging isn't authorized yet" baseline case, distinguishable from B5a-c which all require *some* device to already be visible to adb.

### B6. IP Webcam app: server not starting, stream dropping when phone locks/backgrounds, wrong port
**Status:** Documented only implicitly (Step 6's "Keep screen on" note, Step 7's "confirm the app still shows Streaming"). Deepened:

- **Server not starting / port already in use:**
  - **Symptom:** Tapping "Start server" in the app produces an error or the app doesn't show a reachable address, or `adb reverse tcp:8080 tcp:8080` succeeds but the phone-side server was actually never listening.
  - **Cause:** By default IP Webcam serves on port 8080; if the phone previously ran another server on that port (another instance of the app, or an unrelated app) without releasing it, or a student changed the port in a prior session and forgot, the start can fail or the port won't match what `adb reverse` and `CAM_SOURCE` expect.
  - **Fix:** In the app, before starting the server, check Video preferences → Port is `8080` (matching the course's `CAM_SOURCE`/`adb reverse` convention); if it must be changed for any reason, the `adb reverse` command's *both* port numbers and `CAM_SOURCE`'s URL must all be updated to match — a common source of "it doesn't work" when a student changes one but not the others.
  - **Source:** [IP Webcam developer doc site](https://ip-webcam.appspot.com/static/doc.html) confirms the `http://phone_ip:port/videofeed`-style addressing model. **[community-sourced / best-effort]** for the specific "start server" failure mode and port-mismatch-across-three-places framing — the app's own doc site doesn't cover error conditions in the page fetched.
- **Stream dropping when phone locks/backgrounds:**
  - **Symptom:** Feed freezes or `cap.read()` starts returning `ok=False` mid-session with no code change.
  - **Cause:** Android's background/battery-optimization restrictions can suspend the app's camera/network activity once the screen locks or the app loses foreground focus, unless the app is specifically exempted or uses a foreground service to stay alive.
  - **Fix:** The existing content's "Keep screen on" setting is the primary mitigation (prevents the screen — and by extension the app's foreground state — from locking at all). If drops persist, exempting IP Webcam from battery optimization (Settings → Apps → IP Webcam → Battery → Unrestricted) is the next step.
  - **Source:** **[community-sourced / best-effort]** — general Android background-restriction behavior is confirmed by [Android Developers — Background execution limits](https://developer.android.com/topic/performance/background-optimization), but no primary source specifically documents IP Webcam's own background behavior; synthesized from general Android platform behavior plus widely reported user experience with this class of streaming app.

### B7. DroidCam fallback path specifics
**Status:** Documented at a summary level already (Step 6: "DroidCam (USB mode, free, official Windows client, bundles its own adb)"). Confirmed largely accurate against DroidCam's own help page, with one caveat surfaced by this research:
- **Confirmed:** DroidCam's help page does describe manufacturer-specific driver guidance (Pixel, Samsung, LG) and a USB-mode check (switching the phone off "Charging" mode to PTP if the device isn't detected) — consistent with what the course content implies.
- **Caveat found, not previously flagged:** DroidCam's official help content documents adb-bundling in the context of its **OBS plugin** (`...\obs-plugins\droidcam-obs\adb\`), not explicitly for the **standalone desktop client** path this course's fallback describes. The existing content's claim that the desktop client "bundles its own adb" could not be confirmed or denied from DroidCam's own docs in this pass — worth a light re-verification before shipping this as a confirmed fact on a troubleshooting page, since if the desktop client actually shares the system adb (rather than bundling its own), it would be subject to the exact same B5 port/server conflicts as the IP Webcam path, which is a meaningfully different troubleshooting story.
- **Source:** [DroidCam Help](https://droidcam.app/help/) (official). **[best-effort — the "bundled adb" claim for the desktop client specifically is unverified; only the OBS plugin's bundled adb path is directly confirmed by DroidCam's own docs.]**

### B8. USB cable/port issues (charge-only cables, hub problems) masquerading as driver/adb problems — **genuine gap, researched**
- **Symptom:** `adb devices` shows nothing (or the phone shows only "Charging this device via USB" in its own notification, no data-transfer option offered at all), even after installing the correct OEM driver and enabling USB debugging; in Windows Device Manager, no new device entry appears under any category at all when the phone is plugged in.
- **Cause:** Many USB cables — especially ones bundled with cheap chargers, power banks, or promotional giveaways — are wired for power delivery only and physically lack the two data wires (D+/D−) required for USB data transfer, as distinct from charging. This is indistinguishable from a driver problem by symptom alone (both present as "nothing happens"), which is why it's easy to misdiagnose as an adb/driver issue and waste time reinstalling drivers that were never the problem. USB hubs (especially unpowered or older USB 2.0 hubs) can also cause intermittent detection or timeouts distinct from a straightforward cable fault.
- **Fix:**
  1. Test with a cable known to support data transfer (e.g., one that came with the phone itself, or the cable used for a previous successful class session).
  2. Confirm the phone itself acknowledges a data-capable connection: after plugging in, the phone's notification shade should offer a USB mode choice (File Transfer/MTP, PTP, etc.) rather than only "Charging this device." If only "Charging" is offered with no other option, the cable (or port) doesn't support data.
  3. On Windows, Device Manager should show a **new** entry appear (even if flagged with a warning icon needing a driver) the moment a data-capable cable is plugged in; if nothing changes in Device Manager at all when plugging in, that's the clearest signal it's a cable/port problem, not a driver problem — a driver problem still shows *something* new, just unrecognized.
  4. Plug directly into a rear/motherboard USB port on a desktop lab PC rather than a front-panel port or an unpowered hub, both common weak links in lab hardware.
- **Source:** **[community-sourced / best-effort]** — the charge-only-cable phenomenon (2-wire vs. 4-wire USB cables) is well-established, widely corroborated consumer/hardware knowledge, not sourced from an Android or USB-IF primary-source page in this pass. The Device Manager diagnostic heuristic (something appears vs. nothing appears) is inferred from how Windows device enumeration works generally, not stated verbatim in a fetched primary source.

---

## Summary of scenario counts

**Category A — Python / pip / venv:** 13 scenarios (A1–A13)
- Already documented, confirmed accurate, not duplicated: A1, A4, A6, A7 (4)
- Already documented, light gap-fill/precision added: A2, A3, A5, A8, A10 (5)
- Genuine gaps, researched from scratch: A9 (deepened significantly — the highest-value single fix in Category A), A11 (two sub-scenarios), A12 (priority assessment as requested — concluded low-priority/mostly N/A, with reasoning), A13 (Windows half of camera permissions) (4 gap entries, one with 2 sub-scenarios)

**Category B — Android / adb / USB-debugging:** 8 scenarios (B1–B8), with B5 containing 4 sub-scenarios (B5a–B5d)
- Already documented, confirmed accurate, not duplicated: B1, B4 (2)
- Already documented, deepened with new specifics: B2 (per-brand + Linux udev/plugdev), B6 (IP Webcam specifics), B7 (DroidCam — confirmed with one caveat flagged) (3)
- Genuine gaps, researched from scratch: B3 (authorization prompt), **B5 (adb bind/listener errors — the confirmed primary gap, 4 sub-scenarios plus a live-captured baseline error)**, B8 (cable/port issues) (3 gap entries, B5 being the largest)

All claims are sourced inline per scenario; items without an official primary source are explicitly marked **[community-sourced / best-effort]** rather than presented as confirmed fact, per the ticket's instruction.
