Type: prototype
Status: resolved
Blocked by: (none)

## Question

Draft the full teaching content for the **Setup & Environment** class session — the lead-in before either activity starts.

Cover, at small logical-chunk granularity, one step at a time:
- Installing Python and confirming it's on PATH
- Creating and activating a virtual environment (`venv`)
- `pip install`-ing the two activities' dependencies (see `source code/hand-tracking/requirements.txt` and `source code/facial-recognition/requirements.txt` — note the `mediapipe==0.10.14` pin in the facial-recognition one and flag it)
- A minimal "Hello, Webcam" check: open `cv2.VideoCapture`, show one frame, confirm the camera works — the smallest possible thing that proves the environment is ready, before either real script begins

For each step: what the instructor says/does, what command or code students type, why it matters, and common problems (e.g. `python` vs `python3` on different OSes, PATH not updated without a terminal restart, venv not activated so pip installs globally, camera permission prompts on Windows/macOS, `pip install mediapipe` failing on unsupported Python versions).

Output the full drafted content as this ticket's answer, ready for the instructor to review and correct.

## Answer

Full drafted content: [`content/01-setup-environment.md`](../content/01-setup-environment.md) — 6 steps (confirm Python/PATH → create venv → activate venv → verify activation → install pinned dependencies → "Hello, Webcam" check script), each with instructor narration, exact commands/code, why-it-matters, and common problems.

Instructor review resolved one open item: the mediapipe version mismatch between the two activities' `requirements.txt` files. Fixed in the repo — `source code/hand-tracking/requirements.txt` now pins `mediapipe==0.10.14`, matching `source code/facial-recognition/requirements.txt`. The other two review questions (camera-index gotcha wording, example folder name) drew no objection, so the draft stands as written.

**Amendment (glossary pass):** every step now has a "New in this step" section — a short, plain-language, non-technical definition for each new built-in function/symbol/concept the step introduces (e.g. `python --version`, virtual environment, `pip install`, `adb reverse`, `cv2.VideoCapture`), placed after the code and before "Why it matters." Format approved via the Fable mockup for the deploy effort; applied here across all 7 steps.

**Amendment (Path B corrected — adb forward, not reverse):** Step 6's phone-over-USB path had the tunnel direction backwards. `adb reverse` opens its listener on the *phone's* port 8080, which IP Webcam's own server already occupies once streaming starts — so it fails with "address already in use" every time, not intermittently. Corrected to `adb forward` (listener on the PC side, which is free). Also folded in real debugging-toggle-order and screen-timeout gotchas surfaced by hands-on testing: USB debugging must be enabled *after* the cable is plugged in (then unplug/replug once) or it doesn't reliably stick on some phones; the fingerprint authorization dialog is a distinct popup from the Charging/File Transfer mode picker, which caused confusion; and the stream can drop mid-class from screen lock unless both IP Webcam's "Keep screen on" and Developer Options' "Stay awake while charging" are enabled. Common-problems list expanded accordingly, and the `adb reverse`→`adb forward` fix applied everywhere it recurred: this file, the deployed app's `00-setup.ts` and `01-hand-session-1.ts`, the troubleshooting sub-page's `adb-bind-listener-error` scenario, and the `CAM_SOURCE` comment in both `hand_ar.py` and `face_tracker.py`. Source: instructor-supplied runbook from a live debugging session (six incidents, in order, from bare adb install through the port-direction bug).
