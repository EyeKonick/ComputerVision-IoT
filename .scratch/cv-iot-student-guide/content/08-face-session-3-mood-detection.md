# Session: Face Tracking — Session 3 (Mood Detection)

**Track:** Face Tracking (3 of 4)
**Maps to syllabus:** Module 11 — Face Detection & Recognition (guided)
**Builds on:** Face Tracking Session 2's sci-fi HUD and face mesh
**Session goal (say this out loud at the start):** "Today the code stops just finding a face and starts reading it — we measure the mouth and decide whether the face looks happy, sad, surprised, or neutral."

**Reminder of the code-display convention:** each step shows the entire file so far, with lines added *in that step* marked `# ← new`.

> **Note for the instructor:** Say this out loud early: this is a heuristic, not real emotion recognition. It looks at exactly one thing — the shape of the mouth, from six landmark points — so it can be fooled (talking, yawning, someone whose resting face already looks a bit sad). The point of the session is how measurements become a decision, not that the classifier is smart.

> **Note for the instructor:** Steps 1 and 2 add functions nothing calls yet, so the program looks identical to Session 2 when run — the run check for those steps is just "no errors, still works." The first visible change is Step 3 (the calibration counter), and the first mood label appears in Step 4.

---

## Step 1 — Measure the mouth (mouth_metrics)

**Say:** Before the code can decide anything about a mood, it needs numbers. We're writing one function that measures three things about the mouth — how wide it is, how open it is, and whether the corners are lifted — and expresses each one relative to the distance between the eyes.

**Full file so far:**
```python
import math                                                                     # ← new

import cv2
import mediapipe as mp

CAM_SOURCE = 0  # laptop webcam. Lab PC + phone: "http://localhost:8080/video"

PRIMARY_COLOR = (255, 255, 0)
ACCENT_COLOR = (0, 255, 255)
MESH_COLOR = (255, 200, 0)
BRACKET_LEN = 30
BRACKET_THICKNESS = 3

# MediaPipe Face Mesh landmark indices used for the mood heuristic.             # ← new
LM_LEFT_EYE_OUTER = 33                                                          # ← new
LM_RIGHT_EYE_OUTER = 263                                                        # ← new
LM_MOUTH_LEFT = 61                                                              # ← new
LM_MOUTH_RIGHT = 291                                                            # ← new
LM_MOUTH_TOP = 13                                                               # ← new
LM_MOUTH_BOTTOM = 14                                                            # ← new


def draw_glow_line(img, pt1, pt2, color, thickness=1):
    """Draw a line with a soft outer glow to sell the 'AR' look."""
    cv2.line(img, pt1, pt2, color, thickness + 3, cv2.LINE_AA)
    cv2.line(img, pt1, pt2, (255, 255, 255), max(1, thickness - 1), cv2.LINE_AA)


def draw_corner_brackets(img, x1, y1, x2, y2, color):
    """Draw targeting-reticle style corner brackets instead of a plain box."""
    corners = [
        ((x1, y1), (1, 0), (0, 1)),
        ((x2, y1), (-1, 0), (0, 1)),
        ((x1, y2), (1, 0), (0, -1)),
        ((x2, y2), (-1, 0), (0, -1)),
    ]
    for (cx, cy), dx, dy in corners:
        p1 = (cx + dx[0] * BRACKET_LEN, cy)
        p2 = (cx, cy)
        p3 = (cx, cy + dy[1] * BRACKET_LEN)
        draw_glow_line(img, p1, p2, color, BRACKET_THICKNESS)
        draw_glow_line(img, p2, p3, color, BRACKET_THICKNESS)


def draw_hud_text(img, text, org, color, scale=0.55, thickness=1):
    cv2.putText(img, text, org, cv2.FONT_HERSHEY_SIMPLEX, scale, (0, 0, 0), thickness + 3, cv2.LINE_AA)
    cv2.putText(img, text, org, cv2.FONT_HERSHEY_SIMPLEX, scale, color, thickness, cv2.LINE_AA)


def mouth_metrics(landmarks, img_w, img_h):                                     # ← new
    """Mouth width, mouth height, and corner lift, all normalized by            # ← new
    inter-eye distance so they hold up regardless of how close a face is        # ← new
    to the camera. Returns None if the eyes are degenerately close              # ← new
    (shouldn't happen with a real face)."""                                     # ← new

    def pt(idx):                                                                # ← new
        lm = landmarks.landmark[idx]                                            # ← new
        return lm.x * img_w, lm.y * img_h                                       # ← new

    left_eye = pt(LM_LEFT_EYE_OUTER)                                            # ← new
    right_eye = pt(LM_RIGHT_EYE_OUTER)                                          # ← new
    interocular = math.hypot(right_eye[0] - left_eye[0], right_eye[1] - left_eye[1])  # ← new
    if interocular < 1e-3:                                                      # ← new
        return None                                                             # ← new

    mouth_left = pt(LM_MOUTH_LEFT)                                              # ← new
    mouth_right = pt(LM_MOUTH_RIGHT)                                            # ← new
    mouth_top = pt(LM_MOUTH_TOP)                                                # ← new
    mouth_bottom = pt(LM_MOUTH_BOTTOM)                                          # ← new

    mouth_width = math.hypot(mouth_right[0] - mouth_left[0], mouth_right[1] - mouth_left[1]) / interocular  # ← new
    mouth_height = math.hypot(mouth_bottom[0] - mouth_top[0], mouth_bottom[1] - mouth_top[1]) / interocular  # ← new

    mouth_center_y = (mouth_top[1] + mouth_bottom[1]) / 2                       # ← new
    corner_avg_y = (mouth_left[1] + mouth_right[1]) / 2                         # ← new
    corner_lift = (mouth_center_y - corner_avg_y) / interocular  # positive: corners raised (smile)  # ← new

    return mouth_width, mouth_height, corner_lift                               # ← new


def draw_scan_line(img, frame_count, color, top, bottom, left, right):
    """An animated horizontal scan line sweeping through the face box."""
    span = bottom - top
    if span <= 0:
        return
    offset = frame_count % 60
    y = top + int((offset / 60) * span)
    cv2.line(img, (left, y), (right, y), color, 1, cv2.LINE_AA)


def main():
    mp_face_mesh = mp.solutions.face_mesh
    mp_face_detection = mp.solutions.face_detection
    mp_drawing = mp.solutions.drawing_utils
    mp_styles = mp.solutions.drawing_styles

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

    frame_count = 0

    print("AR Face Tracker running. Press 'q' to quit.")

    with mp_face_mesh.FaceMesh(
        max_num_faces=2,
        refine_landmarks=True,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    ) as face_mesh, mp_face_detection.FaceDetection(
        model_selection=0, min_detection_confidence=0.6
    ) as face_detection:

        while True:
            ok, frame = cap.read()
            if not ok:
                break

            frame = cv2.flip(frame, 1)
            h, w = frame.shape[:2]
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            rgb.flags.writeable = False

            det_results = face_detection.process(rgb)
            mesh_results = face_mesh.process(rgb)

            overlay = frame.copy()

            if det_results.detections:
                for det in det_results.detections:
                    box = det.location_data.relative_bounding_box
                    x1 = max(0, int(box.xmin * w) - 15)
                    y1 = max(0, int(box.ymin * h) - 15)
                    x2 = min(w, int((box.xmin + box.width) * w) + 15)
                    y2 = min(h, int((box.ymin + box.height) * h) + 15)
                    draw_corner_brackets(overlay, x1, y1, x2, y2, PRIMARY_COLOR)
                    draw_scan_line(overlay, frame_count, ACCENT_COLOR, y1, y2, x1, x2)
                    conf = det.score[0] if det.score else 0.0
                    draw_hud_text(
                        overlay, f"FACE LOCK  {conf * 100:4.1f}%",
                        (x1, max(20, y1 - 12)), PRIMARY_COLOR, 0.5,
                    )

            if mesh_results.multi_face_landmarks:
                for landmarks in mesh_results.multi_face_landmarks:
                    mp_drawing.draw_landmarks(
                        image=overlay,
                        landmark_list=landmarks,
                        connections=mp_face_mesh.FACEMESH_TESSELATION,
                        landmark_drawing_spec=None,
                        connection_drawing_spec=mp_drawing.DrawingSpec(
                            color=MESH_COLOR, thickness=1, circle_radius=1
                        ),
                    )
                    mp_drawing.draw_landmarks(
                        image=overlay,
                        landmark_list=landmarks,
                        connections=mp_face_mesh.FACEMESH_CONTOURS,
                        landmark_drawing_spec=None,
                        connection_drawing_spec=mp_drawing.DrawingSpec(
                            color=PRIMARY_COLOR, thickness=1, circle_radius=1
                        ),
                    )

            frame = cv2.addWeighted(overlay, 0.85, frame, 0.15, 0)

            cv2.imshow("AR Face Tracker", frame)
            frame_count += 1
            key = cv2.waitKey(1) & 0xFF
            if key in (ord("q"), 27):
                break

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
```

