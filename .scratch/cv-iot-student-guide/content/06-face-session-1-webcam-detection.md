# Session: Face Tracking — Session 1 (Webcam & Face Detection)

**Track:** Face Tracking (1 of 4)
**Maps to syllabus:** Module 11 — Face Detection & Recognition (guided)
**Builds toward:** `source code/facial-recognition/face_tracker.py`
**Session goal (say this out loud at the start):** "New activity, same foundation. Today we get a live camera window again — and this time, a plain box drawn around any face MediaPipe finds."

**Reminder of the code-display convention:** each step shows the entire file so far, with lines added *in that step* marked `# ← new`.

> **Camera source reminder:** same `CAM_SOURCE` pattern as Hand Tracking (Setup Session Step 6/7) — laptop webcam as an `int`, phone-over-USB as a URL string. Point back to it rather than re-teaching it.

---

## Step 1 — Imports, config, and opening the camera

**Say:** Same idea as Hand Tracking's camera-open step, but watch closely — this file is slightly more cautious about how it opens the camera, and it's worth noticing why.

**Code so far:**
```python
import cv2                                                                     # ← new
import mediapipe as mp                                                        # ← new

CAM_SOURCE = 0  # laptop webcam. Lab PC + phone: "http://localhost:8080/video"  # ← new


def main():                                                                   # ← new
    if isinstance(CAM_SOURCE, int):                                           # ← new
        cap = cv2.VideoCapture(CAM_SOURCE, cv2.CAP_DSHOW)                      # ← new
        if not cap.isOpened():                                                # ← new
            cap = cv2.VideoCapture(CAM_SOURCE)                                 # ← new
    else:                                                                     # ← new
        cap = cv2.VideoCapture(CAM_SOURCE)                                     # ← new
    if not cap.isOpened():                                                    # ← new
        raise RuntimeError("Could not open webcam. Check CAM_SOURCE / camera permissions.")  # ← new

    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)                                    # ← new
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)                                    # ← new


if __name__ == "__main__":                                                    # ← new
    main()                                                                    # ← new
```

**Why it matters:** Compare this to `hand_ar.py`'s camera-open code — that one tries `cv2.CAP_DSHOW` once and stops. This file adds an extra safety net: *if* the `CAP_DSHOW` backend fails to open the device at all, it retries with `cv2.VideoCapture(CAM_SOURCE)` and no backend specified, letting OpenCV pick automatically. This only applies to the laptop-webcam (`int`) path — a URL string (phone stream) never uses `CAP_DSHOW` in the first place, since that flag only means something for a local device.

**Common problems:**
- Same Path A / Path B considerations as Hand Tracking — wrong camera index, `adb reverse` not active, another app holding the camera. Not re-explained here; point back to the Setup session if anyone's fuzzy on it.
- A subtlety worth knowing but not dwelling on: `cap.isOpened()` returning `True` doesn't *guarantee* good frames — on rare webcam/driver combinations, `CAP_DSHOW` can "open" successfully but hand back garbled or black frames. The retry only triggers on an outright failure to open, not on bad frame content; if that ever comes up, it's a "known imperfection," not a bug to chase down.

---

## Step 2 — The capture loop: read, mirror, show, quit

**Say:** You've built this exact shape twice already in Hand Tracking Session 1 — read a frame, mirror it, show it, check for quit, clean up. Same rhythm, new window title.

**Code so far:**
```python
import cv2
import mediapipe as mp

CAM_SOURCE = 0  # laptop webcam. Lab PC + phone: "http://localhost:8080/video"


def main():
    if isinstance(CAM_SOURCE, int):
        cap = cv2.VideoCapture(CAM_SOURCE, cv2.CAP_DSHOW)
        if not cap.isOpened():
            cap = cv2.VideoCapture(CAM_SOURCE)
    else:
        cap = cv2.VideoCapture(CAM_SOURCE)
    if not cap.isOpened():
        raise RuntimeError("Could not open webcam. Check CAM_SOURCE / camera permissions.")

    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

    print("AR Face Tracker running. Press 'q' to quit.")                       # ← new

    while True:                                                               # ← new
        ok, frame = cap.read()                                                # ← new
        if not ok:                                                            # ← new
            break                                                            # ← new

        frame = cv2.flip(frame, 1)                                            # ← new

        cv2.imshow("AR Face Tracker", frame)                                   # ← new
        key = cv2.waitKey(1) & 0xFF                                           # ← new
        if key in (ord("q"), 27):                                             # ← new
            break                                                            # ← new

    cap.release()                                                            # ← new
    cv2.destroyAllWindows()                                                  # ← new


if __name__ == "__main__":
    main()
```

**Run it:**
```bash
python face_tracker.py
```
A mirrored, live camera window titled "AR Face Tracker" — nothing detected yet, but it quits cleanly on `q` or Esc.

**Why it matters:** Nothing new conceptually here — this is intentional repetition. If anyone in the room is shaky on why `cv2.flip`, `& 0xFF`, `waitKey(1)`, or `cap.release()` matter, this is a good moment for a 30-second recap rather than re-teaching it from scratch.

**Common problems:** Same as Hand Tracking Session 1's Step 4–5 (window not responding without click-focus, forgetting `cap.release()` locking the camera for next run). Not re-listed here.

---

