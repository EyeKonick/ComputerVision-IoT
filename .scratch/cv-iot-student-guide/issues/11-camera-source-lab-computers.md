Type: research
Status: resolved
Blocked by: (none)

## Question

Lab computers have **no built-in webcam** and the room has **no WiFi** — only wired Ethernet for internet. Students on lab PCs need their **Android phone, connected by USB cable**, to act as the camera source for `cv2.VideoCapture` in both `hand_ar.py` and `face_tracker.py`. Students with their own laptops can keep using the laptop's built-in webcam as today.

Research the easiest, most reliable way to get an Android phone's camera into OpenCV as a `cv2.VideoCapture` source over a **USB cable, with no WiFi/LAN available** (so the syllabus's own "IP Webcam app over WiFi/hotspot" approach, per Module 3, is not usable here). Investigate and compare, for classroom scale (~20–30 students setting this up simultaneously, ideally in under a few minutes each, repeatably every session):

- USB-tethering + a phone camera app that exposes a virtual webcam (e.g. DroidCam USB mode, Iriun Webcam USB mode, EpocCam) — does the phone app's virtual webcam show up as a normal OpenCV-readable device index or DirectShow device on Windows?
- `adb reverse` port-forwarding combined with a phone HTTP MJPEG-streaming app (e.g. IP Webcam) — phone connects via USB only, `adb reverse tcp:8080 tcp:8080` (or similar) makes the phone's HTTP stream reachable at `localhost` on the PC with zero WiFi/LAN involved, and `cv2.VideoCapture("http://localhost:8080/video")` reads it.
- Any native Android "USB Video Class (UVC)" camera-share capability that doesn't require installing a phone-side app at all.
- Any other viable low-setup-friction option.

For each candidate: exact setup steps (phone side + Windows PC side), required software installs, per-student repeatability/reliability at classroom scale, latency and frame-rate quality, and known failure modes (driver issues, USB debugging prompts, Android version/OEM quirks, Windows driver signing, antivirus/firewall interference).

**Recommend one default path** for lab-PC students (with fallback if the top pick fails), confirm it coexists cleanly with the existing laptop-webcam path (`cv2.VideoCapture(0)`), and note anything that changes about how `hello_webcam.py` (from the already-resolved Setup & Environment session) or the webcam-opening code in `hand_ar.py`/`face_tracker.py` needs to look to support both paths via one shared, simple mechanism (e.g. a `CAM_SOURCE` config value that's either a device index or a URL).

Capture findings as a markdown file in the repo per the `/research` skill's convention.

## Answer

Full findings: [`research/camera-source-lab-computers.md`](../research/camera-source-lab-computers.md).

**Recommended default:** `adb reverse tcp:8080 tcp:8080` + the "IP Webcam" Android app, read via `cv2.VideoCapture("http://localhost:8080/video")` — no kernel-level driver install required on any lab PC (unlike DroidCam/Iriun/Camo, which install a DirectShow/UVC driver that locked-down school AV/IT images are prone to block), only Google's own `adb.exe`. **Documented fallback:** DroidCam USB mode.

**Implemented:** both `source code/hand-tracking/hand_ar.py` and `source code/facial-recognition/face_tracker.py` now read a single `CAM_SOURCE` config value (`int` device index for laptop webcams, `str` URL for the phone-over-USB path) instead of a hardcoded index, via one `isinstance` branch — replacing `hand_ar.py`'s old `CAM_INDEX` and `face_tracker.py`'s old dual-fallback `cv2.VideoCapture(0, ...)` logic.

**Retroactively revised:** the already-closed [Setup & Environment session](../issues/01-setup-environment-session.md) — added a new Step 6 ("Set up your camera source: laptop webcam or phone over USB") covering both paths end to end, and updated the former Step 6 ("Hello, Webcam," now Step 7) to use the same `CAM_SOURCE` pattern so students meet it once here before seeing it again in every later session.