**Run it:**
```bash
python face_tracker.py
```
Nothing new appears on screen — the window should look exactly like Session 2. That's expected: this step adds a function nothing calls yet. The check here is that the program still starts and shows the mesh with no errors.

**Why it matters:** The face mesh gives every landmark an x and y as a fraction of the image (0.0 to 1.0), so pt(idx) multiplies by img_w and img_h to get pixel positions. The six indices are specific numbered points on the mesh: the outer corner of each eye (33 and 263), the two mouth corners (61 and 291), and the middle of the upper and lower lip (13 and 14). math.hypot(dx, dy) is just the straight-line distance between two points. The key idea is dividing every mouth measurement by interocular (the distance between the eyes): a face close to the camera is bigger in pixels than a face far away, but the eye-to-eye distance grows and shrinks by the same amount, so "mouth width / eye distance" is the same number at arm's length or nose-to-lens. It turns pixels into fractions of a face. The three results are mouth_width (corner to corner), mouth_height (top lip to bottom lip), and corner_lift. corner_lift compares the middle of the mouth to the average height of the two corners — and because image y grows downward, a smile (corners higher than the center) makes mouth_center_y minus corner_avg_y positive, while a frown makes it negative. The if interocular < 1e-3: return None guard exists because dividing by a number near zero would produce garbage; returning None lets whoever calls the function skip that frame instead of crashing.

**Common problems:**
- NameError: name 'math' is not defined — but only later, in Step 3 — Forgetting import math at the top doesn't fail now, because nothing calls mouth_metrics() yet. The error only appears once Step 3 starts using it, which makes it feel unrelated. If you see it later, come back to the imports.
- A typo in a landmark number gives no error, just a wrong mood later — Every index from 0 to 477 is a valid point on the mesh, so a mistyped one (say 16 instead of 61) still runs — it just measures the wrong spot on the face. Checking the six LM_ numbers against the list is the fastest fix.
- Why can corner_lift be negative? — Positive means the mouth corners sit higher than the middle of the mouth (a smile shape); negative means they sit lower (a frown shape); near zero is a flat mouth. Remember that image y grows downward, which is why the subtraction is center minus corners.
- Mixing up img_w and img_h inside pt() — lm.x pairs with img_w and lm.y pairs with img_h. Swapping them still runs, but every measurement is quietly distorted, and the mood readout later will feel randomly wrong.

---

## Step 2 — Decide the mood (classify_mood)

**Say:** Numbers alone don't say "happy." Now we write the function that looks at those three numbers and picks one of four labels — with one rule that's absolute, and two that are measured against a personal baseline we'll build in the next step.