## Step 3 — Load MediaPipe's face detector and run it on every frame

**Say:** Now we bring in MediaPipe's face detector and start actually running it — though you won't see anything different on screen yet.

**Code so far:**
```python
import cv2
import mediapipe as mp

CAM_SOURCE = 0  # laptop webcam. Lab PC + phone: "http://localhost:8080/video"


def main():
    mp_face_detection = mp.solutions.face_detection                           # ← new

    if isinstance(CAM_SOURCE, int):
        cap = cv2.VideoCapture(CAM_SOURCE, cv2.CAP_DSHOW)
        if not cap.isOpened():
            cap = cv2.VideoCapture(CAM_SOURCE)
    else:
        cap = cv2.VideoCapture(CAM_SOURCE)
    if not cap.isOpened():
        raise RuntimeError("Could not open webcam. Check CAM_SOURCE / camera permissions.")

    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

    print("AR Face Tracker running. Press 'q' to quit.")

    with mp_face_detection.FaceDetection(                                     # ← new
        model_selection=0, min_detection_confidence=0.6                        # ← new
    ) as face_detection:                                                      # ← new

        while True:
            ok, frame = cap.read()
            if not ok:
                break

            frame = cv2.flip(frame, 1)
            h, w = frame.shape[:2]                                            # ← new
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)                       # ← new
            rgb.flags.writeable = False                                       # ← new

            det_results = face_detection.process(rgb)                         # ← new

            cv2.imshow("AR Face Tracker", frame)
            key = cv2.waitKey(1) & 0xFF
            if key in (ord("q"), 27):
                break

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
```

**Why it matters:** `model_selection=0` picks MediaPipe's "short-range" detection model, tuned for faces within about 2 meters of the camera — exactly the typical webcam distance — as opposed to `model_selection=1`'s "full-range" model built for farther-away faces; it's a deliberate choice, not an arbitrary default. `with mp_face_detection.FaceDetection(...) as face_detection:` is a context manager, the same idea as `cap.release()` but for MediaPipe's internal resources — everything inside the indented block runs with the detector "open," and it's cleaned up automatically once the block ends. As with the hand-tracking model, MediaPipe expects RGB while OpenCV gives us BGR, hence `cv2.cvtColor(..., cv2.COLOR_BGR2RGB)`. `rgb.flags.writeable = False` is a small performance hint — it promises MediaPipe won't need to defensively copy the array before reading it, since we're telling it we won't modify `rgb` ourselves, which matters when this runs 20-30+ times a second.

**Common problems:**
- Nothing visibly different on screen yet — expected, same "build the logic, then reveal it" pattern from Hand Tracking. Step 4 finishes the job.
- Changing `model_selection` to `1` "to detect faces better" without understanding the near/far distinction can actually make webcam-distance detection *worse*, not better — worth a one-line warning if a curious student tries it.

---

## Step 4 — Draw a plain box around each detected face

**Say:** Finally, something visible: a rectangle around every face MediaPipe finds.

**Changed lines only (rest of file unchanged from Step 3):**
```python
            det_results = face_detection.process(rgb)

            if det_results.detections:                                        # ← new
                for det in det_results.detections:                             # ← new
                    box = det.location_data.relative_bounding_box               # ← new
                    x1 = max(0, int(box.xmin * w) - 15)                         # ← new
                    y1 = max(0, int(box.ymin * h) - 15)                         # ← new
                    x2 = min(w, int((box.xmin + box.width) * w) + 15)           # ← new
                    y2 = min(h, int((box.ymin + box.height) * h) + 15)          # ← new
                    cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)     # ← new

            cv2.imshow("AR Face Tracker", frame)
```

**Run it:**
```bash
python face_tracker.py
```
A green box should now appear around your face and track it as you move.

**Why it matters:** `relative_bounding_box` gives `xmin`/`ymin`/`width`/`height` as *fractions* of the frame (0 to 1) — the same normalization idea as the hand-landmark coordinates from Hand Tracking, just packaged as a box instead of 21 points. Multiplying by `w`/`h` converts those fractions into real pixel positions. The `- 15`/`+ 15` padding pads the box slightly beyond MediaPipe's tight detection region, so the box doesn't hug the face too closely; `max(0, ...)`/`min(w, ...)` clamp both edges so the box can never be drawn partly off-screen, even with a face right at the frame's edge. This plain green rectangle is deliberately basic — Session 2 replaces it with the sci-fi corner-bracket "reticle" look, so there's no need to make this version pretty.

**Common problems:**
- No box appears — usually poor lighting, an extreme side-profile angle, or the face partly out of frame; the short-range model wants a roughly front-facing, reasonably lit face.
- The single most common bug shape here: forgetting to multiply `xmin`/`width` by `w` (or `ymin`/`height` by `h`) — the box ends up drawn in a tiny corner of the frame, since `relative_bounding_box` values are always fractions, never raw pixels.
- Two faces in frame both get boxed — `det_results.detections` is a list, so the `for` loop already handles more than one face without any extra code; worth demonstrating live if a second person is around.

---

## Wrap-up (say this before ending the session)

"Same camera-loop shape as Hand Tracking, now finding faces instead of hands, with a plain box to prove it works. Next session: we turn that plain box into a sci-fi HUD reticle, and add a full face mesh overlay on top."
