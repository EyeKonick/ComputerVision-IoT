# Session: Hand Tracking — Session 2 (Landmarks & Skeleton)

**Track:** Hand Tracking (2 of 4)
**Maps to syllabus:** Module 10 — Hand Tracking & Gesture Control
**Builds on:** Hand Tracking Session 1's webcam loop
**Session goal (say this out loud at the start):** "Last time we got a mirrored camera window with nothing detected. Today we load a real hand-tracking model and draw a glowing skeleton over your actual hand."

**Reminder of the code-display convention:** each step shows the entire file so far, with lines added *in that step* marked `# ← new`.

> **Heads up for the instructor:** Steps 3 and 4 add real detection logic but produce **no visible change on screen yet** — the skeleton is drawn onto a separate invisible layer that only becomes visible once Step 5 composites it onto the camera image. Tell students this up front so "I ran it and nothing looks different" doesn't read as a mistake.

---

## Step 1 — Load the hand-tracking model

**Say:** We already prepared the model file location last session (`ensure_model()`). Today we actually load it into a `HandLandmarker` — the object that does the real detection work — once, before the camera loop starts.

**Code so far:**
```python
import os
import time                                                                    # ← new

import cv2
import mediapipe as mp                                                         # ← new
from mediapipe.tasks.python import BaseOptions                                  # ← new
from mediapipe.tasks.python import vision                                       # ← new

MODEL_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "hand_landmarker.task"
)
MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/hand_landmarker/"
    "hand_landmarker/float16/1/hand_landmarker.task"
)

CAM_SOURCE = 0  # laptop webcam. Lab PC + phone: "http://localhost:8080/video"
FRAME_W, FRAME_H = 1280, 720

HAND_CONNECTIONS = [(c.start, c.end) for c in vision.HandLandmarksConnections.HAND_CONNECTIONS]  # ← new


def ensure_model():
    if os.path.exists(MODEL_PATH):
        return
    print("Downloading hand landmark model (one-time, ~8 MB)...")
    import urllib.request
    urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)
    print("Model downloaded.")


def main():
    ensure_model()

    landmarker = vision.HandLandmarker.create_from_options(                    # ← new
        vision.HandLandmarkerOptions(                                          # ← new
            base_options=BaseOptions(model_asset_path=MODEL_PATH),              # ← new
            running_mode=vision.RunningMode.VIDEO,                              # ← new
            num_hands=2,                                                       # ← new
            min_hand_detection_confidence=0.6,                                 # ← new
            min_tracking_confidence=0.6,                                       # ← new
        )                                                                      # ← new
    )                                                                          # ← new

    if isinstance(CAM_SOURCE, int):
        cap = cv2.VideoCapture(CAM_SOURCE, cv2.CAP_DSHOW)
    else:
        cap = cv2.VideoCapture(CAM_SOURCE)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, FRAME_W)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, FRAME_H)

    if not cap.isOpened():
        raise RuntimeError("Could not open webcam. Check CAM_SOURCE / camera permissions.")

    print("Hand & Finger AR Tracker running. Press 'q' to quit.")

    while True:
        ok, frame = cap.read()
        if not ok:
            break

        frame = cv2.flip(frame, 1)

        cv2.imshow("Hand & Finger AR Tracker", frame)
        key = cv2.waitKey(1) & 0xFF
        if key in (ord('q'), 27):
            break

    cap.release()
    cv2.destroyAllWindows()
    landmarker.close()                                                        # ← new


if __name__ == "__main__":
    main()
```

**New in this step:**
- `import mediapipe as mp` — brings in MediaPipe, Google's toolkit for detecting hands, faces, and more from pictures.
- **HandLandmarker** — the specific MediaPipe tool that finds hand positions ("landmarks") in a picture.
- `vision.HandLandmarkerOptions(...)` — a settings bundle: all the choices you hand to `HandLandmarker` at once when creating it, instead of separate arguments.
- `running_mode=vision.RunningMode.VIDEO` — tells the model "expect a stream of frames in order," not one unrelated photo at a time.
- `landmarker.close()` — releases the model's resources when you're done with it, the same idea as `cap.release()` for the camera.

**Why it matters:** `running_mode=vision.RunningMode.VIDEO` tells MediaPipe to expect a continuous stream of frames in order, rather than treating each one as an unrelated standalone image — this lets it use information between frames to track a hand more smoothly (less jitter) instead of re-detecting from scratch every time. `num_hands=2` caps how many hands it looks for at once. The two confidence values are the model's certainty thresholds — how sure it must be before it reports a hand at all, and before it keeps tracking one it already found. `HAND_CONNECTIONS` builds the list of "which landmark connects to which" pairs once, from MediaPipe's own predefined hand skeleton — we'll draw a line for every pair in Step 3.

