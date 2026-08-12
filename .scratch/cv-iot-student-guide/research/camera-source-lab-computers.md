Resolves ticket: Camera source for lab computers (.scratch/cv-iot-student-guide/issues/11-camera-source-lab-computers.md)

# Android phone as `cv2.VideoCapture` source over USB, no WiFi/LAN

## Constraints recap

- Lab Windows PCs: no built-in webcam, no WiFi, wired Ethernet only.
- Students use their own Android phone via USB cable as the camera.
- ~20-30 students, simultaneous setup, target a few minutes each, repeatable every session.
- Laptop students keep `cv2.VideoCapture(0)` unchanged.
- Current code: `hand_ar.py` has `CAM_INDEX = 0` → `cv2.VideoCapture(CAM_INDEX, cv2.CAP_DSHOW)`; `face_tracker.py` has `cv2.VideoCapture(0, cv2.CAP_DSHOW)` with a fallback to `cv2.VideoCapture(0)`.

---

## 1. USB-tethering virtual-webcam apps

### DroidCam (Dev47Apps)

- **USB works without WiFi**: yes. The official connect/help docs describe USB as a first-class transport, and explicitly recommend it as "the workaround" when a network has firewalls/VPNs blocking the WiFi path — i.e. it's a documented, supported no-network mode, not a hack. [DroidCam Connect](https://www.dev47apps.com/droidcam/connect/), [DroidCam Help](https://www.dev47apps.com/droidcam/help/)
- **Phone side**: enable Developer Options (tap Build Number x7) and turn on USB Debugging, install the DroidCam app from Play Store, connect the USB cable, accept the "Allow USB Debugging" RSA-key prompt on the phone. [DroidCam Connect](https://www.dev47apps.com/droidcam/connect/)
- **PC side**: install the DroidCam Windows Client (Windows 10/11, x64 or ARM64) from the official site. In the client, pick the USB connection option and click refresh/Start. USB mode is implemented via a bundled `adb.exe` (ships under `Program Files (x86)\DroidCam\adb`) that DroidCam manages internally — students do not need to separately install or configure ADB. [DroidCam Windows Client](https://droidcam.app/windows/), [DroidCam Help](https://www.dev47apps.com/droidcam/help/)
- **Windows driver / device registration**: after client install, DroidCam registers a standard video capture (DirectShow-class) device that shows up as "DroidCam" in Zoom/Teams/Skype/OBS — i.e. exactly the kind of device `cv2.VideoCapture(N)` / `cv2.VideoCapture(N, cv2.CAP_DSHOW)` can open by index once you find its index (or open via `cv2.CAP_DSHOW` and enumerate). [DroidCam Windows Client](https://droidcam.app/windows/)
- **Cost for USB use case**: USB connectivity itself is available in the free tier; there is no paywall specifically gating the USB transport. The paid DroidCamX/Pro upgrade instead unlocks things like HD-watermark removal and remote camera controls. Free tier supports up to 1080p / configurable FPS (documented default recommendation is 1280x720). [DroidCam Help](https://www.dev47apps.com/droidcam/help/)
- **Known failure modes**:
  - If the PC doesn't detect the phone over USB, phone-specific OEM USB drivers (Samsung, OnePlus, Pixel/Google, etc.) may need manual install — links provided in DroidCam docs. [DroidCam Connect](https://www.dev47apps.com/droidcam/connect/)
  - Antivirus/firewall software (Avast Web Shield, AVG Web Protection, Windows Defender Real-Time/Network Protection) has been reported to interfere with DroidCam's driver install or connection; DroidCam's own help page documents per-vendor workarounds. On locked-down school-managed PCs this is a real risk. [DroidCam Help](https://www.dev47apps.com/droidcam/help/)
  - "ADB.exe not found" errors occur if the bundled adb folder under the DroidCam Program Files install got removed/quarantined (plausible if antivirus flags it). [DroidCam Help](https://www.dev47apps.com/droidcam/help/)
  - Missing/wrong OEM USB driver is the most common day-one failure for a new phone model.

### Iriun Webcam

- **USB works without WiFi**: yes — advertised as connect "wirelessly over Wi-Fi or use a USB cable for extra stability and lower latency." [iriun.com](https://iriun.com/)
- **PC side**: install the free Iriun Windows desktop app/driver; it registers the phone as a standard webcam usable in Zoom/Teams/Meet/OBS. [iriun.com](https://iriun.com/)
- **Phone side + USB caveat**: for the USB path, community setup guidance indicates ADB and Android platform-tools need to be present and USB Debugging enabled on the phone (i.e., unlike DroidCam, Iriun does not always bundle its own adb — some guides show installing platform-tools/adb separately). This is a secondary-source claim (search-aggregated), not confirmed on Iriun's own site pages fetched, and should be spot-checked on lab hardware before relying on it. [search aggregation, unverified against iriun.com primary text]
- **Cost**: free version has full basic webcam functionality (no separate USB paywall found); a paid tier adds higher resolution/extra controls. [search aggregation from iriun webcam vendor pages]
- **Verdict for this ticket**: plausible backup, but the ADB dependency for USB specifically is less clearly documented/officially supported than DroidCam's, so it's a secondary rather than primary recommendation.

### EpocCam (Elgato, iOS-focused)

- Elgato's own help center explicitly has an article titled "I have no WiFi available, can I connect with a USB Cable?", confirming USB is a supported no-WiFi path. [Elgato EpocCam Help](https://help.elgato.com/hc/en-us/articles/360048941891-EpocCam-I-have-no-WiFi-available-can-I-connect-with-a-USB-Cable)
- **Not recommended for this ticket**: EpocCam is built and marketed primarily for iPhone (uses Apple's iOS camera driver stack); Windows-side USB connection mode is documented as requiring the "Apple Devices" component from the Microsoft Store, which is Apple-ecosystem tooling, not something that maps cleanly onto Android phones. It is also reported as no longer under active development ("no longer available for new purchase, no further updates"). Excluded from the Android-phone recommendation. [search aggregation of Elgato/EpocCam vendor pages]

### Camo (Reincubate)

- Windows client (Camo Studio) supports USB-connected devices appearing directly in its source dropdown. [Camo — Getting Started](https://camo.com/support/camo/camo-getting-started), [Camo Pricing](https://camo.com/pricing)
- Free edition includes the core webcam pipeline (background modes, framing, filters); the paid Camo Pro IAP gates resolution above the free cap (1080p/4K), not the USB connection itself. [Camo Pricing](https://camo.com/pricing)
- Camo's primary supported phones are iPhones; Android support exists but is less central to their product than DroidCam/Iriun, which are Android-first. Viable fallback, not primary.

---

## 2. `adb reverse` + IP Webcam (HTTP MJPEG) over USB only

This is the "own your own stack" option — no vendor virtual-webcam driver at all, uses Android's official developer tooling.

- **Phone side**: install the free "IP Webcam" app (Pavel Khlebovich, Google Play) — no WiFi needed for this; it just needs to bind an HTTP server to a local port (default 8080). Enable Developer Options + USB Debugging on the phone (Settings → About → tap Build Number x7 → Developer Options → USB debugging). Connect via USB and accept the "Allow USB debugging?" RSA-key authorization dialog. Start the IP Webcam server ("Start server") in the app. [Google Play — IP Webcam](https://play.google.com/store/apps/details?id=com.pas.webcam), [Android Developer Options docs](https://developer.android.com/studio/debug/dev-options)
- **PC side installs**: Android Platform Tools (adb) — the standalone `platform-tools` zip from Google, no full Android Studio required. `adb` ships as a plain executable in `platform-tools/`. [developer.android.com/tools/adb](https://developer.android.com/tools/adb)
- **The bridge**: `adb reverse tcp:8080 tcp:8080` sets up **reverse** port forwarding — it forwards a TCP port opened on the *device* (remote) back to a port on the *host* (local), the direction needed so the phone's own HTTP server (bound to `localhost:8080` on the phone) becomes reachable at `http://localhost:8080` **on the Windows PC**, purely over the USB data line. This is official ADB functionality (`adb reverse REMOTE LOCAL`), separate from `adb forward` (which goes the other direction, host→device). It works over USB (or over `adb` WiFi/TCP debugging, but that's irrelevant here). Reverse forwards are torn down when the device disconnects or the adb server restarts, so this needs to be (re-)run once per session/reconnect — trivial to script. [Android adb.1 manual, AOSP source](https://android.googlesource.com/platform/packages/modules/adb/+/refs/heads/master/docs/user/adb.1.md)
- **URL for OpenCV**: IP Webcam exposes an MJPEG stream at `http://<host>:8080/video` (some docs show `/video?.mjpeg` as an explicit MJPEG hint) which `cv2.VideoCapture(url)` opens directly via OpenCV's FFmpeg backend — this is a widely used, working pattern (`cap = cv2.VideoCapture("http://192.168.x.x:8080/video")` on WiFi setups; with `adb reverse` in place, `"http://localhost:8080/video"` or `"http://127.0.0.1:8080/video"` is the equivalent USB-only URL). A single-JPEG-polling variant also exists at `/shot.jpg` (fetch with `requests` + `cv2.imdecode`, not `VideoCapture`) but `/video` is preferable since it's a real `VideoCapture`-compatible stream. [Hackster.io walkthrough](https://www.hackster.io/peter-lunk/how-to-use-the-android-ip-webcam-app-with-python-opencv-45f28f), [GeeksforGeeks walkthrough](https://www.geeksforgeeks.org/connect-your-android-phone-camera-to-opencv-python/), corroborated by multiple independent tutorials/gists.
- **opencv-python FFmpeg support**: the official `opencv-python` PyPI wheels bundle FFmpeg (confirmed for the platforms including Windows in recent releases), so `cv2.VideoCapture("http://...")` works out of the box without a separate FFmpeg install in the typical case; `cv2.CAP_FFMPEG` can be passed explicitly if backend auto-detection ever picks the wrong one. [OpenCV VideoIO overview](https://docs.opencv.org/3.4/d0/da7/videoio_overview.html)
- **USB debugging authorization persistence**: per Android's own security design, the RSA-key "Allow USB debugging?" prompt is a **per-computer, one-time** authorization — a given phone, once it accepts a given PC's ADB key (with "Always allow from this computer" checked), will not re-prompt on that same PC. It **will** re-prompt if the same phone is plugged into a *different* PC (different key), or if the student later revokes authorizations, or the OS/ADB key changes. In a classroom with fixed seating (same student → same PC every session) this is a one-time nuisance per pairing; with rotating seats it becomes a repeating ~10-second tap every time a student sits at a new machine — worth normalizing in the setup instructions ("tap Allow, check Always allow"). [Android adb docs — device authorization](https://developer.android.com/tools/adb) (RSA key authorization is per-computer, confirmed on official docs); mechanism corroborated further by community docs.
- **Reliability at classroom scale**: strong, because it has no vendor virtual-camera driver to install/sign on 20-30 different Windows machines — only `adb.exe` (a single trusted, well-known Google binary) plus a Play Store app. This significantly reduces the "does antivirus/driver-signing block it on this particular lab image" risk relative to DroidCam/Iriun/Camo, which each install a kernel-level DirectShow/UVC driver.
- **Known failure modes**:
  - Needs OEM USB drivers for `adb` to see some phone models on Windows (same class of issue as DroidCam/Iriun — Google/Samsung/OEM USB driver installs may be required). [developer.android.com/tools/adb](https://developer.android.com/tools/adb)
  - `adb reverse` must be re-run if the phone is unplugged/replugged or the adb server restarts — needs to be part of the per-session startup routine (can be scripted/batched).
  - Phone screen must stay on and the IP Webcam app in foreground with its server running; if the phone auto-locks, the stream drops. IP Webcam has an in-app "keep screen on" option that should be enabled as part of the setup steps.
  - `adb` requires exactly one authorized, connected device per port-forward session; if a student has multiple debug-enabled devices attached it can get ambiguous (`adb -s <serial> reverse ...` disambiguates — unlikely to matter for one phone per student).
  - IP Webcam can be power/thermal-heavy on some devices during extended streaming (community reports vary by device/version); acceptable for short classroom sessions.
  - Corporate/school antivirus is far less likely to flag plain `adb.exe` + an HTTP loopback connection than a new DirectShow/UVC kernel driver, but a security product that blanket-blocks unsigned dev tools could still be an issue — worth a pre-flight check on the actual lab image.

---

## 3. Native Android USB Video Class (UVC) webcam mode (no app)

- **Official support**: Android's own AOSP docs confirm that devices running **Android 14 QPR1 or higher** can act as a UVC (USB Video Class) webcam over the USB cable with **zero phone-side app** — the phone just needs "Webcam" selected under USB preferences (or `adb shell svc usb setFunctions uvc`), and it's picked up by "a wide range of USB hosts... Linux, macOS, Windows, and ChromeOS," including "select it directly from Zoom, Teams, Meet, OBS, etc." with **no additional PC-side driver in many cases**, because it uses the OS's built-in UVC class driver. [source.android.com — Use a device as a webcam](https://source.android.com/docs/core/camera/webcam)
- **Why this is not the recommended default despite being "best case"**: the same official doc says most devices do **not** ship with this feature enabled by default — it requires OEM kernel/driver work and enablement per device, so availability is inconsistent across the fleet of personal phones students will actually bring (only recent, specific Android 14 QPR1+ builds with OEM support). It also notes device-side caveats such as USB 3.0+ cable incompatibility with some hosts on macOS (not relevant to Windows here) and USB 2.0 bandwidth ceilings limiting resolution/FPS. Given a classroom of 20-30 mixed personal Android phones, this cannot be assumed to work universally — but it's worth a 10-second check ("Settings → USB → is there a Webcam option?") as a zero-install first try before falling back to an app-based method. [source.android.com — Use a device as a webcam](https://source.android.com/docs/core/camera/webcam)
- If present, this shows up as a normal Windows camera device — `cv2.VideoCapture(N)` / `cv2.VideoCapture(N, cv2.CAP_DSHOW)` by index, exactly like the laptop-webcam case, no URL needed.

---

## 4. Other options considered

- **scrcpy + OBS**: `scrcpy` (open-source Android screen mirroring over USB/ADB) can mirror the phone's camera preview into a window, which OBS can then capture and re-publish as an OBS Virtual Camera device for `cv2.VideoCapture` to open by index. A dedicated OBS plugin (`scrcpy-camera`, community project) exists to streamline this. This is a valid but heavier chain (scrcpy + OBS + OBS Virtual Camera + an app on the phone to actually drive its camera into the scrcpy `--video-source=camera` mode, added in scrcpy 3.x) — more moving parts than DroidCam or the `adb reverse` route, better suited to a single presenter's demo rig than 20-30 simultaneous student setups. Not recommended as primary/fallback for this ticket, noted for completeness. [scrcpy-camera OBS plugin](https://github.com/NanKillBro/scrcpy-camera), [scrcpy usage guide](https://www.aleksandrhovhannisyan.com/notes/android-camera-obs/)
- **Camo Studio / EpocCam**: covered above under (1); kept as documented fallbacks, not primary, largely because they're iPhone-first products with Android support as a secondary feature.

---

## Recommendation

### Default path for lab-PC students: `adb reverse` + IP Webcam (HTTP MJPEG over `localhost`)

Rationale:
1. **No kernel-level driver install** on 20-30 different lab PCs — only Google's own `adb.exe` (platform-tools) and a Play Store app. This is the single biggest reliability win: DirectShow/UVC virtual-camera drivers (DroidCam, Iriun, Camo) are exactly the kind of unsigned/third-party driver that a locked-down school IT image or antivirus is likely to quarantine or refuse, and that's a per-machine roll of the dice across 20-30 PCs. `adb` + an HTTP loopback connection is much lower-privilege and well-understood by IT.
2. Every step is backed by Google's own developer tooling (`adb`, official reverse-port-forwarding semantics) plus a well-established, widely-documented Android camera-streaming app — this is a "boring, well-trodden path" choice, which matters at classroom scale.
3. It plugs into OpenCV with **zero code branching beyond a URL string** — `cv2.VideoCapture("http://localhost:8080/video")` — no new Python dependencies.
4. USB-debugging authorization is a one-time tap per phone-PC pairing (official Android behavior), so with reasonably stable seating it's a non-issue after week 1; the setup guide should instruct "check Always allow" explicitly.

**Setup steps (documented, to be turned into the student-facing guide)**:

*One-time per phone (first day only):*
1. Settings → About phone → tap "Build number" 7x → enables Developer Options.
2. Settings → Developer Options → enable "USB debugging."
3. Install "IP Webcam" (Pavel Khlebovich) from Google Play.

*Every session:*
1. Plug phone into lab PC via USB cable; on the phone, tap "Allow" (and "Always allow from this computer" the first time at that PC) on the USB debugging prompt.
2. Open IP Webcam app → scroll down → "Start server." Confirm "Keep screen on" is enabled in the app's video preferences so the stream doesn't drop if the phone would otherwise sleep.
3. On the PC (one-time install of platform-tools per machine, done by the instructor/IT ahead of time, not per-student): run `adb reverse tcp:8080 tcp:8080` in a terminal (or a provided `.bat`/Python helper that shells out to it, or auto-detects the phone and runs it as part of the script's startup).
4. Run the class script with `CAM_SOURCE = "http://localhost:8080/video"`.

**Documented fallback if IP Webcam / adb reverse fails for a given phone/PC combo:** DroidCam (USB mode). It's free for USB use, has an official Windows client, bundles its own `adb`, and is the most Android-first, most heavily documented of the virtual-webcam apps. If a lab PC's security posture blocks DroidCam's DirectShow driver install, fall back further to checking whether the phone exposes native Android 14 QPR1+ UVC webcam mode (Settings → USB → Webcam) as a zero-install option, or pair the student with a laptop-webcam classmate for that session.

### Shared `CAM_SOURCE` mechanism (for the actual code change — noted, not implemented per this ticket's research-only scope)

Both scripts should replace the current hardcoded index with a single config value that is either an `int` (device index, laptop webcam / native UVC path) or a `str` URL (phone stream path), e.g.:

```python
CAM_SOURCE = 0  # laptop webcam: int device index
# or, for a lab PC with a phone plugged in over USB:
# CAM_SOURCE = "http://localhost:8080/video"
```

and at capture-open time:

```python
if isinstance(CAM_SOURCE, int):
    cap = cv2.VideoCapture(CAM_SOURCE, cv2.CAP_DSHOW)
else:
    cap = cv2.VideoCapture(CAM_SOURCE)  # let OpenCV pick FFmpeg backend for URL strings
```

This one `isinstance` branch is enough to unify `hand_ar.py`'s `CAM_INDEX` and `face_tracker.py`'s current dual `cv2.VideoCapture(0, cv2.CAP_DSHOW)` / `cv2.VideoCapture(0)` fallback logic under one `CAM_SOURCE` config value, without touching the rest of either script. (`cv2.CAP_DSHOW` is a Windows-only, device-index-only flag; it should not be passed when `CAM_SOURCE` is a URL string, which is exactly what the branch above avoids.)

---

## Sources

- [DroidCam — Connect](https://www.dev47apps.com/droidcam/connect/)
- [DroidCam — Help & FAQs](https://www.dev47apps.com/droidcam/help/) (also mirrored at [droidcam.app/help](https://droidcam.app/help/))
- [DroidCam — Windows Client](https://droidcam.app/windows/)
- [Iriun Webcam — official site](https://iriun.com/)
- [Elgato EpocCam — "I have no WiFi available, can I connect with a USB Cable?"](https://help.elgato.com/hc/en-us/articles/360048941891-EpocCam-I-have-no-WiFi-available-can-I-connect-with-a-USB-Cable)
- [Camo — Getting started](https://camo.com/support/camo/camo-getting-started)
- [Camo — Pricing](https://camo.com/pricing)
- [Android Developers — adb (Android Debug Bridge) reference](https://developer.android.com/tools/adb)
- [AOSP adb.1 manual (adb reverse syntax)](https://android.googlesource.com/platform/packages/modules/adb/+/refs/heads/master/docs/user/adb.1.md)
- [Android Developers — Configure on-device developer options (USB debugging)](https://developer.android.com/studio/debug/dev-options)
- [Google Play — IP Webcam (Pavel Khlebovich)](https://play.google.com/store/apps/details?id=com.pas.webcam)
- [Hackster.io — How to Use the Android 'IP Webcam' App with Python/OpenCV](https://www.hackster.io/peter-lunk/how-to-use-the-android-ip-webcam-app-with-python-opencv-45f28f)
- [GeeksforGeeks — Connect your Android phone camera to OpenCV Python](https://www.geeksforgeeks.org/connect-your-android-phone-camera-to-opencv-python/)
- [OpenCV — Video I/O with OpenCV Overview (FFmpeg backend, VideoCapture)](https://docs.opencv.org/3.4/d0/da7/videoio_overview.html)
- [source.android.com — Use a device as a webcam (native UVC / DeviceAsWebcam, Android 14 QPR1+)](https://source.android.com/docs/core/camera/webcam)
- [scrcpy-camera OBS plugin](https://github.com/NanKillBro/scrcpy-camera)
- [Aleksandr Hovhannisyan — How to Use an Android Phone Camera in OBS (scrcpy)](https://www.aleksandrhovhannisyan.com/notes/android-camera-obs/)

## Confidence / caveats

- Claims sourced directly from vendor/official pages (DroidCam, Elgato, Camo, Android/AOSP, OpenCV docs, Google Play) are marked as such above and are high-confidence.
- A few details (Iriun's exact USB/adb dependency, IP Webcam's precise power/thermal behavior, DroidCam's exact DirectShow device name string) came from search-engine-aggregated summaries of secondary sources rather than a directly fetched primary page, and are flagged inline — these should be spot-verified on one actual lab PC + one actual student phone before finalizing the student-facing setup guide.
- Nothing here was tested hands-on in this repo/environment; this is a documentation-based research pass only, per the ticket's research-only scope.
