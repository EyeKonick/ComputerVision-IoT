import type { Session } from "../types";

// Full-cumulative-file text + new-line indices verified programmatically
// against this session's own "Full file so far" checkpoint (Step 1) and
// Hand Session 4's Step 1, which restates this session's complete final
// file as its own unmarked context. See the conversion ticket for the
// verification script. Two minor, harmless whitespace/comment differences
// between this session's own content and how Hand Session 4 later restates
// it (comment alignment on SKELETON_COLOR/JOINT_COLOR, and two explanatory
// comments inside count_fingers) were found during verification and are
// flagged on the ticket — this file follows Hand Session 3's own source
// faithfully, per the instructor-approved content.

const step1Code = `import collections
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

SKELETON_COLOR = (255, 0, 180)         # BGR: magenta-ish neon
SKELETON_GLOW_COLOR = (255, 120, 255)
JOINT_COLOR = (0, 255, 255)            # neon cyan

TRAIL_COLORS = [
    (255, 80, 80),    # thumb   - blue-ish
    (80, 255, 255),   # index   - yellow
    (80, 255, 80),    # middle  - green
    (255, 80, 255),   # ring    - magenta
    (80, 160, 255),   # pinky   - orange
]

HAND_CONNECTIONS = [(c.start, c.end) for c in vision.HandLandmarksConnections.HAND_CONNECTIONS]


def glow_line(img, p1, p2, color, glow_color, thickness=2):
    cv2.line(img, p1, p2, glow_color, thickness + 6, cv2.LINE_AA)
    cv2.line(img, p1, p2, color, thickness, cv2.LINE_AA)


def glow_circle(img, center, radius, color, glow_color):
    cv2.circle(img, center, radius + 8, glow_color, -1, cv2.LINE_AA)
    cv2.circle(img, center, radius, color, -1, cv2.LINE_AA)


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

        overlay_layer = np.zeros_like(frame)

        if result.hand_landmarks:
            for hand_idx, hand_landmarks in enumerate(result.hand_landmarks[:2]):
                pts = [(int(p.x * w), int(p.y * h)) for p in hand_landmarks]

                for a, b in HAND_CONNECTIONS:
                    glow_line(overlay_layer, pts[a], pts[b], SKELETON_COLOR, SKELETON_GLOW_COLOR, 2)
                for p in pts:
                    glow_circle(overlay_layer, p, 4, JOINT_COLOR, (0, 255, 255))

                # --- fingertip particle trails ---
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
    main()`;

const step2Code = `import collections
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

SKELETON_COLOR = (255, 0, 180)         # BGR: magenta-ish neon
SKELETON_GLOW_COLOR = (255, 120, 255)
JOINT_COLOR = (0, 255, 255)            # neon cyan

TRAIL_COLORS = [
    (255, 80, 80),    # thumb   - blue-ish
    (80, 255, 255),   # index   - yellow
    (80, 255, 80),    # middle  - green
    (255, 80, 255),   # ring    - magenta
    (80, 160, 255),   # pinky   - orange
]

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

    # Four fingers: tip farther from the wrist than its pip joint == extended.
    finger_tips_pips = [(8, 6), (12, 10), (16, 14), (20, 18)]
    for tip_id, pip_id in finger_tips_pips:
        if math.hypot(pts[tip_id][0] - wrist[0], pts[tip_id][1] - wrist[1]) > \\
           math.hypot(pts[pip_id][0] - wrist[0], pts[pip_id][1] - wrist[1]):
            extended += 1

    # Thumb: measured against the pinky's base instead, since a curled thumb
    # can still be "far" from the wrist even when folded across the palm.
    pinky_mcp = pts[17]
    thumb_tip_dist = math.hypot(pts[4][0] - pinky_mcp[0], pts[4][1] - pinky_mcp[1])
    thumb_ip_dist = math.hypot(pts[3][0] - pinky_mcp[0], pts[3][1] - pinky_mcp[1])
    if thumb_tip_dist > thumb_ip_dist:
        extended += 1

    return extended


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

        overlay_layer = np.zeros_like(frame)

        if result.hand_landmarks:
            for hand_idx, hand_landmarks in enumerate(result.hand_landmarks[:2]):
                pts = [(int(p.x * w), int(p.y * h)) for p in hand_landmarks]

                for a, b in HAND_CONNECTIONS:
                    glow_line(overlay_layer, pts[a], pts[b], SKELETON_COLOR, SKELETON_GLOW_COLOR, 2)
                for p in pts:
                    glow_circle(overlay_layer, p, 4, JOINT_COLOR, (0, 255, 255))

                # --- fingertip particle trails ---
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
    main()`;

