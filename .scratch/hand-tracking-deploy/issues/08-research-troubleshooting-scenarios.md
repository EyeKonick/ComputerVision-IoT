Type: research
Status: closed
Blocked by: (none)

## Question

Catalog, exhaustively and accurately, every realistic failure scenario a true Python-beginner student could hit while working through the Setup & Environment session (`content/01-setup-environment.md`, Steps 1–6) and, where genuinely session-specific, Hand Tracking Session 1 (`content/02-hand-session-1-webcam-loop.md`) — for the purpose of building dedicated, per-symptom/category troubleshooting pages (see [Troubleshooting UX scope & navigation model](07-troubleshooting-ux-scope.md) for the resolved design decisions this feeds).

Organize findings into the two categories the build will use:

**Category A — Python / pip / venv (Windows, macOS, Linux)**
- Python not installed, not on PATH, or the Microsoft Store stub shadowing it (Windows)
- Multiple Python installs / wrong one active
- `python` vs `python3` vs `py` launcher differences across OSes
- `venv` module missing on minimal Linux installs
- PowerShell execution-policy blocking `Activate.ps1`, and the exact safe fix
- Forgetting to activate / activating in a new terminal tab and not noticing
- VS Code interpreter mismatch (terminal activated correctly but Run button uses a different interpreter)
- OneDrive-synced (or other cloud-synced) project folders causing lock/permission errors on Windows
- `pip install` failing due to Python version too new for `mediapipe==0.10.14`'s published wheels (and how a student actually diagnoses this vs. other install failures)
- Slow/flaky classroom network making installs look hung vs. actually failing
- Corporate/school antivirus quarantining installed packages or blocking the install
- General OS-level "permission denied" running python scripts (macOS Gatekeeper on unsigned/downloaded scripts, Windows SmartScreen, Linux execute-bit issues) — distinct from the execution-policy issue above, and confirm whether this is a real, common failure mode for the exact commands this guide has students run (`python --version`, `python -m venv`, `pip install`, `python hello_webcam.py`) or a lower-priority edge case
- Camera permission dialogs (macOS "Terminal would like to access the camera" appearing behind other windows; Windows camera privacy settings blocking access)

**Category B — Android / adb / USB-debugging (host OS-independent)**
- adb not installed / not on PATH (Android Platform Tools)
- Phone not detected by adb at all (missing OEM USB driver, per-brand notes for at least Samsung/Google Pixel/Xiaomi)
- USB debugging authorization prompt not appearing, or "always allow" not offered
- Re-authorization required per new PC (already documented — confirm and don't duplicate)
- **adb bind/listener errors** — confirmed gap in current content: `error: cannot bind to socket`, `Address already in use`, `more than one device/emulator`, stale `adb reverse` tunnels surviving a replug, conflicts with other tools also using adb (Android Studio, emulators, scrcpy, other IP-camera tools) — real causes and the actual fix commands (e.g. `adb kill-server` / `adb start-server`, `adb devices` to check for duplicates, freeing the port)
- IP Webcam app: server not starting, stream dropping when phone locks/backgrounds, wrong port
- DroidCam fallback path specifics (already partially documented — confirm current accuracy, Windows client version behavior)
- USB cable/port issues (charge-only cables, hub problems) masquerading as driver/adb problems

For each scenario: the concrete symptom/error text a student would actually see, the real cause, and the fix — accurate enough to ship verbatim, not generic advice. Prefer official docs (Android's adb documentation, Python/pip/venv official docs, mediapipe's supported-platforms notes) as primary sources; note anything you couldn't verify from a primary source as such rather than guessing.

Save findings as a Markdown research doc at `.scratch/hand-tracking-deploy/research/troubleshooting-scenarios.md`, organized by the two categories above (matching how the built pages will be organized per [ticket 07](07-troubleshooting-ux-scope.md)'s decision #6), so [ticket 09](09-prototype-troubleshooting-pages.md) and [ticket 10](10-build-troubleshooting-pages.md) can consume it directly.

## Answer

Delivered at [`research/troubleshooting-scenarios.md`](../research/troubleshooting-scenarios.md) — 13 Category A (Python/pip/venv) scenarios and 8 Category B (Android/adb/USB) scenarios (B5 expanded into 4 sub-scenarios), each with concrete symptom text, verified cause, and shippable fix. Sourced against primary docs (Android Developers adb/OEM-driver/device-connection pages, Python's official Windows/py-launcher docs, pip's official config docs, mediapipe's live PyPI JSON metadata, and a live local capture of `adb --help`/real error output from this machine's own Platform Tools install); everything not confirmable against a primary source is explicitly tagged `[community-sourced / best-effort]` rather than stated as fact.

Highlights beyond what existing content already covered:
- **A9 (mediapipe wheel mismatch)** deepened to an exact fact: mediapipe 0.10.14 only ships wheels for CPython 3.9–3.12 (confirmed via PyPI's own JSON metadata) — pins down precisely when/why `pip install mediapipe==0.10.14` fails with no matching distribution.
- **A12** directly answers the ticket's priority question: Gatekeeper/SmartScreen/exec-bit are **not real risks** for this course's exact taught commands (`python`, `pip install`, `python hello_webcam.py`) — recommended as a short reassurance note, not a full scenario.
- **B5 — the confirmed adb bind/listener gap** — now the deepest section in the doc: `cannot bind to socket`/`Address already in use`, `more than one device/emulator`, stale reverse tunnels after replug, and conflicts with Android Studio/scrcpy/Genymotion sharing the same adb server — each with real fix commands (`adb kill-server`, `adb reverse --list`/`--remove-all`, `adb -s <serial>`, port-freeing via `netstat`/`lsof`).
- **B8 (charge-only cables)** — a previously undocumented failure mode that's easy to misdiagnose as a driver problem.
- One flagged caveat for a later ticket to re-verify: the existing content's claim that DroidCam's desktop client "bundles its own adb" is unconfirmed by DroidCam's own docs (only the OBS-plugin path is confirmed) — if false, the DroidCam fallback would actually share B5's port-conflict risks.

Ready for [ticket 09](09-prototype-troubleshooting-pages.md) to mock up against real content.