**Full file so far:**
```python
import math

import cv2
import mediapipe as mp

CAM_SOURCE = 0  # laptop webcam. Lab PC + phone: "http://localhost:8080/video"

PRIMARY_COLOR = (255, 255, 0)
ACCENT_COLOR = (0, 255, 255)
MESH_COLOR = (255, 200, 0)
BRACKET_LEN = 30
BRACKET_THICKNESS = 3

# MediaPipe Face Mesh landmark indices used for the mood heuristic.
LM_LEFT_EYE_OUTER = 33
LM_RIGHT_EYE_OUTER = 263
LM_MOUTH_LEFT = 61
LM_MOUTH_RIGHT = 291
LM_MOUTH_TOP = 13
LM_MOUTH_BOTTOM = 14

# Mouth-openness threshold for SURPRISED is absolute (ratio to inter-eye        # ← new
# distance), since a neutral mouth is essentially always closed. HAPPY/SAD      # ← new
# instead compare against a per-person calibrated neutral baseline (see         # ← new
# mood_calibration below) because resting mouth width/shape varies a lot        # ← new
# from face to face - a fixed threshold under- or over-fires depending on       # ← new
# who's in frame.                                                               # ← new
MOOD_OPEN_MOUTH_RATIO = 0.22                                                    # ← new
MOOD_HAPPY_LIFT_DELTA = 0.035                                                   # ← new
MOOD_HAPPY_WIDTH_DELTA = 0.04                                                   # ← new
MOOD_SAD_LIFT_DELTA = -0.025                                                    # ← new


def draw_glow_line(img, pt1, pt2, color, thickness=1):
    """Draw a line with a soft outer glow to sell the 'AR' look."""
    cv2.line(img, pt1, pt2, color, thickness + 3, cv2.LINE_AA)
    cv2.line(img, pt1, pt2, (255, 255, 255), max(1, thickness - 1), cv2.LINE_AA)


def draw_corner_brackets(img, x1, y1, x2, y2, color):
    """Draw targeting-reticle style corner brackets instead of a plain box."""
    corners = [
        ((x1, y1), (1, 0), (0, 1)),
        ((x2, y1), (-1, 0), (0, 1)),
        ((x1, y2), (1, 0), (0, -1)),
        ((x2, y2), (-1, 0), (0, -1)),
    ]
    for (cx, cy), dx, dy in corners:
        p1 = (cx + dx[0] * BRACKET_LEN, cy)
        p2 = (cx, cy)
        p3 = (cx, cy + dy[1] * BRACKET_LEN)
        draw_glow_line(img, p1, p2, color, BRACKET_THICKNESS)
        draw_glow_line(img, p2, p3, color, BRACKET_THICKNESS)


def draw_hud_text(img, text, org, color, scale=0.55, thickness=1):
    cv2.putText(img, text, org, cv2.FONT_HERSHEY_SIMPLEX, scale, (0, 0, 0), thickness + 3, cv2.LINE_AA)
    cv2.putText(img, text, org, cv2.FONT_HERSHEY_SIMPLEX, scale, color, thickness, cv2.LINE_AA)


def mouth_metrics(landmarks, img_w, img_h):
    """Mouth width, mouth height, and corner lift, all normalized by
    inter-eye distance so they hold up regardless of how close a face is
    to the camera. Returns None if the eyes are degenerately close
    (shouldn't happen with a real face)."""

    def pt(idx):
        lm = landmarks.landmark[idx]
        return lm.x * img_w, lm.y * img_h

    left_eye = pt(LM_LEFT_EYE_OUTER)
    right_eye = pt(LM_RIGHT_EYE_OUTER)
    interocular = math.hypot(right_eye[0] - left_eye[0], right_eye[1] - left_eye[1])
    if interocular < 1e-3:
        return None

    mouth_left = pt(LM_MOUTH_LEFT)
    mouth_right = pt(LM_MOUTH_RIGHT)
    mouth_top = pt(LM_MOUTH_TOP)
    mouth_bottom = pt(LM_MOUTH_BOTTOM)

    mouth_width = math.hypot(mouth_right[0] - mouth_left[0], mouth_right[1] - mouth_left[1]) / interocular
    mouth_height = math.hypot(mouth_bottom[0] - mouth_top[0], mouth_bottom[1] - mouth_top[1]) / interocular

    mouth_center_y = (mouth_top[1] + mouth_bottom[1]) / 2
    corner_avg_y = (mouth_left[1] + mouth_right[1]) / 2
    corner_lift = (mouth_center_y - corner_avg_y) / interocular  # positive: corners raised (smile)

    return mouth_width, mouth_height, corner_lift


def classify_mood(metrics, baseline):                                           # ← new
    """Classify mood from mouth_metrics() output. `baseline` is the             # ← new
    (mouth_width, corner_lift) measured during calibration on this              # ← new
    person's neutral face - HAPPY/SAD are relative to that, not absolute,       # ← new
    since resting mouth shape varies a lot between faces."""                    # ← new
    mouth_width, mouth_height, corner_lift = metrics                            # ← new
    if mouth_height > MOOD_OPEN_MOUTH_RATIO:                                    # ← new
        return "SURPRISED"                                                      # ← new

    base_width, base_lift = baseline                                            # ← new
    lift_delta = corner_lift - base_lift                                        # ← new
    width_delta = mouth_width - base_width                                      # ← new

    if lift_delta > MOOD_HAPPY_LIFT_DELTA and width_delta > MOOD_HAPPY_WIDTH_DELTA:  # ← new
        return "HAPPY"                                                          # ← new
    if lift_delta < MOOD_SAD_LIFT_DELTA:                                        # ← new
        return "SAD"                                                            # ← new
    return "NEUTRAL"                                                            # ← new


def draw_scan_line(img, frame_count, color, top, bottom, left, right):
    """An animated horizontal scan line sweeping through the face box."""
    span = bottom - top
    if span <= 0:
        return
    offset = frame_count % 60
    y = top + int((offset / 60) * span)
    cv2.line(img, (left, y), (right, y), color, 1, cv2.LINE_AA)


def main():
    mp_face_mesh = mp.solutions.face_mesh
    mp_face_detection = mp.solutions.face_detection
    mp_drawing = mp.solutions.drawing_utils
    mp_styles = mp.solutions.drawing_styles

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

    frame_count = 0

    print("AR Face Tracker running. Press 'q' to quit.")

    with mp_face_mesh.FaceMesh(
        max_num_faces=2,
        refine_landmarks=True,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    ) as face_mesh, mp_face_detection.FaceDetection(
        model_selection=0, min_detection_confidence=0.6
    ) as face_detection:

        while True:
            ok, frame = cap.read()
            if not ok:
                break

            frame = cv2.flip(frame, 1)
            h, w = frame.shape[:2]
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            rgb.flags.writeable = False

            det_results = face_detection.process(rgb)
            mesh_results = face_mesh.process(rgb)

            overlay = frame.copy()

            if det_results.detections:
                for det in det_results.detections:
                    box = det.location_data.relative_bounding_box
                    x1 = max(0, int(box.xmin * w) - 15)
                    y1 = max(0, int(box.ymin * h) - 15)
                    x2 = min(w, int((box.xmin + box.width) * w) + 15)
                    y2 = min(h, int((box.ymin + box.height) * h) + 15)
                    draw_corner_brackets(overlay, x1, y1, x2, y2, PRIMARY_COLOR)
                    draw_scan_line(overlay, frame_count, ACCENT_COLOR, y1, y2, x1, x2)
                    conf = det.score[0] if det.score else 0.0
                    draw_hud_text(
                        overlay, f"FACE LOCK  {conf * 100:4.1f}%",
                        (x1, max(20, y1 - 12)), PRIMARY_COLOR, 0.5,
                    )

            if mesh_results.multi_face_landmarks:
                for landmarks in mesh_results.multi_face_landmarks:
                    mp_drawing.draw_landmarks(
                        image=overlay,
                        landmark_list=landmarks,
                        connections=mp_face_mesh.FACEMESH_TESSELATION,
                        landmark_drawing_spec=None,
                        connection_drawing_spec=mp_drawing.DrawingSpec(
                            color=MESH_COLOR, thickness=1, circle_radius=1
                        ),
                    )
                    mp_drawing.draw_landmarks(
                        image=overlay,
                        landmark_list=landmarks,
                        connections=mp_face_mesh.FACEMESH_CONTOURS,
                        landmark_drawing_spec=None,
                        connection_drawing_spec=mp_drawing.DrawingSpec(
                            color=PRIMARY_COLOR, thickness=1, circle_radius=1
                        ),
                    )

            frame = cv2.addWeighted(overlay, 0.85, frame, 0.15, 0)

            cv2.imshow("AR Face Tracker", frame)
            frame_count += 1
            key = cv2.waitKey(1) & 0xFF
            if key in (ord("q"), 27):
                break

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
```

