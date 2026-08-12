# Session: Hand Tracking — Session 4 (Virtual Orb & Wrap-up)

**Track:** Hand Tracking (4 of 4 — final session for this activity)
**Maps to syllabus:** Module 10 — Hand Tracking & Gesture Control
**Builds on:** Hand Tracking Session 3's gesture readout
**Session goal (say this out loud at the start):** "Today your pinch stops being just a label on screen — it becomes something you can use to grab and drag a glowing virtual object. This is the last piece; by the end, `hand_ar.py` is complete."

**Reminder of the code-display convention:** each step shows the entire file so far, with lines added *in that step* marked `# ← new`.

---

## Step 1 — Orb state and picking which hand controls it

**Say:** Before the orb can be grabbed, we need somewhere for it to live (its position), and a way to decide *which* hand's index fingertip is "in control" when more than one hand is on screen.

**Full file so far:**
```python
import collections
import math
import os
import time

import cv2
import mediapipe as mp
import numpy as np
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

TRAIL_LENGTH = 18            # points remembered per fingertip trail
FINGERTIP_IDS = [4, 8, 12, 16, 20]   # thumb, index, middle, ring, pinky tips
INDEX_TIP_ID = 8
THUMB_TIP_ID = 4

SKELETON_COLOR = (255, 0, 180)       # BGR: magenta-ish neon
SKELETON_GLOW_COLOR = (255, 120, 255)
JOINT_COLOR = (0, 255, 255)          # neon cyan

TRAIL_COLORS = [
    (255, 80, 80),    # thumb   - blue-ish
    (80, 255, 255),   # index   - yellow
    (80, 255, 80),    # middle  - green
    (255, 80, 255),   # ring    - magenta
    (80, 160, 255),   # pinky   - orange
]

ORB_RADIUS = 40                                                                # ← new
ORB_COLOR = (255, 220, 0)                                                      # ← new
ORB_GLOW_COLOR = (255, 255, 150)                                               # ← new
PINCH_THRESHOLD = 40   # pixels, normalized-ish for 1280px wide frame

HAND_CONNECTIONS = [(c.start, c.end) for c in vision.HandLandmarksConnections.HAND_CONNECTIONS]


def glow_line(img, p1, p2, color, glow_color, thickness=2):
    cv2.line(img, p1, p2, glow_color, thickness + 6, cv2.LINE_AA)
    cv2.line(img, p1, p2, color, thickness, cv2.LINE_AA)


def glow_circle(img, center, radius, color, glow_color):
    cv2.circle(img, center, radius + 8, glow_color, -1, cv2.LINE_AA)
    cv2.circle(img, center, radius, color, -1, cv2.LINE_AA)


def count_fingers(pts):
    """Return number of extended fingers (0-5) using pixel-space landmark points.

    Distance-based rather than axis-based, so it holds up regardless of hand
    rotation, tilt, or left/right handedness (a simple x/y-coordinate
    comparison only works for one specific hand orientation).
    """
    wrist = pts[0]
    extended = 0

    finger_tips_pips = [(8, 6), (12, 10), (16, 14), (20, 18)]
    for tip_id, pip_id in finger_tips_pips:
        if math.hypot(pts[tip_id][0] - wrist[0], pts[tip_id][1] - wrist[1]) > \
           math.hypot(pts[pip_id][0] - wrist[0], pts[pip_id][1] - wrist[1]):
            extended += 1

    pinky_mcp = pts[17]
    thumb_tip_dist = math.hypot(pts[4][0] - pinky_mcp[0], pts[4][1] - pinky_mcp[1])
    thumb_ip_dist = math.hypot(pts[3][0] - pinky_mcp[0], pts[3][1] - pinky_mcp[1])
    if thumb_tip_dist > thumb_ip_dist:
        extended += 1

    return extended


def draw_text_with_bg(img, text, org, scale=0.9, color=(255, 255, 255),
                       bg=(0, 0, 0), thickness=2, alpha=0.55):
    font = cv2.FONT_HERSHEY_SIMPLEX
    (tw, th), baseline = cv2.getTextSize(text, font, scale, thickness)
    x, y = org
    overlay = img.copy()
    cv2.rectangle(overlay, (x - 10, y - th - 10), (x + tw + 10, y + baseline + 6), bg, -1)
    cv2.addWeighted(overlay, alpha, img, 1 - alpha, 0, img)
    cv2.putText(img, text, (x, y), font, scale, color, thickness, cv2.LINE_AA)


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

    # trails[hand_index][finger_index] = deque of (x, y) points
    trails = [
        [collections.deque(maxlen=TRAIL_LENGTH) for _ in FINGERTIP_IDS]
        for _ in range(2)
    ]

    orb_pos = None       # set once we know frame size                        # ← new
    orb_held = False                                                          # ← new

    print("Hand & Finger AR Tracker running. Press 'q' to quit, 'r' to reset the orb.")

    while True:
        ok, frame = cap.read()
        if not ok:
            break

        frame = cv2.flip(frame, 1)
        h, w = frame.shape[:2]

        if orb_pos is None:                                                   # ← new
            orb_pos = [w // 2, h // 2]                                        # ← new

        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        timestamp_ms = int(time.time() * 1000)
        result = landmarker.detect_for_video(mp_image, timestamp_ms)

        overlay_layer = np.zeros_like(frame)

        pinch_active_any = False                                              # ← new
        index_tip_px = None                                                   # ← new

        if result.hand_landmarks:
            for hand_idx, hand_landmarks in enumerate(result.hand_landmarks[:2]):
                handedness_label = "Right"
                if result.handedness and hand_idx < len(result.handedness):
                    handedness_label = result.handedness[hand_idx][0].category_name

                pts = [(int(p.x * w), int(p.y * h)) for p in hand_landmarks]

                for a, b in HAND_CONNECTIONS:
                    glow_line(overlay_layer, pts[a], pts[b], SKELETON_COLOR, SKELETON_GLOW_COLOR, 2)
                for p in pts:
                    glow_circle(overlay_layer, p, 4, JOINT_COLOR, (0, 255, 255))

                for f_idx, tip_id in enumerate(FINGERTIP_IDS):
                    trails[hand_idx][f_idx].append(pts[tip_id])
                    trail = trails[hand_idx][f_idx]
                    n = len(trail)
                    for i in range(1, n):
                        fade = i / n
                        radius = max(1, int(6 * fade))
                        color = tuple(int(c * fade) for c in TRAIL_COLORS[f_idx])
                        cv2.circle(overlay_layer, trail[i], radius, color, -1, cv2.LINE_AA)
                    glow_circle(overlay_layer, pts[tip_id], 8, TRAIL_COLORS[f_idx], TRAIL_COLORS[f_idx])

                finger_count = count_fingers(pts)
                thumb_tip = pts[THUMB_TIP_ID]
                index_tip = pts[INDEX_TIP_ID]
                pinch_dist = math.hypot(thumb_tip[0] - index_tip[0], thumb_tip[1] - index_tip[1])
                is_pinching = pinch_dist < PINCH_THRESHOLD

                label_x = min(pts[0][0], w - 260)
                label_y = max(pts[0][1] + 60, 40)
                status = f"{handedness_label} hand: {finger_count} fingers"
                if is_pinching:
                    status += "  |  PINCH"
                    pinch_active_any = True                                    # ← new
                draw_text_with_bg(overlay_layer, status, (label_x, label_y),
                                   scale=0.7, color=(255, 255, 255), bg=(40, 0, 40))

                if handedness_label == "Right" or not result.handedness:        # ← new
                    index_tip_px = index_tip                                   # ← new
                elif index_tip_px is None:                                     # ← new
                    index_tip_px = index_tip                                   # ← new

        # Composite glow layer onto camera frame with additive blending for neon feel.
        frame = cv2.addWeighted(frame, 0.65, overlay_layer, 1.0, 0)

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

Nothing visibly new yet — the orb doesn't exist on screen until Step 3. Running now looks identical to the end of Session 3.

**New in this step:**
- `None` — Python's special value meaning "nothing here yet" / "no value."
- `w // 2` (**integer division**) — divides two numbers and rounds down to a whole number, so you always get a clean pixel position instead of a fraction.
- `elif` — short for "else if": checks another condition, only if the first `if` wasn't true.
- **Mutable list vs. tuple** — a list's contents can be changed after it's created (e.g. `orb_pos[0] = ...`); a tuple's contents can't. That's exactly why `orb_pos` is a list here.