const step3Code = `import collections
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

SKELETON_COLOR = (255, 0, 180)         # BGR: magenta-ish neon
SKELETON_GLOW_COLOR = (255, 120, 255)
JOINT_COLOR = (0, 255, 255)            # neon cyan

TRAIL_COLORS = [
    (255, 80, 80),    # thumb   - blue-ish
    (80, 255, 255),   # index   - yellow
    (80, 255, 80),    # middle  - green
    (255, 80, 255),   # ring    - magenta
    (80, 160, 255),   # pinky   - orange
]

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

    # Four fingers: tip farther from the wrist than its pip joint == extended.
    finger_tips_pips = [(8, 6), (12, 10), (16, 14), (20, 18)]
    for tip_id, pip_id in finger_tips_pips:
        if math.hypot(pts[tip_id][0] - wrist[0], pts[tip_id][1] - wrist[1]) > \\
           math.hypot(pts[pip_id][0] - wrist[0], pts[pip_id][1] - wrist[1]):
            extended += 1

    # Thumb: measured against the pinky's base instead, since a curled thumb
    # can still be "far" from the wrist even when folded across the palm.
    pinky_mcp = pts[17]
    thumb_tip_dist = math.hypot(pts[4][0] - pinky_mcp[0], pts[4][1] - pinky_mcp[1])
    thumb_ip_dist = math.hypot(pts[3][0] - pinky_mcp[0], pts[3][1] - pinky_mcp[1])
    if thumb_tip_dist > thumb_ip_dist:
        extended += 1

    return extended


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

        overlay_layer = np.zeros_like(frame)

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

                # --- fingertip particle trails ---
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

                # --- gesture readout ---
                finger_count = count_fingers(pts)
                thumb_tip = pts[THUMB_TIP_ID]
                index_tip = pts[INDEX_TIP_ID]
                pinch_dist = math.hypot(thumb_tip[0] - index_tip[0], thumb_tip[1] - index_tip[1])
                is_pinching = pinch_dist < PINCH_THRESHOLD

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
    main()`;

const step4Code = `import collections
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

SKELETON_COLOR = (255, 0, 180)         # BGR: magenta-ish neon
SKELETON_GLOW_COLOR = (255, 120, 255)
JOINT_COLOR = (0, 255, 255)            # neon cyan

TRAIL_COLORS = [
    (255, 80, 80),    # thumb   - blue-ish
    (80, 255, 255),   # index   - yellow
    (80, 255, 80),    # middle  - green
    (255, 80, 255),   # ring    - magenta
    (80, 160, 255),   # pinky   - orange
]

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

    # Four fingers: tip farther from the wrist than its pip joint == extended.
    finger_tips_pips = [(8, 6), (12, 10), (16, 14), (20, 18)]
    for tip_id, pip_id in finger_tips_pips:
        if math.hypot(pts[tip_id][0] - wrist[0], pts[tip_id][1] - wrist[1]) > \\
           math.hypot(pts[pip_id][0] - wrist[0], pts[pip_id][1] - wrist[1]):
            extended += 1

    # Thumb: measured against the pinky's base instead, since a curled thumb
    # can still be "far" from the wrist even when folded across the palm.
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

        overlay_layer = np.zeros_like(frame)

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

                # --- fingertip particle trails ---
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

                # --- gesture readout ---
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
                draw_text_with_bg(overlay_layer, status, (label_x, label_y),
                                   scale=0.7, color=(255, 255, 255), bg=(40, 0, 40))

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
    main()`;