**Run it:**
```bash
python face_tracker.py
```
Again nothing new on screen — this step adds another function nothing calls yet. The window should still look exactly like Session 2, with no errors.

**Why it matters:** SURPRISED uses an absolute rule: if mouth_height is above MOOD_OPEN_MOUTH_RATIO (0.22 of the eye distance), the mouth is wide open. That works for everyone because a resting mouth is basically always closed, and the threshold is already scaled by eye distance so it holds at any distance from the camera. HAPPY and SAD are different: people's resting mouths vary a lot — some are naturally wide, some naturally turn up or down at the corners — so a fixed cutoff would call some people permanently happy and others permanently sad. Instead, classify_mood takes a baseline (this person's neutral width and neutral lift) and looks at the difference from it: lift_delta and width_delta. HAPPY needs both the corners lifted more than 0.035 above baseline and the mouth wider than baseline by more than 0.04 — a real smile does both, and requiring both stops a small twitch of one from triggering it. SAD only needs the corners to drop by more than 0.025 below baseline (which is why MOOD_SAD_LIFT_DELTA is negative). The order of the checks matters: SURPRISED returns first so a wide-open mouth is never mislabeled, then HAPPY, then SAD, and NEUTRAL is what's left when nothing else matched. These threshold numbers were tuned by trial and error — treat them as starting points you can change, not laws of nature.

**Common problems:**
- The label flickers back and forth between two moods — When a measurement hovers right at a threshold, tiny frame-to-frame noise pushes it over and back. Nothing in this program smooths the result over time, by design — a fix (like requiring the same answer for several frames in a row) is a good extension, but it isn't built here.
- SURPRISED flashes while someone is just talking or yawning — The rule only sees an open mouth, and a talking mouth opens past 0.22 too. It can't tell surprise from speech — an honest limit of using one measurement, worth saying out loud.
- SAD triggers almost constantly (or never) — MOOD_SAD_LIFT_DELTA has to be negative (-0.025) because a dropped corner is a negative change. Typing it as a positive 0.025 flips the meaning and makes SAD fire whenever the corners are even slightly above baseline.
- TypeError: cannot unpack non-iterable NoneType object — mouth_metrics() can return None, and classify_mood() unpacks its input straight away. Step 4 guards for this by only calling classify_mood when metrics is not None — if you call it earlier without that check, this is the error you'll see.

---

## Step 3 — Calibrate to a neutral face

**Say:** HAPPY and SAD mean "different from your normal," so the program has to learn your normal first. When you press E, it spends 20 frames measuring your neutral face and averages them into a baseline.