**Why it matters:** `orb_pos` starts as `None` and only gets its real value once we know the frame's actual width/height (`if orb_pos is None: orb_pos = [w // 2, h // 2]`, inside the loop but only runs the *first* time since afterward it's never `None` again) — centering it on the very first frame. `pinch_active_any` and `index_tip_px` are reset to `False`/`None` at the *top* of every frame, then the per-hand loop updates them: `pinch_active_any` becomes `True` the moment *any* visible hand is pinching, and the little `if handedness_label == "Right" ... elif index_tip_px is None` block picks one hand's index fingertip to be "in control" — preferring the right hand, but falling back to whichever hand was found first if there's no right hand in frame. This is all just bookkeeping for now; Step 2 is where it actually drives the orb.

**Common problems:**
- `orb_pos = [w // 2, h // 2]` uses a *list*, not a tuple — deliberately, because Step 2 needs to mutate its contents (`orb_pos[0] = ...`) while dragging, and Python lists are mutable in a way tuples aren't. If a student "cleans it up" into a tuple, dragging will throw a `TypeError` later.
- With two hands in frame, only one controls the orb at a time (whichever wins the Right-hand-preferred selection) — worth demonstrating live so it doesn't look like a bug when the second hand's pinch does nothing to the orb.

---

## Step 2 — Grab-and-drag logic