export const handSession3: Session = {
  id: "hand-s3",
  sessionNumber: 3,
  track: "Hand Tracking (3 of 4)",
  title: "Hand Tracking — Session 3 (Trails & Gesture Recognition)",
  syllabusMapping: "Module 10 — Hand Tracking & Gesture Control",
  buildsOn: "Hand Tracking Session 2's detected skeleton",
  sessionGoal:
    "Today your hand leaves a trail of light behind each fingertip, and the screen tells you how many fingers you're holding up — and whether you're pinching.",
  instructorNotes: [
    "Reminder of the code-display convention: each step shows the entire file so far, with lines added in that step marked as new.",
    "Heads up for the instructor: Step 1 (trails) is visible immediately — the payoff from last session's compositing means anything drawn on overlay_layer now shows up right away. Steps 2–3 (the finger-counting and pinch logic) are invisible again until Step 4 adds the on-screen readout — same \"build the logic, then reveal it\" rhythm as last session.",
  ],
  wrapUp:
    "Now every hand on screen shows you its own finger count and pinch state, with a trailing glow on every fingertip. Next session — the last one for this activity — we turn a pinch into an actual interaction: grabbing and dragging a virtual glowing orb.",
  steps: [
    {
      id: "hand-s3-1",
      index: 0,
      title: "Fingertip particle trails",
      say: "Every fingertip now leaves a short, fading trail of light behind it as it moves — like a comet tail.",
      file: {
        filename: "hand_ar.py",
        code: step1Code,
        newLineIndices: [0, 21, 22, 23, 28, 29, 30, 31, 32, 33, 34, 35, 81, 82, 83, 84, 85, 86, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123],
      },
      commands: [],
      runCommand: "python hand_ar.py",
      runResult: "Wave your hand around — you should see five short trails of colored light following each fingertip.",
      why: "trails is a list-of-lists: one slot per possible hand (range(2)), and inside each, one deque per tracked fingertip (FINGERTIP_IDS). A collections.deque(maxlen=TRAIL_LENGTH) is a list that automatically drops its oldest item once it's full — appending a new point to a full deque quietly pushes the oldest one out, which is exactly \"remember the last 18 positions\" with zero manual trimming logic. Each trail point is drawn smaller and dimmer the older it is (fade = i / n, applied to both radius and color), which is what creates the comet-tail look instead of a solid line. TRAIL_COLORS gives each of the 5 fingertips its own consistent color, so you can tell fingers apart even mid-motion.",
      glossary: [
        { term: "import collections", explanation: "brings in Python's built-in toolbox of extra list-like data structures." },
        { term: "collections.deque(maxlen=N)", explanation: "a list that automatically forgets its oldest item once it holds more than N items, like a rolling sticky-note pad." },
        { term: "trails[hand_idx][f_idx].append(...)", explanation: "adds a new item onto the end of a list (or deque)." },
        { term: "range(2)", explanation: "produces the sequence of numbers 0, 1 — here, just used to repeat something twice." },
        { term: "len(trail)", explanation: "tells you how many items are currently in a list (or deque)." },
        { term: "tuple(int(c * fade) for c in TRAIL_COLORS[f_idx]) (a generator expression)", explanation: "like a list comprehension, but built one item at a time; wrapped in tuple(...) here to turn it into a fixed group of numbers (the color)." },
      ],
      commonProblems: [
        "Choppy or overly short trails — TRAIL_LENGTH is the tunable knob; a great \"make it your own\" experiment for students who finish early.",
        "Trails can look like they \"jump\" if a hand briefly leaves and re-enters frame, since trails[hand_idx] is tracked by slot (first hand found, second hand found), not by a persistent hand identity — a one-line caveat worth mentioning, not something to fix today.",
        "Forgetting trails must be created once, outside the while loop (right before it starts) — if a student accidentally moves the trail-creation code inside the loop, every trail resets to empty every single frame and nothing ever appears to trail at all.",
      ],
    },
    {
      id: "hand-s3-2",
      index: 1,
      title: "Count extended fingers",
      say: "Next we teach the code to count how many fingers are held up — but the trick is doing it so it works no matter how the hand is rotated or tilted, not just when it's held perfectly upright.",
      file: {
        filename: "hand_ar.py",
        code: step2Code,
        newLineIndices: [1, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77],
      },
      commands: [],
      why: "A tempting shortcut would be \"a finger is extended if its tip is above its base\" — but that only works when the hand is held upright facing the camera; tilt or rotate the hand and it breaks immediately. Comparing distance from the wrist instead works no matter the hand's orientation: an extended finger's tip is simply farther from the wrist than the middle knuckle (pip) below it, curled or not. The thumb needs its own special case — MediaPipe's landmark numbering means a curled thumb can still measure \"far from the wrist,\" so instead it's compared against the pinky's base (pts[17]), which only reads as \"far\" when the thumb is genuinely stuck out to the side.",
      glossary: [
        { term: "import math", explanation: "brings in Python's built-in toolbox of math functions." },
        { term: "math.hypot(dx, dy)", explanation: "calculates the straight-line distance between two points, given the horizontal and vertical distance between them." },
        { term: '"""..."""  (a docstring)', explanation: "a description written right inside a function, explaining what it does; it doesn't affect how the code runs." },
        { term: "\\ at the end of a line", explanation: "tells Python \"this statement continues on the next line,\" used purely to keep long lines readable." },
      ],
      commonProblems: [
        "Finger count reading wrong at extreme angles (hand nearly edge-on to the camera) — the distance-based approach is far more robust than a simple axis comparison, but it isn't perfect; a brief live demo of tilting your hand and watching the count stay accurate (mostly) is a good moment to show why this approach was chosen over the naive one.",
        "Forgetting math needs importing — a NameError: name 'math' is not defined the first time this runs is a common, easy-to-diagnose mistake if the import gets missed during live coding.",
      ],
    },
    {
      id: "hand-s3-3",
      index: 2,
      title: "Pinch detection and the handedness label",
      say: 'Now we actually use count_fingers, figure out which hand is which ("Left"/"Right"), and detect a pinch — thumb and index fingertip close together.',
      file: {
        filename: "hand_ar.py",
        code: step3Code,
        newLineIndices: [24, 25, 39, 40, 139, 140, 141, 142, 162, 163, 164, 165, 166, 167, 168],
      },
      commands: [],
      why: "result.handedness is a separate list from result.hand_landmarks, lined up by index — result.handedness[hand_idx][0].category_name reads MediaPipe's own best guess of \"Left\" or \"Right\" for that hand. The default \"Right\" fallback covers the rare case where handedness data isn't available at all. Pinch detection is a straight-line distance (math.hypot, the same tool used inside count_fingers) between the thumb tip and index fingertip — smaller than PINCH_THRESHOLD pixels means \"close enough to call it a pinch.\"",
      glossary: [
        { term: "result.handedness", explanation: 'a separate list on the detection result, holding MediaPipe\'s best guess of "Left" or "Right" for each hand found, lined up in the same order as result.hand_landmarks.' },
        { term: ".category_name", explanation: 'reads the actual text label (like "Right") out of MediaPipe\'s guess.' },
        { term: "and (inside an if condition)", explanation: 'checks that both things on either side are true before continuing; here, "there is handedness data at all" and "there\'s an entry for this specific hand."' },
      ],
      commonProblems: [
        'Confusing "Right"/"Left" with what\'s on-screen — remember the whole frame is mirrored (cv2.flip from Session 1), so MediaPipe\'s "Right hand" is the hand that looks like it\'s on your right in the window, matching how a real mirror would show it — genuinely your right hand, not flipped.',
        "PINCH_THRESHOLD = 40 is tuned for a webcam roughly arm's length away at 1280px wide; a much closer or farther camera (or a very different resolution, especially on the phone-stream path) may need this number adjusted — worth a quick \"does pinch feel too sensitive or not sensitive enough?\" class check once Step 4 makes it visible.",
      ],
    },
    {
      id: "hand-s3-4",
      index: 3,
      title: "Show it: the on-screen gesture readout",
      say: "Finally, we put a label above each hand showing the finger count and pinch status, so all that math becomes something you can actually read.",
      file: {
        filename: "hand_ar.py",
        code: step4Code,
        newLineIndices: [82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 179, 180, 181, 182, 183, 184, 185, 186],
      },
      commands: [],
      runCommand: "python hand_ar.py",
      runResult:
        'You should now see a label near each detected hand reading something like "Right hand: 3 fingers", with "| PINCH" appended when your thumb and index finger touch.',
      why: "draw_text_with_bg is another two-layer trick, like glow_line/glow_circle — it draws a semi-transparent dark rectangle behind the text (via cv2.addWeighted blending a filled rectangle at alpha opacity) so the label stays readable no matter what's behind it in the live camera feed, then draws the actual text on top with cv2.putText. label_x/label_y position the label near the wrist (pts[0]) but clamped (min/max) so it never gets drawn partly off-screen when a hand is near an edge.",
      glossary: [
        { term: "cv2.FONT_HERSHEY_SIMPLEX", explanation: "one of OpenCV's built-in font styles for drawing text." },
        { term: "cv2.getTextSize(...)", explanation: "measures how much space a piece of text will take up before actually drawing it, in pixels." },
        { term: "img.copy()", explanation: "makes a completely separate duplicate of a picture, so changes to the copy don't affect the original." },
        { term: "cv2.putText(...)", explanation: "draws text onto a picture at a given position." },
        { term: 'f"{handedness_label} hand: {finger_count} fingers" (an f-string)', explanation: "builds a text string with variables' values inserted directly into it." },
        { term: "min(...) / max(...)", explanation: "pick the smaller or larger of two numbers; used here to keep a label from being drawn off-screen." },
      ],
      commonProblems: [
        "Text drawn on overlay_layer (not frame directly) — same reason as the skeleton and trails: it needs to go through the Session 2 compositing step to actually appear, keeping every visual element funneled through one consistent draw-then-blend pipeline.",
        "If two hands are close together, their labels can overlap and become hard to read — a fine, honest limitation to mention rather than a bug to chase down today.",
        "Students may ask why the finger count occasionally flickers by one when fingers are close together (e.g. a mostly-closed fist) — that's the distance-based heuristic being right at its own decision boundary, a good opening to talk about why gesture recognition like this is a heuristic, not a guarantee.",
      ],
    },
  ],
};