**Full file so far:**
```python
import math

import cv2
import mediapipe as mp

CAM_SOURCE = 0  # laptop webcam. Lab PC + phone: "http://localhost:8080/video"

PRIMARY_COLOR = (255, 255, 0)
ACCENT_COLOR = (0, 255, 255)
MESH_COLOR = (255, 200, 0)
BRACKET_LEN = 30
BRACKET_THICKNESS = 3

# MediaPipe Face Mesh landmark indices used for the mood heuristic.
LM_LEFT_EYE_OUTER = 33
LM_RIGHT_EYE_OUTER = 263
LM_MOUTH_LEFT = 61
LM_MOUTH_RIGHT = 291
LM_MOUTH_TOP = 13
LM_MOUTH_BOTTOM = 14

# Mouth-openness threshold for SURPRISED is absolute (ratio to inter-eye
# distance), since a neutral mouth is essentially always closed. HAPPY/SAD
# instead compare against a per-person calibrated neutral baseline (see
# mood_calibration below) because resting mouth width/shape varies a lot
# from face to face - a fixed threshold under- or over-fires depending on
# who's in frame.
MOOD_OPEN_MOUTH_RATIO = 0.22
MOOD_CALIBRATION_FRAMES = 20                                                    # ← new
MOOD_HAPPY_LIFT_DELTA = 0.035
MOOD_HAPPY_WIDTH_DELTA = 0.04
MOOD_SAD_LIFT_DELTA = -0.025


def draw_glow_line(img, pt1, pt2, color, thickness=1):
    """Draw a line with a soft outer glow to sell the 'AR' look."""
    cv2.line(img, pt1, pt2, color, thickness + 3, cv2.LINE_AA)
    cv2.line(img, pt1, pt2, (255, 255, 255), max(1, thickness - 1), cv2.LINE_AA)


def draw_corner_brackets(img, x1, y1, x2, y2, color):
    """Draw targeting-reticle style corner brackets instead of a plain box."""
    corners = [
        ((x1, y1), (1, 0), (0, 1)),
        ((x2, y1), (-1, 0), (0, 1)),
        ((x1, y2), (1, 0), (0, -1)),
        ((x2, y2), (-1, 0), (0, -1)),
    ]
    for (cx, cy), dx, dy in corners:
        p1 = (cx + dx[0] * BRACKET_LEN, cy)
        p2 = (cx, cy)
        p3 = (cx, cy + dy[1] * BRACKET_LEN)
        draw_glow_line(img, p1, p2, color, BRACKET_THICKNESS)
        draw_glow_line(img, p2, p3, color, BRACKET_THICKNESS)


def draw_hud_text(img, text, org, color, scale=0.55, thickness=1):
    cv2.putText(img, text, org, cv2.FONT_HERSHEY_SIMPLEX, scale, (0, 0, 0), thickness + 3, cv2.LINE_AA)
    cv2.putText(img, text, org, cv2.FONT_HERSHEY_SIMPLEX, scale, color, thickness, cv2.LINE_AA)


def mouth_metrics(landmarks, img_w, img_h):
    """Mouth width, mouth height, and corner lift, all normalized by
    inter-eye distance so they hold up regardless of how close a face is
    to the camera. Returns None if the eyes are degenerately close
    (shouldn't happen with a real face)."""

    def pt(idx):
        lm = landmarks.landmark[idx]
        return lm.x * img_w, lm.y * img_h

    left_eye = pt(LM_LEFT_EYE_OUTER)
    right_eye = pt(LM_RIGHT_EYE_OUTER)
    interocular = math.hypot(right_eye[0] - left_eye[0], right_eye[1] - left_eye[1])
    if interocular < 1e-3:
        return None

    mouth_left = pt(LM_MOUTH_LEFT)
    mouth_right = pt(LM_MOUTH_RIGHT)
    mouth_top = pt(LM_MOUTH_TOP)
    mouth_bottom = pt(LM_MOUTH_BOTTOM)

    mouth_width = math.hypot(mouth_right[0] - mouth_left[0], mouth_right[1] - mouth_left[1]) / interocular
    mouth_height = math.hypot(mouth_bottom[0] - mouth_top[0], mouth_bottom[1] - mouth_top[1]) / interocular

    mouth_center_y = (mouth_top[1] + mouth_bottom[1]) / 2
    corner_avg_y = (mouth_left[1] + mouth_right[1]) / 2
    corner_lift = (mouth_center_y - corner_avg_y) / interocular  # positive: corners raised (smile)

    return mouth_width, mouth_height, corner_lift


def classify_mood(metrics, baseline):
    """Classify mood from mouth_metrics() output. `baseline` is the
    (mouth_width, corner_lift) measured during calibration on this
    person's neutral face - HAPPY/SAD are relative to that, not absolute,
    since resting mouth shape varies a lot between faces."""
    mouth_width, mouth_height, corner_lift = metrics
    if mouth_height > MOOD_OPEN_MOUTH_RATIO:
        return "SURPRISED"

    base_width, base_lift = baseline
    lift_delta = corner_lift - base_lift
    width_delta = mouth_width - base_width

    if lift_delta > MOOD_HAPPY_LIFT_DELTA and width_delta > MOOD_HAPPY_WIDTH_DELTA:
        return "HAPPY"
    if lift_delta < MOOD_SAD_LIFT_DELTA:
        return "SAD"
    return "NEUTRAL"


def landmarks_bounding_box(landmarks, img_w, img_h):                            # ← new
    xs = [lm.x for lm in landmarks.landmark]                                    # ← new
    ys = [lm.y for lm in landmarks.landmark]                                    # ← new
    return (                                                                    # ← new
        int(min(xs) * img_w),                                                   # ← new
        int(min(ys) * img_h),                                                   # ← new
        int(max(xs) * img_w),                                                   # ← new
        int(max(ys) * img_h),                                                   # ← new
    )                                                                           # ← new


def draw_scan_line(img, frame_count, color, top, bottom, left, right):
    """An animated horizontal scan line sweeping through the face box."""
    span = bottom - top
    if span <= 0:
        return
    offset = frame_count % 60
    y = top + int((offset / 60) * span)
    cv2.line(img, (left, y), (right, y), color, 1, cv2.LINE_AA)


def main():
    mp_face_mesh = mp.solutions.face_mesh
    mp_face_detection = mp.solutions.face_detection
    mp_drawing = mp.solutions.drawing_utils
    mp_styles = mp.solutions.drawing_styles

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

    show_mood = False                                                           # ← new
    frame_count = 0

    mood_calibrating = False                                                    # ← new
    mood_calib_count = 0                                                        # ← new
    mood_calib_sum_width = 0.0                                                  # ← new
    mood_calib_sum_lift = 0.0                                                   # ← new
    mood_baseline = (0.6, 0.0)  # (mouth_width, corner_lift) - overwritten on calibration  # ← new

    print("AR Face Tracker running. Press 'q' to quit.")

    with mp_face_mesh.FaceMesh(
        max_num_faces=2,
        refine_landmarks=True,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    ) as face_mesh, mp_face_detection.FaceDetection(
        model_selection=0, min_detection_confidence=0.6
    ) as face_detection:

        while True:
            ok, frame = cap.read()
            if not ok:
                break

            frame = cv2.flip(frame, 1)
            h, w = frame.shape[:2]
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            rgb.flags.writeable = False

            det_results = face_detection.process(rgb)
            mesh_results = face_mesh.process(rgb)

            overlay = frame.copy()

            if det_results.detections:
                for det in det_results.detections:
                    box = det.location_data.relative_bounding_box
                    x1 = max(0, int(box.xmin * w) - 15)
                    y1 = max(0, int(box.ymin * h) - 15)
                    x2 = min(w, int((box.xmin + box.width) * w) + 15)
                    y2 = min(h, int((box.ymin + box.height) * h) + 15)
                    draw_corner_brackets(overlay, x1, y1, x2, y2, PRIMARY_COLOR)
                    draw_scan_line(overlay, frame_count, ACCENT_COLOR, y1, y2, x1, x2)
                    conf = det.score[0] if det.score else 0.0
                    draw_hud_text(
                        overlay, f"FACE LOCK  {conf * 100:4.1f}%",
                        (x1, max(20, y1 - 12)), PRIMARY_COLOR, 0.5,
                    )

            if mesh_results.multi_face_landmarks:
                if show_mood and mood_calibrating:                              # ← new
                    metrics = mouth_metrics(mesh_results.multi_face_landmarks[0], w, h)  # ← new
                    if metrics is not None:                                     # ← new
                        mood_calib_sum_width += metrics[0]                      # ← new
                        mood_calib_sum_lift += metrics[2]                       # ← new
                        mood_calib_count += 1                                   # ← new
                        if mood_calib_count >= MOOD_CALIBRATION_FRAMES:         # ← new
                            mood_baseline = (                                   # ← new
                                mood_calib_sum_width / mood_calib_count,        # ← new
                                mood_calib_sum_lift / mood_calib_count,         # ← new
                            )                                                   # ← new
                            mood_calibrating = False                            # ← new

                for landmarks in mesh_results.multi_face_landmarks:
                    mp_drawing.draw_landmarks(
                        image=overlay,
                        landmark_list=landmarks,
                        connections=mp_face_mesh.FACEMESH_TESSELATION,
                        landmark_drawing_spec=None,
                        connection_drawing_spec=mp_drawing.DrawingSpec(
                            color=MESH_COLOR, thickness=1, circle_radius=1
                        ),
                    )
                    mp_drawing.draw_landmarks(
                        image=overlay,
                        landmark_list=landmarks,
                        connections=mp_face_mesh.FACEMESH_CONTOURS,
                        landmark_drawing_spec=None,
                        connection_drawing_spec=mp_drawing.DrawingSpec(
                            color=PRIMARY_COLOR, thickness=1, circle_radius=1
                        ),
                    )

                    if show_mood:                                               # ← new
                        mx1, my1, mx2, my2 = landmarks_bounding_box(landmarks, w, h)  # ← new
                        label_pos = (mx1, min(h - 45, my2 + 25))                # ← new
                        if mood_calibrating:                                    # ← new
                            draw_hud_text(                                      # ← new
                                overlay,                                        # ← new
                                f"CALIBRATING... HOLD NEUTRAL FACE ({mood_calib_count}/{MOOD_CALIBRATION_FRAMES})",  # ← new
                                label_pos, (255, 255, 255), 0.5, 1,             # ← new
                            )                                                   # ← new

            frame = cv2.addWeighted(overlay, 0.85, frame, 0.15, 0)

            cv2.imshow("AR Face Tracker", frame)
            frame_count += 1
            key = cv2.waitKey(1) & 0xFF
            if key in (ord("q"), 27):
                break
            elif key == ord("e"):                                               # ← new
                show_mood = not show_mood                                       # ← new
                if show_mood:                                                   # ← new
                    mood_calibrating = True                                     # ← new
                    mood_calib_count = 0                                        # ← new
                    mood_calib_sum_width = 0.0                                  # ← new
                    mood_calib_sum_lift = 0.0                                   # ← new

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
```