**Say:** Now the orb actually responds: pinch near it, and it follows your fingertip until you release the pinch.

**Changed lines only (added right after the per-hand `for` loop, rest of file unchanged from Step 1):**
```python
                if handedness_label == "Right" or not result.handedness:
                    index_tip_px = index_tip
                elif index_tip_px is None:
                    index_tip_px = index_tip

        # --- virtual object interaction ---                                   # ← new
        if index_tip_px is not None:                                          # ← new
            dist_to_orb = math.hypot(index_tip_px[0] - orb_pos[0], index_tip_px[1] - orb_pos[1])  # ← new
            if pinch_active_any and dist_to_orb < ORB_RADIUS + 30:              # ← new
                orb_held = True                                                # ← new
            if not pinch_active_any:                                          # ← new
                orb_held = False                                              # ← new
            if orb_held:                                                      # ← new
                orb_pos[0], orb_pos[1] = index_tip_px                          # ← new

        # Composite glow layer onto camera frame with additive blending for neon feel.
        frame = cv2.addWeighted(frame, 0.65, overlay_layer, 1.0, 0)
```

Still no orb drawn on screen — the *logic* is complete, but Step 3 is what actually renders it.

**New in this step:**
- `is not None` — a check specifically for "does this variable actually hold a value yet," rather than just checking if it's empty or zero.
- `orb_pos[0], orb_pos[1] = index_tip_px` — unpacks two values from `index_tip_px` directly into the two slots of `orb_pos`, in one line.