**Common problems:**
- Creating the `HandLandmarker` *inside* the `while True` loop instead of once before it — an easy copy-paste mistake that re-loads the model 30+ times a second and makes the whole program crawl. It must be created exactly once, which is why it's placed right after `ensure_model()` and before the loop.
- Model file missing — if `ensure_model()` from last session was skipped or the `.task` file got deleted, `HandLandmarker.create_from_options` will fail immediately with a file-not-found style error.

---

## Step 2 — Run detection on every frame

**Say:** Now, every single frame, we hand it to the model and get back a result — where it thinks any hands are.

**Code so far (inside the loop):**
```python
    while True:
        ok, frame = cap.read()
        if not ok:
            break

        frame = cv2.flip(frame, 1)
        h, w = frame.shape[:2]                                                 # ← new

        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)                            # ← new
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)         # ← new
        timestamp_ms = int(time.time() * 1000)                                  # ← new
        result = landmarker.detect_for_video(mp_image, timestamp_ms)             # ← new

        cv2.imshow("Hand & Finger AR Tracker", frame)
        key = cv2.waitKey(1) & 0xFF
        if key in (ord('q'), 27):
            break
```
*(everything above and below this block is unchanged from Step 1 — full file omitted here for space, shown in full again from Step 3 onward)*

**New in this step:**
- `cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)` — converts a picture from one color-channel order to another (here, OpenCV's blue-green-red order to MediaPipe's expected red-green-blue).
- `mp.Image(...)` — wraps a picture in the specific format MediaPipe's functions expect to receive.
- `time.time()` — gives you the current real-world time, used here to build an always-increasing timestamp.
- `landmarker.detect_for_video(...)` — runs the hand-detection model on one frame and hands back the result.
- `result` — the object holding everything the model found (or didn't find) in that frame.

**Why it matters:** OpenCV reads frames as BGR (blue-green-red order); MediaPipe expects RGB, so `cv2.cvtColor(..., cv2.COLOR_BGR2RGB)` swaps the channel order before handing the frame over — skip it and detection still *runs*, just less accurately, since the model was trained on RGB images. Because we're in `VIDEO` running mode (Step 1), `detect_for_video` requires an explicit, increasing timestamp with every call so MediaPipe knows how frames are ordered in time — `int(time.time() * 1000)` (milliseconds since epoch) is a simple always-increasing source. `h, w = frame.shape[:2]` grabs the frame's actual pixel height/width now, which Step 3 needs to convert MediaPipe's landmark coordinates (given as 0–1 fractions) into real on-screen pixel positions.

**Common problems:**
- Nothing visibly changes on screen after this step — expected, see the note at the top of this session; `result` is being computed but nothing draws it yet.
- On a stuttery connection (Path B's phone stream over a slow `adb reverse` link), frame timing can be uneven; if MediaPipe ever complains about timestamps not increasing, that's the symptom to look for.
- Confusing `result.hand_landmarks` (the actual point positions, used in Step 3) with `result.handedness` (which hand is "Left"/"Right", not used until Session 3's gesture readout) — they're two separate lists on the same `result` object.

---

## Step 3 — Extract landmark points and draw the skeleton connections

**Say:** For every hand MediaPipe found, we convert its 21 landmark points into real pixel coordinates, then draw a line for every bone in the hand.

**Full file so far:**
```python
import os
import time

import cv2
import mediapipe as mp
import numpy as np                                                             # ← new
from mediapipe.tasks.python import BaseOptions
from mediapipe.tasks.python import vision

MODEL_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "hand_landmarker.task"
)
MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/hand_landmarker/"
    "hand_landmarker/float16/1/hand_landmarker.task"
)

CAM_SOURCE = 0  # laptop webcam. Lab PC + phone: "http://localhost:8080/video"
FRAME_W, FRAME_H = 1280, 720

SKELETON_COLOR = (255, 0, 180)         # BGR: magenta-ish neon                  # ← new
SKELETON_GLOW_COLOR = (255, 120, 255)                                          # ← new

HAND_CONNECTIONS = [(c.start, c.end) for c in vision.HandLandmarksConnections.HAND_CONNECTIONS]


def glow_line(img, p1, p2, color, glow_color, thickness=2):                    # ← new
    cv2.line(img, p1, p2, glow_color, thickness + 6, cv2.LINE_AA)               # ← new
    cv2.line(img, p1, p2, color, thickness, cv2.LINE_AA)                        # ← new


def ensure_model():
    if os.path.exists(MODEL_PATH):
        return
    print("Downloading hand landmark model (one-time, ~8 MB)...")
    import urllib.request
    urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)
    print("Model downloaded.")


def main():
    ensure_model()

    landmarker = vision.HandLandmarker.create_from_options(
        vision.HandLandmarkerOptions(
            base_options=BaseOptions(model_asset_path=MODEL_PATH),
            running_mode=vision.RunningMode.VIDEO,
            num_hands=2,
            min_hand_detection_confidence=0.6,
            min_tracking_confidence=0.6,
        )
    )

    if isinstance(CAM_SOURCE, int):
        cap = cv2.VideoCapture(CAM_SOURCE, cv2.CAP_DSHOW)
    else:
        cap = cv2.VideoCapture(CAM_SOURCE)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, FRAME_W)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, FRAME_H)

    if not cap.isOpened():
        raise RuntimeError("Could not open webcam. Check CAM_SOURCE / camera permissions.")

    print("Hand & Finger AR Tracker running. Press 'q' to quit.")

    while True:
        ok, frame = cap.read()
        if not ok:
            break

        frame = cv2.flip(frame, 1)
        h, w = frame.shape[:2]

        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        timestamp_ms = int(time.time() * 1000)
        result = landmarker.detect_for_video(mp_image, timestamp_ms)

        overlay_layer = np.zeros_like(frame)                                    # ← new

        if result.hand_landmarks:                                               # ← new
            for hand_idx, hand_landmarks in enumerate(result.hand_landmarks[:2]):  # ← new
                pts = [(int(p.x * w), int(p.y * h)) for p in hand_landmarks]      # ← new

                for a, b in HAND_CONNECTIONS:                                    # ← new
                    glow_line(overlay_layer, pts[a], pts[b], SKELETON_COLOR, SKELETON_GLOW_COLOR, 2)  # ← new

        cv2.imshow("Hand & Finger AR Tracker", frame)
        key = cv2.waitKey(1) & 0xFF
        if key in (ord('q'), 27):
            break

    cap.release()
    cv2.destroyAllWindows()
    landmarker.close()


if __name__ == "__main__":
    main()
```

**New in this step:**
- `import numpy as np` — brings in NumPy, the library that stores and manipulates the grids of numbers pictures are made of.
- `np.zeros_like(frame)` — creates a new, same-size picture that's entirely black.
- `enumerate(...)` — goes through a list one item at a time, while also handing you each item's position number (0, 1, 2...).
- `[(int(p.x * w), int(p.y * h)) for p in hand_landmarks]` (a **list comprehension**) — a compact way to build a new list by transforming every item in another list, in one line.
- `def glow_line(img, p1, p2, color, glow_color, thickness=2):` — a function with a **default value** (`thickness=2`): if you don't specify `thickness` when calling it, it just uses `2`.
- `cv2.line(...)` — draws a straight line between two points on a picture.
- `cv2.LINE_AA` — tells OpenCV to smooth (anti-alias) a line's edges instead of drawing it jagged.

**Why it matters:** MediaPipe hands back each landmark as `x`/`y` *fractions* of the frame (0 to 1), not pixels — multiplying by `w`/`h` converts "43% across, 60% down" into an actual pixel coordinate, the same normalization idea students already saw with the face activity's bounding box. `pts` ends up as a fixed-order list of 21 points — that numbering comes from MediaPipe itself (point 0 is always the wrist, and so on), not something we chose, so `HAND_CONNECTIONS` (built in Step 1 from MediaPipe's own connection list) already knows which pairs of indices form real hand "bones." We draw onto `overlay_layer` — a same-size, all-black canvas created fresh *every frame* — rather than directly onto `frame`, because that separation is what makes the neon-glow compositing trick in Step 5 possible. `glow_line` itself is a small trick: draw a thick, lighter "glow" line first, then a thinner, brighter core line on top of it — two overlapping lines fake a soft-glow look with plain OpenCV.

**Common problems:**
- `overlay_layer = np.zeros_like(frame)` must be recreated *inside* the loop, every frame — if a student accidentally moves it outside the loop (created once), old drawings never clear and every past hand position stays on screen, smearing into a mess.
- If a hand is partly outside the frame, MediaPipe can still return estimated coordinates for its off-screen points — these can end up negative or larger than `w`/`h`; that's expected, not a crash, and Session 3 doesn't need to guard against it for this activity.
- `result.hand_landmarks[:2]` — the `[:2]` slice is a defensive habit even though `num_hands=2` already caps detections; worth a one-line mention, not worth dwelling on.

---

## Step 4 — Draw the joints

**Say:** Lines alone look like a wireframe; a small glowing dot at each of the 21 points makes the joints read clearly too.

**Changed lines only (rest of file unchanged from Step 3):**
```python
SKELETON_COLOR = (255, 0, 180)         # BGR: magenta-ish neon
SKELETON_GLOW_COLOR = (255, 120, 255)
JOINT_COLOR = (0, 255, 255)            # neon cyan                              # ← new

HAND_CONNECTIONS = [(c.start, c.end) for c in vision.HandLandmarksConnections.HAND_CONNECTIONS]


def glow_line(img, p1, p2, color, glow_color, thickness=2):
    cv2.line(img, p1, p2, glow_color, thickness + 6, cv2.LINE_AA)
    cv2.line(img, p1, p2, color, thickness, cv2.LINE_AA)


def glow_circle(img, center, radius, color, glow_color):                        # ← new
    cv2.circle(img, center, radius + 8, glow_color, -1, cv2.LINE_AA)             # ← new
    cv2.circle(img, center, radius, color, -1, cv2.LINE_AA)                      # ← new
```
```python
                for a, b in HAND_CONNECTIONS:
                    glow_line(overlay_layer, pts[a], pts[b], SKELETON_COLOR, SKELETON_GLOW_COLOR, 2)
                for p in pts:                                                    # ← new
                    glow_circle(overlay_layer, p, 4, JOINT_COLOR, (0, 255, 255))  # ← new
```

**New in this step:**
- `cv2.circle(img, center, radius, color, -1, ...)` — draws a circle; passing `-1` for thickness fills it in solid instead of just drawing an outline.

**Why it matters:** `glow_circle` is the same two-layer trick as `glow_line` — a bigger, dimmer glow circle underneath a smaller, brighter core circle — applied to every one of the 21 points in `pts`, not just the connected ones, so every joint gets a dot even ones that happen to be endpoints of multiple lines.

**Common problems:**
- Still no visible change on screen yet — Step 5 is where all of this finally shows up; keep reassuring students of this if asked.
- Easy to mix up `glow_line`'s and `glow_circle`'s argument order (`color` then `glow_color` in both, consistently) — a quick point-and-compare with the function definitions above the loop clears it up fast.

---

## Step 5 — Composite the glow onto the camera image

**Say:** This is the step where it all becomes visible — we blend the glowing overlay on top of the real camera picture.

**Changed lines only (rest of file unchanged from Step 4):**
```python
        cv2.imshow("Hand & Finger AR Tracker", frame)
```
becomes
```python
        # Composite glow layer onto camera frame with additive blending for neon feel.  # ← new
        frame = cv2.addWeighted(frame, 0.65, overlay_layer, 1.0, 0)              # ← new

        cv2.imshow("Hand & Finger AR Tracker", frame)
```

**Run it:**
```bash
python hand_ar.py
```
You should now see your live camera feed, mirrored, with a glowing magenta-and-cyan skeleton tracking your hand(s) in real time.

**New in this step:**
- `cv2.addWeighted(img1, w1, img2, w2, gamma)` — blends two same-size pictures together, each one weighted by how much it should show through.

**Why it matters:** `cv2.addWeighted(frame, 0.65, overlay_layer, 1.0, 0)` blends two same-size images by weight — the real camera picture at 65% brightness, plus the glow layer at full 100%. Because `overlay_layer` is pure black everywhere except where we actually drew something, adding it at full weight only brightens the pixels with a skeleton on them, while the slightly dimmed camera feed behind it makes that glow pop — that's the entire "neon AR" look, achieved with one blend call.

**Common problems:**
- Forgetting to reassign the result — `cv2.addWeighted(...)` returns a *new* image, it doesn't modify `frame` in place; writing it as a bare expression instead of `frame = cv2.addWeighted(...)` means nothing visually changes and it's easy to think Step 3/4 "didn't work."
- If the skeleton looks too dim or washed out, the two weights (`0.65` and `1.0`) are exactly the two numbers to experiment with — a great optional "make it your own" moment for students who finish early.
- If nothing is detected (no hand in frame), `overlay_layer` stays pure black and `addWeighted` just dims the camera slightly with no glow — that's correct behavior, not a bug, and a good way to demonstrate "no hand = no skeleton" live.

---

## Wrap-up (say this before ending the session)

"You just went from a plain camera window to real hand detection with a glowing skeleton overlay — using MediaPipe to find the hand, and one blend call to make it look like AR. Next session: we turn those same landmark points into fingertip trails and an actual gesture readout — how many fingers are up, and whether you're pinching."