**Run it:**
```bash
python face_tracker.py
```
Click the window, then press E while holding a relaxed, neutral face. A line like "CALIBRATING... HOLD NEUTRAL FACE (7/20)" appears just under your chin and counts up to 20 within a second or two, then disappears. Nothing replaces it yet — the mood label arrives in the next step. Pressing E again turns the feature off.

**Why it matters:** Six new variables set up the calibration: show_mood (is the feature on — off by default so the screen isn't busy), mood_calibrating (are we sampling right now), mood_calib_count plus two running sums (so the average can be computed at the end), and mood_baseline — a starting placeholder of (0.6, 0.0) that is replaced the moment calibration finishes. They must be created once, before the loop; creating them inside the loop would reset them every frame and the counter would never get past 1. Each frame while calibrating, the code measures the first detected face ([0]) and adds its mouth width (metrics[0]) and corner lift (metrics[2]) to the running sums — it skips height (metrics[1]) because only HAPPY and SAD use a baseline, and SURPRISED is absolute. When the count reaches MOOD_CALIBRATION_FRAMES (20) it divides each sum by the count to get the averages, stores them as mood_baseline, and turns calibrating off. Why average 20 frames instead of using one? A single frame is noisy — landmarks jitter slightly, and one frame might catch a blink or a twitch — averaging smooths that out. The E key both toggles the feature and resets the count and sums to zero, so a second calibration never mixes in leftovers from the first. landmarks_bounding_box takes the smallest and largest x and y among all the mesh points to get a box around the whole face; label_pos uses its left edge and bottom edge to put the text just under the chin, and min(h - 45, ...) keeps that text from running off the bottom of the window. (It also unpacks mx2 and my1 without using them — another small honest bit of leftover code.)

**Common problems:**
- Pressing E does nothing — Three usual causes: the video window isn't focused (click it first); no face is in frame, so there's nothing to measure and nothing to draw; or Caps Lock is on — waitKey then reports a capital E, and ord("e") only matches lowercase.
- The counter gets stuck below 20 — A frame only counts if a face was found in it. If you leave the frame or the face is lost, the count pauses; bring your face back and it continues.
- The counter shows 1/20 forever — The setup variables were typed inside the while loop instead of before it, so they reset to zero every frame. They belong up with frame_count, before the with block.
- Calibrated while smiling or talking, and now everything reads wrong — The baseline is only as good as the face you held while it was measuring. If it was taken mid-smile, HAPPY becomes hard to trigger and a relaxed face can read as SAD. Recalibrate with a truly neutral face — the R key in the next step does exactly that.

---

## Step 4 — Show the mood — and recalibrate with R

**Say:** Calibration is done, so now we finally use the result. After the 20 frames, the label switches from CALIBRATING to a live MOOD readout, colored by mood. And R lets you redo the calibration any time — like when a different person sits down.

**Full file so far:**
```python
import math

import cv2
import mediapipe as mp

CAM_SOURCE = 0  # laptop webcam. Lab PC + phone: "http://localhost:8080/video"

PRIMARY_COLOR = (255, 255, 0)
ACCENT_COLOR = (0, 255, 255)
MESH_COLOR = (255, 200, 0)
BRACKET_LEN = 30
BRACKET_THICKNESS = 3

# MediaPipe Face Mesh landmark indices used for the mood heuristic.
LM_LEFT_EYE_OUTER = 33
LM_RIGHT_EYE_OUTER = 263
LM_MOUTH_LEFT = 61
LM_MOUTH_RIGHT = 291
LM_MOUTH_TOP = 13
LM_MOUTH_BOTTOM = 14

# Mouth-openness threshold for SURPRISED is absolute (ratio to inter-eye
# distance), since a neutral mouth is essentially always closed. HAPPY/SAD
# instead compare against a per-person calibrated neutral baseline (see
# mood_calibration below) because resting mouth width/shape varies a lot
# from face to face - a fixed threshold under- or over-fires depending on
# who's in frame.
MOOD_OPEN_MOUTH_RATIO = 0.22
MOOD_CALIBRATION_FRAMES = 20
MOOD_HAPPY_LIFT_DELTA = 0.035
MOOD_HAPPY_WIDTH_DELTA = 0.04
MOOD_SAD_LIFT_DELTA = -0.025

MOOD_COLORS = {                                                                 # ← new
    "HAPPY": (0, 220, 0),                                                       # ← new
    "SURPRISED": (0, 165, 255),                                                 # ← new
    "SAD": (255, 120, 0),                                                       # ← new
    "NEUTRAL": (200, 200, 200),                                                 # ← new
}                                                                               # ← new


def draw_glow_line(img, pt1, pt2, color, thickness=1):
    """Draw a line with a soft outer glow to sell the 'AR' look."""
    cv2.line(img, pt1, pt2, color, thickness + 3, cv2.LINE_AA)
    cv2.line(img, pt1, pt2, (255, 255, 255), max(1, thickness - 1), cv2.LINE_AA)


def draw_corner_brackets(img, x1, y1, x2, y2, color):
    """Draw targeting-reticle style corner brackets instead of a plain box."""
    corners = [
        ((x1, y1), (1, 0), (0, 1)),
        ((x2, y1), (-1, 0), (0, 1)),
        ((x1, y2), (1, 0), (0, -1)),
        ((x2, y2), (-1, 0), (0, -1)),
    ]
    for (cx, cy), dx, dy in corners:
        p1 = (cx + dx[0] * BRACKET_LEN, cy)
        p2 = (cx, cy)
        p3 = (cx, cy + dy[1] * BRACKET_LEN)
        draw_glow_line(img, p1, p2, color, BRACKET_THICKNESS)
        draw_glow_line(img, p2, p3, color, BRACKET_THICKNESS)


def draw_hud_text(img, text, org, color, scale=0.55, thickness=1):
    cv2.putText(img, text, org, cv2.FONT_HERSHEY_SIMPLEX, scale, (0, 0, 0), thickness + 3, cv2.LINE_AA)
    cv2.putText(img, text, org, cv2.FONT_HERSHEY_SIMPLEX, scale, color, thickness, cv2.LINE_AA)


def mouth_metrics(landmarks, img_w, img_h):
    """Mouth width, mouth height, and corner lift, all normalized by
    inter-eye distance so they hold up regardless of how close a face is
    to the camera. Returns None if the eyes are degenerately close
    (shouldn't happen with a real face)."""

    def pt(idx):
        lm = landmarks.landmark[idx]
        return lm.x * img_w, lm.y * img_h

    left_eye = pt(LM_LEFT_EYE_OUTER)
    right_eye = pt(LM_RIGHT_EYE_OUTER)
    interocular = math.hypot(right_eye[0] - left_eye[0], right_eye[1] - left_eye[1])
    if interocular < 1e-3:
        return None

    mouth_left = pt(LM_MOUTH_LEFT)
    mouth_right = pt(LM_MOUTH_RIGHT)
    mouth_top = pt(LM_MOUTH_TOP)
    mouth_bottom = pt(LM_MOUTH_BOTTOM)

    mouth_width = math.hypot(mouth_right[0] - mouth_left[0], mouth_right[1] - mouth_left[1]) / interocular
    mouth_height = math.hypot(mouth_bottom[0] - mouth_top[0], mouth_bottom[1] - mouth_top[1]) / interocular

    mouth_center_y = (mouth_top[1] + mouth_bottom[1]) / 2
    corner_avg_y = (mouth_left[1] + mouth_right[1]) / 2
    corner_lift = (mouth_center_y - corner_avg_y) / interocular  # positive: corners raised (smile)

    return mouth_width, mouth_height, corner_lift


def classify_mood(metrics, baseline):
    """Classify mood from mouth_metrics() output. `baseline` is the
    (mouth_width, corner_lift) measured during calibration on this
    person's neutral face - HAPPY/SAD are relative to that, not absolute,
    since resting mouth shape varies a lot between faces."""
    mouth_width, mouth_height, corner_lift = metrics
    if mouth_height > MOOD_OPEN_MOUTH_RATIO:
        return "SURPRISED"

    base_width, base_lift = baseline
    lift_delta = corner_lift - base_lift
    width_delta = mouth_width - base_width

    if lift_delta > MOOD_HAPPY_LIFT_DELTA and width_delta > MOOD_HAPPY_WIDTH_DELTA:
        return "HAPPY"
    if lift_delta < MOOD_SAD_LIFT_DELTA:
        return "SAD"
    return "NEUTRAL"


def landmarks_bounding_box(landmarks, img_w, img_h):
    xs = [lm.x for lm in landmarks.landmark]
    ys = [lm.y for lm in landmarks.landmark]
    return (
        int(min(xs) * img_w),
        int(min(ys) * img_h),
        int(max(xs) * img_w),
        int(max(ys) * img_h),
    )


def draw_scan_line(img, frame_count, color, top, bottom, left, right):
    """An animated horizontal scan line sweeping through the face box."""
    span = bottom - top
    if span <= 0:
        return
    offset = frame_count % 60
    y = top + int((offset / 60) * span)
    cv2.line(img, (left, y), (right, y), color, 1, cv2.LINE_AA)


def main():
    mp_face_mesh = mp.solutions.face_mesh
    mp_face_detection = mp.solutions.face_detection
    mp_drawing = mp.solutions.drawing_utils
    mp_styles = mp.solutions.drawing_styles

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

    show_mood = False
    frame_count = 0

    mood_calibrating = False
    mood_calib_count = 0
    mood_calib_sum_width = 0.0
    mood_calib_sum_lift = 0.0
    mood_baseline = (0.6, 0.0)  # (mouth_width, corner_lift) - overwritten on calibration

    print("AR Face Tracker running. Press 'q' to quit.")

    with mp_face_mesh.FaceMesh(
        max_num_faces=2,
        refine_landmarks=True,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    ) as face_mesh, mp_face_detection.FaceDetection(
        model_selection=0, min_detection_confidence=0.6
    ) as face_detection:

        while True:
            ok, frame = cap.read()
            if not ok:
                break

            frame = cv2.flip(frame, 1)
            h, w = frame.shape[:2]
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            rgb.flags.writeable = False

            det_results = face_detection.process(rgb)
            mesh_results = face_mesh.process(rgb)

            overlay = frame.copy()

            if det_results.detections:
                for det in det_results.detections:
                    box = det.location_data.relative_bounding_box
                    x1 = max(0, int(box.xmin * w) - 15)
                    y1 = max(0, int(box.ymin * h) - 15)
                    x2 = min(w, int((box.xmin + box.width) * w) + 15)
                    y2 = min(h, int((box.ymin + box.height) * h) + 15)
                    draw_corner_brackets(overlay, x1, y1, x2, y2, PRIMARY_COLOR)
                    draw_scan_line(overlay, frame_count, ACCENT_COLOR, y1, y2, x1, x2)
                    conf = det.score[0] if det.score else 0.0
                    draw_hud_text(
                        overlay, f"FACE LOCK  {conf * 100:4.1f}%",
                        (x1, max(20, y1 - 12)), PRIMARY_COLOR, 0.5,
                    )

            if mesh_results.multi_face_landmarks:
                if show_mood and mood_calibrating:
                    metrics = mouth_metrics(mesh_results.multi_face_landmarks[0], w, h)
                    if metrics is not None:
                        mood_calib_sum_width += metrics[0]
                        mood_calib_sum_lift += metrics[2]
                        mood_calib_count += 1
                        if mood_calib_count >= MOOD_CALIBRATION_FRAMES:
                            mood_baseline = (
                                mood_calib_sum_width / mood_calib_count,
                                mood_calib_sum_lift / mood_calib_count,
                            )
                            mood_calibrating = False

                for landmarks in mesh_results.multi_face_landmarks:
                    mp_drawing.draw_landmarks(
                        image=overlay,
                        landmark_list=landmarks,
                        connections=mp_face_mesh.FACEMESH_TESSELATION,
                        landmark_drawing_spec=None,
                        connection_drawing_spec=mp_drawing.DrawingSpec(
                            color=MESH_COLOR, thickness=1, circle_radius=1
                        ),
                    )
                    mp_drawing.draw_landmarks(
                        image=overlay,
                        landmark_list=landmarks,
                        connections=mp_face_mesh.FACEMESH_CONTOURS,
                        landmark_drawing_spec=None,
                        connection_drawing_spec=mp_drawing.DrawingSpec(
                            color=PRIMARY_COLOR, thickness=1, circle_radius=1
                        ),
                    )

                    if show_mood:
                        mx1, my1, mx2, my2 = landmarks_bounding_box(landmarks, w, h)
                        label_pos = (mx1, min(h - 45, my2 + 25))
                        if mood_calibrating:
                            draw_hud_text(
                                overlay,
                                f"CALIBRATING... HOLD NEUTRAL FACE ({mood_calib_count}/{MOOD_CALIBRATION_FRAMES})",
                                label_pos, (255, 255, 255), 0.5, 1,
                            )
                        else:                                                   # ← new
                            metrics = mouth_metrics(landmarks, w, h)            # ← new
                            if metrics is not None:                             # ← new
                                mood = classify_mood(metrics, mood_baseline)    # ← new
                                draw_hud_text(                                  # ← new
                                    overlay, f"MOOD: {mood}",                   # ← new
                                    label_pos, MOOD_COLORS[mood], 0.6, 2,       # ← new
                                )                                               # ← new

            frame = cv2.addWeighted(overlay, 0.85, frame, 0.15, 0)

            cv2.imshow("AR Face Tracker", frame)
            frame_count += 1
            key = cv2.waitKey(1) & 0xFF
            if key in (ord("q"), 27):
                break
            elif key == ord("e"):
                show_mood = not show_mood
                if show_mood:
                    mood_calibrating = True
                    mood_calib_count = 0
                    mood_calib_sum_width = 0.0
                    mood_calib_sum_lift = 0.0
            elif key == ord("r"):                                               # ← new
                if show_mood:                                                   # ← new
                    mood_calibrating = True                                     # ← new
                    mood_calib_count = 0                                        # ← new
                    mood_calib_sum_width = 0.0                                  # ← new
                    mood_calib_sum_lift = 0.0                                   # ← new

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
```

**Run it:**
```bash
python face_tracker.py
```
Press E and hold a neutral face for a second. The label becomes "MOOD: NEUTRAL" in grey. Now smile widely — it should turn green HAPPY. Open your mouth wide — orange SURPRISED. Pull the corners of your mouth down — blue SAD. Press R with a neutral face to recalibrate at any time.

**Why it matters:** MOOD_COLORS is a dictionary: each mood name maps to a color, so MOOD_COLORS[mood] looks up the right color for whatever classify_mood returned. That means the keys must match the returned strings exactly, capital letters included. (The colors are in OpenCV's blue-green-red order, which is why HAPPY (0, 220, 0) is green and SAD (255, 120, 0) is blue.) The new else branch runs whenever calibration is not in progress: it measures the mouth again for each face in the loop, and if metrics is not None it classifies with the saved baseline and draws "MOOD: ..." in a slightly larger, bolder font than the calibration message. One honest limitation: calibration only samples the first face, but this branch labels every face — so with two people in frame, both are judged against the first person's baseline. The R key is the same reset as E's, but guarded by if show_mood: — recalibrating while the feature is off would start a calibration that draws nothing. The reset lines are copied in two places (E and R); a real project would pull them into a small function, but keeping them inline here makes each key's behavior easy to read.

**Common problems:**
- Everything reads HAPPY (or everything reads SAD) right after calibrating — The baseline was taken while the face wasn't neutral. Relax the face completely and press R to measure again.
- A different person sits down and the labels feel off — The baseline belongs to whoever was there when it was measured. Press R with the new person holding a neutral face — this is exactly why the key exists, and it's easy to forget.
- KeyError: 'HAPPY' (or another mood name) — MOOD_COLORS[mood] needs the dictionary keys to match what classify_mood returns letter for letter. A misspelled or differently-capitalized key raises this error the first time that mood is shown.
- The text is cut off or sits oddly near the bottom of the window — label_pos places the text under the chin and clamps it with min(h - 45, ...) so it can't run off the bottom. If the face is very low in frame the label stops moving down — expected, not a bug.

---

## Wrap-up (say this before ending the session)

"The program now measures a mouth, learns what "normal" looks like for whoever is sitting there, and labels the mood live. Next session: themes, screenshots, the remaining keyboard controls, and an FPS readout — which finishes face_tracker.py."