**Why it matters:** Grabbing requires *two* conditions at once: `pinch_active_any` (you're pinching) **and** `dist_to_orb < ORB_RADIUS + 30` (your fingertip is close enough to the orb) — pinching from across the screen shouldn't grab it, and being near the orb without pinching shouldn't either. The `+ 30` gives a slightly forgiving grab radius bigger than the orb's visual size, since demanding pixel-perfect precision would feel frustrating in a live demo. Once held, releasing the pinch anywhere (`if not pinch_active_any: orb_held = False`) drops it — there's no separate "release" gesture, pinch state alone drives both grab and release.

**Common problems:**
- Orb "grabbed" from too far away, or not grabbing when it visually looks close enough — `ORB_RADIUS + 30` is the number to tune; a good live experiment once Step 3 makes the orb visible.
- `orb_pos[0], orb_pos[1] = index_tip_px` — this mutates the *existing* list in place rather than replacing it with a new one; this matters because `orb_pos` was captured by the loop shown above, and mutating in place is what makes the change "stick" without needing to reassign the whole variable.

---

## Step 3 — Draw the orb

**Say:** Time to actually see it — a glowing orb sitting in the middle of the screen, waiting to be grabbed.

**Changed lines only (rest of file unchanged from Step 2):**
```python
            if orb_held:
                orb_pos[0], orb_pos[1] = index_tip_px

        orb_color = ORB_GLOW_COLOR if orb_held else ORB_COLOR                   # ← new
        pulse = int(6 * math.sin(time.time() * 4)) if not orb_held else 0        # ← new
        glow_circle(overlay_layer, tuple(orb_pos), ORB_RADIUS + pulse, ORB_COLOR, orb_color)  # ← new
        draw_text_with_bg(overlay_layer, "touch me", (orb_pos[0] - 45, orb_pos[1] - ORB_RADIUS - 16),  # ← new
                           scale=0.55, color=(255, 255, 255), bg=(0, 0, 0), alpha=0.4)  # ← new

        # Composite glow layer onto camera frame with additive blending for neon feel.
        frame = cv2.addWeighted(frame, 0.65, overlay_layer, 1.0, 0)
```

**Run it:**
```bash
python hand_ar.py
```
A glowing orb should appear in the middle of the screen, gently pulsing, labeled "touch me." Pinch near it and it should follow your fingertip; release the pinch and it stays where you left it.

**New in this step:**
- `tuple(orb_pos)` — converts a list into a tuple, here just for this one function call, since `glow_circle` expects a tuple-style point.
- `X if condition else Y` (a **conditional expression**) — picks between two values on a single line, depending on whether `condition` is true.
- `math.sin(...)` — a math function that smoothly rises and falls between -1 and 1, forever, like a gentle wave — used here to make the orb pulse.

**Why it matters:** `glow_circle` needs a *tuple* for its center argument (matching how it's used everywhere else in the file), so `tuple(orb_pos)` converts the mutable list back for just this call without changing what `orb_pos` actually is. When idle, `pulse = int(6 * math.sin(time.time() * 4))` makes the orb's radius gently oscillate — `math.sin` cycles smoothly between -1 and 1 forever, `time.time() * 4` speeds up how fast it cycles, and `* 6` sets how many pixels it swells and shrinks by; the `if not orb_held else 0` turns the pulse off while held, so a grabbed orb stays a steady, predictable size instead of pulsing under your finger. The `orb_color` swap (brighter `ORB_GLOW_COLOR` while held) gives an extra visual cue that the grab registered, on top of the orb actually following your finger.

**Common problems:**
- Orb position feels laggy or jittery — this tracks directly to camera FPS (which Step 4 finally makes visible), since the orb only updates once per processed frame; a slow phone-stream connection (Path B) will visibly lag more than a local laptop webcam.
- Students may ask why the orb doesn't pulse *while* held — that's intentional (see above), not a missing feature; worth stating outright so it isn't reported as a bug.

---

## Step 4 — FPS counter and title HUD

**Say:** Last visual touch: a title bar and a live FPS counter, so you can actually see how fast this is running.

**Changed lines only (rest of file unchanged from Step 3):**
```python
    orb_pos = None       # set once we know frame size
    orb_held = False
    prev_time = time.time()                                                    # ← new

    print("Hand & Finger AR Tracker running. Press 'q' to quit, 'r' to reset the orb.")
```
```python
        # Composite glow layer onto camera frame with additive blending for neon feel.
        frame = cv2.addWeighted(frame, 0.65, overlay_layer, 1.0, 0)

        # FPS + title HUD                                                      # ← new
        now = time.time()                                                      # ← new
        fps = 1.0 / max(now - prev_time, 1e-6)                                  # ← new
        prev_time = now                                                        # ← new
        draw_text_with_bg(frame, "Hand & Finger AR Tracker", (20, 40), scale=1.0,  # ← new
                           color=(0, 255, 255), bg=(0, 0, 0))                   # ← new
        draw_text_with_bg(frame, f"FPS: {fps:0.0f}", (20, h - 20), scale=0.6,    # ← new
                           color=(200, 200, 200), bg=(0, 0, 0), alpha=0.4)       # ← new

        cv2.imshow("Hand & Finger AR Tracker", frame)
```

**New in this step:**
- `1e-6` — scientific notation for a very small number (0.000001); used here just to make sure we never divide by exactly zero.
- `f"FPS: {fps:0.0f}"` — an f-string with a **format spec** (`:0.0f`), telling it to show the number with zero decimal places.

**Why it matters:** FPS here is measured directly, not estimated — `now - prev_time` is exactly how long the *previous* loop iteration took, and `1 / time_per_frame` is frames-per-second by definition; `max(..., 1e-6)` just prevents a divide-by-zero on an impossibly fast first frame. This title and FPS text is drawn on `frame` (the real camera image), **not** `overlay_layer` — unlike everything else in this file, it doesn't need to go through the neon compositing step, since it's a flat UI overlay, not part of the "AR" scene.

**Common problems:**
- A consistently low FPS (well under ~15) is the single most useful number for diagnosing "why does this feel laggy" — especially valuable to point out on Path B (phone-over-USB), where FPS is the honest signal of whether the stream is keeping up.
- Drawing this on `overlay_layer` by mistake instead of `frame` would make the title/FPS text dim and tinted by the compositing blend instead of crisp and clear — a good "notice the difference" comparison if a student tries it both ways.

---

## Step 5 — The 'r' reset key

**Say:** Last piece: a way to snap the orb back to the center if it drifts somewhere inconvenient.

**Changed lines only (rest of file unchanged from Step 4 — this is now the complete, finished `hand_ar.py`):**
```python
        key = cv2.waitKey(1) & 0xFF
        if key in (ord('q'), 27):
            break
        if key == ord('r'):                                                    # ← new
            orb_pos = [w // 2, h // 2]                                         # ← new
            orb_held = False                                                   # ← new
```

**Run it one final time:**
```bash
python hand_ar.py
```
Press `r` at any point and the orb should snap back to the center of the screen, released from any grab.

**Why it matters:** This reassigns `orb_pos` to a brand-new list rather than mutating it in place — perfectly fine here, since nothing is holding a separate reference to the old list the way the drag logic temporarily does mid-frame. Setting `orb_held = False` alongside the reset ensures a held orb doesn't immediately snap back to your fingertip on the very next frame.

**Common problems:**
- Pressing `r` and nothing happening — same focus issue as the `q` quit key from Session 1: the OpenCV window needs to be the clicked/focused one for `cv2.waitKey` to see the keypress.
- This is the last piece of `hand_ar.py` — a good moment to run the finished file start-to-finish once as a class, without stopping to explain, just to see the whole thing work end to end.

---

## Closing framing note (say this before wrap-up)

"The orb you just built is standing in for something bigger. Your syllabus calls this module's theme 'touchless actuation as an IoT action' — in a real IoT system, that pinch-and-drag wouldn't move a picture on your own screen, it would trigger something in the physical world: turning on a smart light, moving a servo, sending an HTTP request to a device on the network. We didn't build that connection today — this is a deliberately simple stand-in so we could focus on the computer-vision side: detecting the hand, recognizing the gesture, and turning it into *some* kind of action. Swapping the orb-drawing code for a real network call or hardware signal is a natural next step, not something built into this activity."

*(Future-extension only — no new code for this in the current scope. If a student asks "can we actually make it control a real light," the honest answer is "not today, but here's roughly what would change": replace the orb's `glow_circle`/`draw_text_with_bg` render with a call out to whatever the real device's API expects, triggered on the same `orb_held` transition.)*

## Wrap-up (say this before ending the session)

"That's `hand_ar.py`, complete — camera in, hand detected, gesture read, and a pinch turned into a real interaction. Four sessions, one file, every line explained before you typed it. Next activity: the AR Face Tracker, starting from the exact same webcam-loop foundation you already know."
