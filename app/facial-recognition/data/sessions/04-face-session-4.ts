import type { Session } from "../types";
import { range } from "../lib";

const step1Code = `import math

import cv2
import mediapipe as mp

CAM_SOURCE = 0  # laptop webcam. Lab PC + phone: "http://localhost:8080/video"

THEMES = [
    {"name": "CYAN", "primary": (255, 255, 0), "accent": (0, 255, 255), "mesh": (255, 200, 0)},
    {"name": "MAGENTA", "primary": (255, 0, 255), "accent": (180, 0, 255), "mesh": (255, 100, 255)},
    {"name": "GREEN", "primary": (0, 255, 100), "accent": (0, 255, 0), "mesh": (0, 255, 150)},
    {"name": "AMBER", "primary": (0, 200, 255), "accent": (0, 165, 255), "mesh": (0, 220, 255)},
]

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

MOOD_COLORS = {
    "HAPPY": (0, 220, 0),
    "SURPRISED": (0, 165, 255),
    "SAD": (255, 120, 0),
    "NEUTRAL": (200, 200, 200),
}


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
    """Classify mood from mouth_metrics() output. \`baseline\` is the
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
    theme_idx = 0
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

            theme = THEMES[theme_idx]
            overlay = frame.copy()

            if det_results.detections:
                for det in det_results.detections:
                    box = det.location_data.relative_bounding_box
                    x1 = max(0, int(box.xmin * w) - 15)
                    y1 = max(0, int(box.ymin * h) - 15)
                    x2 = min(w, int((box.xmin + box.width) * w) + 15)
                    y2 = min(h, int((box.ymin + box.height) * h) + 15)
                    draw_corner_brackets(overlay, x1, y1, x2, y2, theme["primary"])
                    draw_scan_line(overlay, frame_count, theme["accent"], y1, y2, x1, x2)
                    conf = det.score[0] if det.score else 0.0
                    draw_hud_text(
                        overlay, f"FACE LOCK  {conf * 100:4.1f}%",
                        (x1, max(20, y1 - 12)), theme["primary"], 0.5,
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
                            color=theme["mesh"], thickness=1, circle_radius=1
                        ),
                    )
                    mp_drawing.draw_landmarks(
                        image=overlay,
                        landmark_list=landmarks,
                        connections=mp_face_mesh.FACEMESH_CONTOURS,
                        landmark_drawing_spec=None,
                        connection_drawing_spec=mp_drawing.DrawingSpec(
                            color=theme["primary"], thickness=1, circle_radius=1
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
                        else:
                            metrics = mouth_metrics(landmarks, w, h)
                            if metrics is not None:
                                mood = classify_mood(metrics, mood_baseline)
                                draw_hud_text(
                                    overlay, f"MOOD: {mood}",
                                    label_pos, MOOD_COLORS[mood], 0.6, 2,
                                )

            frame = cv2.addWeighted(overlay, 0.85, frame, 0.15, 0)

            # ---- top HUD bar ----
            cv2.rectangle(frame, (0, 0), (w, 40), (0, 0, 0), -1)
            draw_hud_text(frame, "AR FACE TRACKER", (12, 26), theme["primary"], 0.65, 2)
            draw_hud_text(frame, f"THEME: {theme['name']}", (w - 220, 26), theme["accent"], 0.5)

            cv2.imshow("AR Face Tracker", frame)
            frame_count += 1
            key = cv2.waitKey(1) & 0xFF
            if key in (ord("q"), 27):
                break
            elif key == ord("c"):
                theme_idx = (theme_idx + 1) % len(THEMES)
            elif key == ord("e"):
                show_mood = not show_mood
                if show_mood:
                    mood_calibrating = True
                    mood_calib_count = 0
                    mood_calib_sum_width = 0.0
                    mood_calib_sum_lift = 0.0
            elif key == ord("r"):
                if show_mood:
                    mood_calibrating = True
                    mood_calib_count = 0
                    mood_calib_sum_width = 0.0
                    mood_calib_sum_lift = 0.0

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()`;

const step2Code = `import math

import cv2
import mediapipe as mp

CAM_SOURCE = 0  # laptop webcam. Lab PC + phone: "http://localhost:8080/video"

THEMES = [
    {"name": "CYAN", "primary": (255, 255, 0), "accent": (0, 255, 255), "mesh": (255, 200, 0)},
    {"name": "MAGENTA", "primary": (255, 0, 255), "accent": (180, 0, 255), "mesh": (255, 100, 255)},
    {"name": "GREEN", "primary": (0, 255, 100), "accent": (0, 255, 0), "mesh": (0, 255, 150)},
    {"name": "AMBER", "primary": (0, 200, 255), "accent": (0, 165, 255), "mesh": (0, 220, 255)},
]

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

MOOD_COLORS = {
    "HAPPY": (0, 220, 0),
    "SURPRISED": (0, 165, 255),
    "SAD": (255, 120, 0),
    "NEUTRAL": (200, 200, 200),
}


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
    """Classify mood from mouth_metrics() output. \`baseline\` is the
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

    show_mesh = True
    show_box = True
    show_mood = False
    theme_idx = 0
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

            theme = THEMES[theme_idx]
            overlay = frame.copy()

            if det_results.detections:
                for det in det_results.detections:
                    box = det.location_data.relative_bounding_box
                    x1 = max(0, int(box.xmin * w) - 15)
                    y1 = max(0, int(box.ymin * h) - 15)
                    x2 = min(w, int((box.xmin + box.width) * w) + 15)
                    y2 = min(h, int((box.ymin + box.height) * h) + 15)

                    if show_box:
                        draw_corner_brackets(overlay, x1, y1, x2, y2, theme["primary"])
                        draw_scan_line(overlay, frame_count, theme["accent"], y1, y2, x1, x2)
                        conf = det.score[0] if det.score else 0.0
                        draw_hud_text(
                            overlay, f"FACE LOCK  {conf * 100:4.1f}%",
                            (x1, max(20, y1 - 12)), theme["primary"], 0.5,
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
                    if show_mesh:
                        mp_drawing.draw_landmarks(
                            image=overlay,
                            landmark_list=landmarks,
                            connections=mp_face_mesh.FACEMESH_TESSELATION,
                            landmark_drawing_spec=None,
                            connection_drawing_spec=mp_drawing.DrawingSpec(
                                color=theme["mesh"], thickness=1, circle_radius=1
                            ),
                        )
                        mp_drawing.draw_landmarks(
                            image=overlay,
                            landmark_list=landmarks,
                            connections=mp_face_mesh.FACEMESH_CONTOURS,
                            landmark_drawing_spec=None,
                            connection_drawing_spec=mp_drawing.DrawingSpec(
                                color=theme["primary"], thickness=1, circle_radius=1
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
                        else:
                            metrics = mouth_metrics(landmarks, w, h)
                            if metrics is not None:
                                mood = classify_mood(metrics, mood_baseline)
                                draw_hud_text(
                                    overlay, f"MOOD: {mood}",
                                    label_pos, MOOD_COLORS[mood], 0.6, 2,
                                )

            frame = cv2.addWeighted(overlay, 0.85, frame, 0.15, 0)

            # ---- top HUD bar ----
            cv2.rectangle(frame, (0, 0), (w, 40), (0, 0, 0), -1)
            draw_hud_text(frame, "AR FACE TRACKER", (12, 26), theme["primary"], 0.65, 2)
            draw_hud_text(frame, f"THEME: {theme['name']}", (w - 220, 26), theme["accent"], 0.5)

            cv2.imshow("AR Face Tracker", frame)
            frame_count += 1
            key = cv2.waitKey(1) & 0xFF
            if key in (ord("q"), 27):
                break
            elif key == ord("m"):
                show_mesh = not show_mesh
            elif key == ord("b"):
                show_box = not show_box
            elif key == ord("c"):
                theme_idx = (theme_idx + 1) % len(THEMES)
            elif key == ord("e"):
                show_mood = not show_mood
                if show_mood:
                    mood_calibrating = True
                    mood_calib_count = 0
                    mood_calib_sum_width = 0.0
                    mood_calib_sum_lift = 0.0
            elif key == ord("r"):
                if show_mood:
                    mood_calibrating = True
                    mood_calib_count = 0
                    mood_calib_sum_width = 0.0
                    mood_calib_sum_lift = 0.0

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()`;

const step3Code = `import math

import cv2
import mediapipe as mp

CAM_SOURCE = 0  # laptop webcam. Lab PC + phone: "http://localhost:8080/video"

THEMES = [
    {"name": "CYAN", "primary": (255, 255, 0), "accent": (0, 255, 255), "mesh": (255, 200, 0)},
    {"name": "MAGENTA", "primary": (255, 0, 255), "accent": (180, 0, 255), "mesh": (255, 100, 255)},
    {"name": "GREEN", "primary": (0, 255, 100), "accent": (0, 255, 0), "mesh": (0, 255, 150)},
    {"name": "AMBER", "primary": (0, 200, 255), "accent": (0, 165, 255), "mesh": (0, 220, 255)},
]

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

MOOD_COLORS = {
    "HAPPY": (0, 220, 0),
    "SURPRISED": (0, 165, 255),
    "SAD": (255, 120, 0),
    "NEUTRAL": (200, 200, 200),
}


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
    """Classify mood from mouth_metrics() output. \`baseline\` is the
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

    show_mesh = True
    show_box = True
    show_mood = False
    theme_idx = 0
    frame_count = 0
    shot_count = 0

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

            theme = THEMES[theme_idx]
            overlay = frame.copy()

            if det_results.detections:
                for det in det_results.detections:
                    box = det.location_data.relative_bounding_box
                    x1 = max(0, int(box.xmin * w) - 15)
                    y1 = max(0, int(box.ymin * h) - 15)
                    x2 = min(w, int((box.xmin + box.width) * w) + 15)
                    y2 = min(h, int((box.ymin + box.height) * h) + 15)

                    if show_box:
                        draw_corner_brackets(overlay, x1, y1, x2, y2, theme["primary"])
                        draw_scan_line(overlay, frame_count, theme["accent"], y1, y2, x1, x2)
                        conf = det.score[0] if det.score else 0.0
                        draw_hud_text(
                            overlay, f"FACE LOCK  {conf * 100:4.1f}%",
                            (x1, max(20, y1 - 12)), theme["primary"], 0.5,
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
                    if show_mesh:
                        mp_drawing.draw_landmarks(
                            image=overlay,
                            landmark_list=landmarks,
                            connections=mp_face_mesh.FACEMESH_TESSELATION,
                            landmark_drawing_spec=None,
                            connection_drawing_spec=mp_drawing.DrawingSpec(
                                color=theme["mesh"], thickness=1, circle_radius=1
                            ),
                        )
                        mp_drawing.draw_landmarks(
                            image=overlay,
                            landmark_list=landmarks,
                            connections=mp_face_mesh.FACEMESH_CONTOURS,
                            landmark_drawing_spec=None,
                            connection_drawing_spec=mp_drawing.DrawingSpec(
                                color=theme["primary"], thickness=1, circle_radius=1
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
                        else:
                            metrics = mouth_metrics(landmarks, w, h)
                            if metrics is not None:
                                mood = classify_mood(metrics, mood_baseline)
                                draw_hud_text(
                                    overlay, f"MOOD: {mood}",
                                    label_pos, MOOD_COLORS[mood], 0.6, 2,
                                )

            frame = cv2.addWeighted(overlay, 0.85, frame, 0.15, 0)

            # ---- top HUD bar ----
            cv2.rectangle(frame, (0, 0), (w, 40), (0, 0, 0), -1)
            draw_hud_text(frame, "AR FACE TRACKER", (12, 26), theme["primary"], 0.65, 2)
            draw_hud_text(frame, f"THEME: {theme['name']}", (w - 220, 26), theme["accent"], 0.5)

            cv2.imshow("AR Face Tracker", frame)
            frame_count += 1
            key = cv2.waitKey(1) & 0xFF
            if key in (ord("q"), 27):
                break
            elif key == ord("m"):
                show_mesh = not show_mesh
            elif key == ord("b"):
                show_box = not show_box
            elif key == ord("c"):
                theme_idx = (theme_idx + 1) % len(THEMES)
            elif key == ord("s"):
                shot_count += 1
                filename = f"capture_{shot_count:02d}.png"
                cv2.imwrite(filename, frame)
                print(f"Saved {filename}")
            elif key == ord("e"):
                show_mood = not show_mood
                if show_mood:
                    mood_calibrating = True
                    mood_calib_count = 0
                    mood_calib_sum_width = 0.0
                    mood_calib_sum_lift = 0.0
            elif key == ord("r"):
                if show_mood:
                    mood_calibrating = True
                    mood_calib_count = 0
                    mood_calib_sum_width = 0.0
                    mood_calib_sum_lift = 0.0

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()`;

const step4Code = `import ctypes
import math

import cv2
import mediapipe as mp

WINDOW_NAME = "AR FACE TRACKER"

CAM_SOURCE = 0  # laptop webcam. Lab PC + phone: "http://localhost:8080/video"

THEMES = [
    {"name": "CYAN", "primary": (255, 255, 0), "accent": (0, 255, 255), "mesh": (255, 200, 0)},
    {"name": "MAGENTA", "primary": (255, 0, 255), "accent": (180, 0, 255), "mesh": (255, 100, 255)},
    {"name": "GREEN", "primary": (0, 255, 100), "accent": (0, 255, 0), "mesh": (0, 255, 150)},
    {"name": "AMBER", "primary": (0, 200, 255), "accent": (0, 165, 255), "mesh": (0, 220, 255)},
]

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

MOOD_COLORS = {
    "HAPPY": (0, 220, 0),
    "SURPRISED": (0, 165, 255),
    "SAD": (255, 120, 0),
    "NEUTRAL": (200, 200, 200),
}


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


def force_window_focus(window_title):
    """Windows blocks background processes from silently stealing focus, so a
    freshly-opened cv2 window sometimes never receives keyboard input even
    after being clicked. Explicitly activate it once via the Win32 API."""
    try:
        user32 = ctypes.windll.user32
        hwnd = user32.FindWindowW(None, window_title)
        if hwnd:
            user32.ShowWindow(hwnd, 5)  # SW_SHOW
            user32.SetForegroundWindow(hwnd)
    except Exception:
        pass


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
    """Classify mood from mouth_metrics() output. \`baseline\` is the
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

    show_mesh = True
    show_box = True
    show_mood = False
    theme_idx = 0
    frame_count = 0
    shot_count = 0

    mood_calibrating = False
    mood_calib_count = 0
    mood_calib_sum_width = 0.0
    mood_calib_sum_lift = 0.0
    mood_baseline = (0.6, 0.0)  # (mouth_width, corner_lift) - overwritten on calibration

    cv2.namedWindow(WINDOW_NAME, cv2.WINDOW_NORMAL)

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

            theme = THEMES[theme_idx]
            overlay = frame.copy()

            if det_results.detections:
                for det in det_results.detections:
                    box = det.location_data.relative_bounding_box
                    x1 = max(0, int(box.xmin * w) - 15)
                    y1 = max(0, int(box.ymin * h) - 15)
                    x2 = min(w, int((box.xmin + box.width) * w) + 15)
                    y2 = min(h, int((box.ymin + box.height) * h) + 15)

                    if show_box:
                        draw_corner_brackets(overlay, x1, y1, x2, y2, theme["primary"])
                        draw_scan_line(overlay, frame_count, theme["accent"], y1, y2, x1, x2)
                        conf = det.score[0] if det.score else 0.0
                        draw_hud_text(
                            overlay, f"FACE LOCK  {conf * 100:4.1f}%",
                            (x1, max(20, y1 - 12)), theme["primary"], 0.5,
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
                    if show_mesh:
                        mp_drawing.draw_landmarks(
                            image=overlay,
                            landmark_list=landmarks,
                            connections=mp_face_mesh.FACEMESH_TESSELATION,
                            landmark_drawing_spec=None,
                            connection_drawing_spec=mp_drawing.DrawingSpec(
                                color=theme["mesh"], thickness=1, circle_radius=1
                            ),
                        )
                        mp_drawing.draw_landmarks(
                            image=overlay,
                            landmark_list=landmarks,
                            connections=mp_face_mesh.FACEMESH_CONTOURS,
                            landmark_drawing_spec=None,
                            connection_drawing_spec=mp_drawing.DrawingSpec(
                                color=theme["primary"], thickness=1, circle_radius=1
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
                        else:
                            metrics = mouth_metrics(landmarks, w, h)
                            if metrics is not None:
                                mood = classify_mood(metrics, mood_baseline)
                                draw_hud_text(
                                    overlay, f"MOOD: {mood}",
                                    label_pos, MOOD_COLORS[mood], 0.6, 2,
                                )

            frame = cv2.addWeighted(overlay, 0.85, frame, 0.15, 0)

            # ---- top HUD bar ----
            cv2.rectangle(frame, (0, 0), (w, 40), (0, 0, 0), -1)
            draw_hud_text(frame, "AR FACE TRACKER", (12, 26), theme["primary"], 0.65, 2)
            draw_hud_text(frame, f"THEME: {theme['name']}", (w - 220, 26), theme["accent"], 0.5)

            cv2.imshow(WINDOW_NAME, frame)

            if frame_count == 5:
                # Give the window a few frames to exist before grabbing focus.
                force_window_focus(WINDOW_NAME)

            frame_count += 1

            key = cv2.waitKey(1) & 0xFF
            if key in (ord("q"), 27):
                break
            elif key == ord("m"):
                show_mesh = not show_mesh
            elif key == ord("b"):
                show_box = not show_box
            elif key == ord("c"):
                theme_idx = (theme_idx + 1) % len(THEMES)
            elif key == ord("s"):
                shot_count += 1
                filename = f"capture_{shot_count:02d}.png"
                cv2.imwrite(filename, frame)
                print(f"Saved {filename}")
            elif key == ord("f"):
                force_window_focus(WINDOW_NAME)
            elif key == ord("e"):
                show_mood = not show_mood
                if show_mood:
                    mood_calibrating = True
                    mood_calib_count = 0
                    mood_calib_sum_width = 0.0
                    mood_calib_sum_lift = 0.0
            elif key == ord("r"):
                if show_mood:
                    mood_calibrating = True
                    mood_calib_count = 0
                    mood_calib_sum_width = 0.0
                    mood_calib_sum_lift = 0.0

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()`;

const step5Code = `import ctypes
import math
import time

import cv2
import mediapipe as mp

WINDOW_NAME = "AR FACE TRACKER"

CAM_SOURCE = 0  # laptop webcam. Lab PC + phone: "http://localhost:8080/video"

THEMES = [
    {"name": "CYAN", "primary": (255, 255, 0), "accent": (0, 255, 255), "mesh": (255, 200, 0)},
    {"name": "MAGENTA", "primary": (255, 0, 255), "accent": (180, 0, 255), "mesh": (255, 100, 255)},
    {"name": "GREEN", "primary": (0, 255, 100), "accent": (0, 255, 0), "mesh": (0, 255, 150)},
    {"name": "AMBER", "primary": (0, 200, 255), "accent": (0, 165, 255), "mesh": (0, 220, 255)},
]

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

MOOD_COLORS = {
    "HAPPY": (0, 220, 0),
    "SURPRISED": (0, 165, 255),
    "SAD": (255, 120, 0),
    "NEUTRAL": (200, 200, 200),
}


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


def force_window_focus(window_title):
    """Windows blocks background processes from silently stealing focus, so a
    freshly-opened cv2 window sometimes never receives keyboard input even
    after being clicked. Explicitly activate it once via the Win32 API."""
    try:
        user32 = ctypes.windll.user32
        hwnd = user32.FindWindowW(None, window_title)
        if hwnd:
            user32.ShowWindow(hwnd, 5)  # SW_SHOW
            user32.SetForegroundWindow(hwnd)
    except Exception:
        pass


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
    """Classify mood from mouth_metrics() output. \`baseline\` is the
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

    show_mesh = True
    show_box = True
    show_mood = False
    theme_idx = 0
    frame_count = 0
    shot_count = 0
    prev_time = time.time()
    fps = 0.0

    mood_calibrating = False
    mood_calib_count = 0
    mood_calib_sum_width = 0.0
    mood_calib_sum_lift = 0.0
    mood_baseline = (0.6, 0.0)  # (mouth_width, corner_lift) - overwritten on calibration

    cv2.namedWindow(WINDOW_NAME, cv2.WINDOW_NORMAL)

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

            theme = THEMES[theme_idx]
            overlay = frame.copy()
            face_count = 0

            if det_results.detections:
                face_count = len(det_results.detections)
                for det in det_results.detections:
                    box = det.location_data.relative_bounding_box
                    x1 = max(0, int(box.xmin * w) - 15)
                    y1 = max(0, int(box.ymin * h) - 15)
                    x2 = min(w, int((box.xmin + box.width) * w) + 15)
                    y2 = min(h, int((box.ymin + box.height) * h) + 15)

                    if show_box:
                        draw_corner_brackets(overlay, x1, y1, x2, y2, theme["primary"])
                        draw_scan_line(overlay, frame_count, theme["accent"], y1, y2, x1, x2)
                        conf = det.score[0] if det.score else 0.0
                        draw_hud_text(
                            overlay, f"FACE LOCK  {conf * 100:4.1f}%",
                            (x1, max(20, y1 - 12)), theme["primary"], 0.5,
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
                    if show_mesh:
                        mp_drawing.draw_landmarks(
                            image=overlay,
                            landmark_list=landmarks,
                            connections=mp_face_mesh.FACEMESH_TESSELATION,
                            landmark_drawing_spec=None,
                            connection_drawing_spec=mp_drawing.DrawingSpec(
                                color=theme["mesh"], thickness=1, circle_radius=1
                            ),
                        )
                        mp_drawing.draw_landmarks(
                            image=overlay,
                            landmark_list=landmarks,
                            connections=mp_face_mesh.FACEMESH_CONTOURS,
                            landmark_drawing_spec=None,
                            connection_drawing_spec=mp_drawing.DrawingSpec(
                                color=theme["primary"], thickness=1, circle_radius=1
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
                        else:
                            metrics = mouth_metrics(landmarks, w, h)
                            if metrics is not None:
                                mood = classify_mood(metrics, mood_baseline)
                                draw_hud_text(
                                    overlay, f"MOOD: {mood}",
                                    label_pos, MOOD_COLORS[mood], 0.6, 2,
                                )

            frame = cv2.addWeighted(overlay, 0.85, frame, 0.15, 0)

            # ---- top HUD bar ----
            cv2.rectangle(frame, (0, 0), (w, 40), (0, 0, 0), -1)
            draw_hud_text(frame, "AR FACE TRACKER", (12, 26), theme["primary"], 0.65, 2)
            draw_hud_text(frame, f"THEME: {theme['name']}", (w - 220, 26), theme["accent"], 0.5)

            # ---- bottom HUD bar ----
            now = time.time()
            dt = now - prev_time
            prev_time = now
            if dt > 0:
                fps = 0.9 * fps + 0.1 * (1.0 / dt)

            cv2.rectangle(frame, (0, h - 34), (w, h), (0, 0, 0), -1)
            draw_hud_text(frame, f"FPS: {fps:4.1f}", (12, h - 12), theme["accent"])
            draw_hud_text(frame, f"FACES: {face_count}", (150, h - 12), theme["accent"])
            mood_tag = "ON" if show_mood else "OFF"
            draw_hud_text(
                frame,
                f"[M] mesh [B] box [E] mood:{mood_tag} [R] recalib [C] color [S] shot [F] focus [Q] quit",
                (w - 700, h - 12), (200, 200, 200), 0.45,
            )

            cv2.imshow(WINDOW_NAME, frame)

            if frame_count == 5:
                # Give the window a few frames to exist before grabbing focus.
                force_window_focus(WINDOW_NAME)

            frame_count += 1

            key = cv2.waitKey(1) & 0xFF
            if key in (ord("q"), 27):
                break
            elif key == ord("m"):
                show_mesh = not show_mesh
            elif key == ord("b"):
                show_box = not show_box
            elif key == ord("c"):
                theme_idx = (theme_idx + 1) % len(THEMES)
            elif key == ord("s"):
                shot_count += 1
                filename = f"capture_{shot_count:02d}.png"
                cv2.imwrite(filename, frame)
                print(f"Saved {filename}")
            elif key == ord("f"):
                force_window_focus(WINDOW_NAME)
            elif key == ord("e"):
                show_mood = not show_mood
                if show_mood:
                    mood_calibrating = True
                    mood_calib_count = 0
                    mood_calib_sum_width = 0.0
                    mood_calib_sum_lift = 0.0
            elif key == ord("r"):
                if show_mood:
                    mood_calibrating = True
                    mood_calib_count = 0
                    mood_calib_sum_width = 0.0
                    mood_calib_sum_lift = 0.0

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()`;

const step6Code = `"""
AR Face Tracker - a classroom demo.

Real-time face tracking with a sci-fi HUD overlay: a glowing face mesh,
a targeting-reticle bounding box, and a live FPS counter.

Controls:
    M - toggle mesh overlay
    B - toggle bounding box / reticle
    E - toggle mood detection (off by default)
    R - recalibrate mood baseline (hold a neutral face when you press it)
    C - cycle HUD color theme
    S - save a screenshot
    F - re-focus the window (use this if keypresses stop responding)
    Q / ESC - quit
"""

import ctypes
import math
import time

import cv2
import mediapipe as mp

# ----------------------------------------------------------------------
# Config
# ----------------------------------------------------------------------

WINDOW_NAME = "AR FACE TRACKER"

CAM_SOURCE = 0
# Laptop with a built-in webcam: leave as the device index above (0).
# Lab PC with no webcam: set to your phone's IP Webcam stream tunneled over
# USB via \`adb forward tcp:8080 tcp:8080\`, e.g.:
#   CAM_SOURCE = "http://localhost:8080/video"

THEMES = [
    {"name": "CYAN", "primary": (255, 255, 0), "accent": (0, 255, 255), "mesh": (255, 200, 0)},
    {"name": "MAGENTA", "primary": (255, 0, 255), "accent": (180, 0, 255), "mesh": (255, 100, 255)},
    {"name": "GREEN", "primary": (0, 255, 100), "accent": (0, 255, 0), "mesh": (0, 255, 150)},
    {"name": "AMBER", "primary": (0, 200, 255), "accent": (0, 165, 255), "mesh": (0, 220, 255)},
]

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

MOOD_COLORS = {
    "HAPPY": (0, 220, 0),
    "SURPRISED": (0, 165, 255),
    "SAD": (255, 120, 0),
    "NEUTRAL": (200, 200, 200),
}

# ----------------------------------------------------------------------
# Helpers
# ----------------------------------------------------------------------


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


def force_window_focus(window_title):
    """Windows blocks background processes from silently stealing focus, so a
    freshly-opened cv2 window sometimes never receives keyboard input even
    after being clicked. Explicitly activate it once via the Win32 API."""
    try:
        user32 = ctypes.windll.user32
        hwnd = user32.FindWindowW(None, window_title)
        if hwnd:
            user32.ShowWindow(hwnd, 5)  # SW_SHOW
            user32.SetForegroundWindow(hwnd)
    except Exception:
        pass


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
    """Classify mood from mouth_metrics() output. \`baseline\` is the
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


# ----------------------------------------------------------------------
# Main
# ----------------------------------------------------------------------


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
        cap = cv2.VideoCapture(CAM_SOURCE)  # URL source: let OpenCV pick the FFmpeg backend
    if not cap.isOpened():
        raise RuntimeError("Could not open webcam. Check CAM_SOURCE / camera permissions.")

    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

    show_mesh = True
    show_box = True
    show_mood = False
    theme_idx = 0
    frame_count = 0
    shot_count = 0
    prev_time = time.time()
    fps = 0.0

    mood_calibrating = False
    mood_calib_count = 0
    mood_calib_sum_width = 0.0
    mood_calib_sum_lift = 0.0
    mood_baseline = (0.6, 0.0)  # (mouth_width, corner_lift) - overwritten on calibration

    cv2.namedWindow(WINDOW_NAME, cv2.WINDOW_NORMAL)

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

            mesh_results = face_mesh.process(rgb)
            det_results = face_detection.process(rgb)

            theme = THEMES[theme_idx]
            overlay = frame.copy()
            face_count = 0

            if det_results.detections:
                face_count = len(det_results.detections)
                for det in det_results.detections:
                    box = det.location_data.relative_bounding_box
                    x1 = max(0, int(box.xmin * w) - 15)
                    y1 = max(0, int(box.ymin * h) - 15)
                    x2 = min(w, int((box.xmin + box.width) * w) + 15)
                    y2 = min(h, int((box.ymin + box.height) * h) + 15)

                    if show_box:
                        draw_corner_brackets(overlay, x1, y1, x2, y2, theme["primary"])
                        draw_scan_line(overlay, frame_count, theme["accent"], y1, y2, x1, x2)
                        conf = det.score[0] if det.score else 0.0
                        draw_hud_text(
                            overlay, f"FACE LOCK  {conf * 100:4.1f}%",
                            (x1, max(20, y1 - 12)), theme["primary"], 0.5,
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
                    if show_mesh:
                        mp_drawing.draw_landmarks(
                            image=overlay,
                            landmark_list=landmarks,
                            connections=mp_face_mesh.FACEMESH_TESSELATION,
                            landmark_drawing_spec=None,
                            connection_drawing_spec=mp_drawing.DrawingSpec(
                                color=theme["mesh"], thickness=1, circle_radius=1
                            ),
                        )
                        mp_drawing.draw_landmarks(
                            image=overlay,
                            landmark_list=landmarks,
                            connections=mp_face_mesh.FACEMESH_CONTOURS,
                            landmark_drawing_spec=None,
                            connection_drawing_spec=mp_drawing.DrawingSpec(
                                color=theme["primary"], thickness=1, circle_radius=1
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
                        else:
                            metrics = mouth_metrics(landmarks, w, h)
                            if metrics is not None:
                                mood = classify_mood(metrics, mood_baseline)
                                draw_hud_text(
                                    overlay, f"MOOD: {mood}",
                                    label_pos, MOOD_COLORS[mood], 0.6, 2,
                                )

            frame = cv2.addWeighted(overlay, 0.85, frame, 0.15, 0)

            # ---- top HUD bar ----
            cv2.rectangle(frame, (0, 0), (w, 40), (0, 0, 0), -1)
            draw_hud_text(frame, "AR FACE TRACKER", (12, 26), theme["primary"], 0.65, 2)
            draw_hud_text(frame, f"THEME: {theme['name']}", (w - 220, 26), theme["accent"], 0.5)

            # ---- bottom HUD bar ----
            now = time.time()
            dt = now - prev_time
            prev_time = now
            if dt > 0:
                fps = 0.9 * fps + 0.1 * (1.0 / dt)

            cv2.rectangle(frame, (0, h - 34), (w, h), (0, 0, 0), -1)
            draw_hud_text(frame, f"FPS: {fps:4.1f}", (12, h - 12), theme["accent"])
            draw_hud_text(frame, f"FACES: {face_count}", (150, h - 12), theme["accent"])
            mood_tag = "ON" if show_mood else "OFF"
            draw_hud_text(
                frame,
                f"[M] mesh [B] box [E] mood:{mood_tag} [R] recalib [C] color [S] shot [F] focus [Q] quit",
                (w - 700, h - 12), (200, 200, 200), 0.45,
            )

            cv2.imshow(WINDOW_NAME, frame)

            if frame_count == 5:
                # Give the window a few frames to exist before grabbing focus.
                force_window_focus(WINDOW_NAME)

            frame_count += 1

            key = cv2.waitKey(1) & 0xFF
            if key in (ord("q"), 27):
                break
            elif key == ord("m"):
                show_mesh = not show_mesh
            elif key == ord("b"):
                show_box = not show_box
            elif key == ord("c"):
                theme_idx = (theme_idx + 1) % len(THEMES)
            elif key == ord("s"):
                shot_count += 1
                filename = f"capture_{shot_count:02d}.png"
                cv2.imwrite(filename, frame)
                print(f"Saved {filename}")
            elif key == ord("f"):
                force_window_focus(WINDOW_NAME)
            elif key == ord("e"):
                show_mood = not show_mood
                if show_mood:
                    mood_calibrating = True
                    mood_calib_count = 0
                    mood_calib_sum_width = 0.0
                    mood_calib_sum_lift = 0.0
            elif key == ord("r"):
                if show_mood:
                    mood_calibrating = True
                    mood_calib_count = 0
                    mood_calib_sum_width = 0.0
                    mood_calib_sum_lift = 0.0

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()`;

export const faceSession4: Session = {
  id: "face-s4",
  sessionNumber: 4,
  track: "Face Tracking (4 of 4)",
  title: "Face Tracking — Session 4 (Themes, Controls & Wrap-up)",
  syllabusMapping: "Module 11 — Face Detection & Recognition (guided)",
  buildsOn: "Face Tracking Session 3's mood detection",
  buildsToward: "source code/facial-recognition/face_tracker.py",
  sessionGoal:
    "Today we finish the tracker: colour themes, on/off switches, screenshots, a proper HUD with a live FPS counter — and by the end your file is exactly face_tracker.py.",
  instructorNotes: [
    "Code-display convention (used in every session): each step shows the entire file so far, with lines added or changed in that step marked as new.",
    "Say this before Step 2: some lines in this session aren't new — they're lines students already typed that have to move four spaces to the right, because Python decides what is inside an `if` by indentation. In VS Code: select the lines and press Tab. Step 4 also rewrites a few lines they already have (the window title and the end of the loop), and Step 6 is a tidy-up pass that changes nothing about behaviour.",
    "Step 4's focus fix is Windows-only (it calls the Win32 API through ctypes). On macOS or Linux it does nothing and is harmless — students there just click the window.",
    "Step 6 ends on the finished file: it should match source code/facial-recognition/face_tracker.py line for line (396 lines). That is the checkpoint students compare against.",
  ],
  wrapUp:
    "face_tracker.py is finished: a reticle HUD, a glowing mesh, a mood readout, four colour themes, screenshots and a live FPS counter — one file, every line typed and explained. Notice how it grew: every feature started as one small measurable idea, and that's how most computer-vision projects are built.",
  closingFramingNote:
    "A note on what you just built. The mood readout and the face mesh are the \"biometric logging\" side of this module: the program measures a face and shows numbers about it. It does NOT recognise who anyone is — there is no database of known faces and no matching of a specific person; every face is just \"a face.\" Named-person recognition (comparing a face against known individuals) is the obvious next extension, and it is deliberately not built here — treat it as a future extension only. It is also exactly where the privacy, consent and ethics questions become real: whose faces would be stored, did they agree, how long are they kept, and what happens when the system is wrong? Before you ever build something that identifies specific people, get explicit consent, say plainly what is stored, and keep as little as you can.",
  steps: [
    {
      id: "face-s4-1",
      index: 0,
      title: "Colour themes (THEMES and the C key)",
      say: "Every colour in the program is hard-wired right now. We're turning them into swappable themes — four colour sets — so that pressing C cycles through them. We're also adding a slim top bar that shows the name of the current theme.",
      file: {
        filename: "face_tracker.py",
        code: step1Code,
        newLineIndices: [...range(7, 12), 163, 196, ...range(206, 207), 211, 235, 244, ...range(268, 271), ...range(278, 279)],
      },
      commands: [],
      runCommand: "python face_tracker.py",
      runResult:
        "Click the window and press C. The reticle, scan line, FACE LOCK label and mesh switch between cyan, magenta, green and amber, and the new black bar across the top shows AR FACE TRACKER on the left and the theme's name (CYAN, MAGENTA, GREEN, AMBER) on the right.",
      why: "A theme is one small dictionary with four entries — a name plus three colours (primary, accent, mesh) — and THEMES is a list of four of them. theme_idx says which one is active, and (theme_idx + 1) % len(THEMES) steps forward and wraps from the last theme back to the first, the same remainder trick as the scan line. theme = THEMES[theme_idx] runs every frame, so a key press shows up on the very next frame; every place that used PRIMARY_COLOR, ACCENT_COLOR or MESH_COLOR now reads theme[\"primary\"], theme[\"accent\"] or theme[\"mesh\"] instead. The first theme (CYAN) has the same colours as before, so nothing looks different until you press C. Remember OpenCV colours are blue-green-red, not red-green-blue: (255, 255, 0) is full blue plus full green, which is cyan. The top bar is a filled black rectangle (thickness -1 means \"fill\") drawn on frame after the blend, so it is solid instead of 85% see-through, with text drawn on top; w - 220 measures from the right edge, so the theme name stays right-aligned at any window width.",
      glossary: [],
      commonProblems: [
        {
          error: "NameError: name 'PRIMARY_COLOR' is not defined (or ACCENT_COLOR / MESH_COLOR)",
          solution:
            "The three old constants are gone, so every place that used one has to be switched to the theme. Search the file for PRIMARY_COLOR, ACCENT_COLOR and MESH_COLOR — none of them should be left.",
        },
        {
          error: "TypeError: list indices must be integers or slices, not str — or KeyError: 'primary'",
          solution:
            "THEMES is a list (index it with a number), while theme is a dictionary (index it with a word). Writing THEMES[\"primary\"] gives the TypeError; a misspelled key like theme[\"primry\"] gives the KeyError.",
        },
        {
          error: "\"CYAN\" looks yellow, or \"AMBER\" looks blue — or the reverse",
          solution:
            "OpenCV stores colours as (blue, green, red). If a colour looks wrong, the tuple was probably typed in red-green-blue order.",
        },
        {
          error: "Pressing C does nothing",
          solution:
            "The window has to have keyboard focus (click it), and Caps Lock has to be off — ord(\"c\") only matches the lowercase letter. Step 4 adds a workaround for the focus problem.",
        },
      ],
    },
    {
      id: "face-s4-2",
      index: 1,
      title: "On/off switches for the mesh and the box (M and B)",
      say: "Now two switches: M turns the face mesh on and off, and B turns the reticle, scan line and label on and off. Handy for seeing the raw camera image, or comparing with and without. Careful with this one — some lines you already typed have to move four spaces to the right.",
      file: {
        filename: "face_tracker.py",
        code: step2Code,
        newLineIndices: [...range(162, 163), ...range(209, 216), ...range(233, 251), ...range(283, 286)],
      },
      commands: [],
      runCommand: "python face_tracker.py",
      runResult:
        "Press M: the mesh disappears, and comes back when you press it again. Press B: the reticle, scan line and FACE LOCK label disappear and return. The mood readout from Session 3 keeps working either way.",
      why: "show_mesh and show_box are two True/False variables that start as True, and show_mesh = not show_mesh flips one each time its key is pressed. The drawing code isn't new: the lines you already typed are simply placed under new if show_box: and if show_mesh: lines. In Python, what belongs to an if is decided by indentation, so those existing lines shift four spaces right — nothing else about them changes. Notice what the switches do not do: detection and the mesh still run every frame, and only the drawing is skipped. That is why turning the mesh off doesn't make the program faster — and why the mood feature keeps working with the mesh hidden, since it reads the same mesh results.",
      glossary: [],
      commonProblems: [
        {
          error: "IndentationError: unexpected indent (or: expected an indented block)",
          solution:
            "The most likely mistake in this session. Every line that belongs under the new if must be indented exactly four spaces deeper than the if itself. In VS Code, select all the lines and press Tab to shift the whole block at once (Shift+Tab shifts it back).",
        },
        {
          error: "B hides the brackets, but the scan line or FACE LOCK label stays on screen",
          solution:
            "Only some of the lines were moved under if show_box:. All the drawing lines (brackets, scan line, the confidence value, and the label) must sit under it.",
        },
        {
          error: "I turned the mesh off but the FPS didn't improve",
          solution:
            "Expected. The switch only skips the drawing; the mesh model still runs on every frame (the mood feature needs it). You'll see the actual FPS number once we add the counter in Step 5.",
        },
        {
          error: "M or B does nothing",
          solution:
            "Same two causes as before: the window isn't focused (click it), or Caps Lock is on so the key arrives as a capital letter and ord(\"m\") / ord(\"b\") don't match.",
        },
      ],
    },
    {
      id: "face-s4-3",
      index: 2,
      title: "Save a screenshot (S)",
      say: "Press S and the program saves whatever is on screen as a numbered picture next to your script — great for capturing a good-looking moment.",
      file: {
        filename: "face_tracker.py",
        code: step3Code,
        newLineIndices: [167, ...range(290, 294)],
      },
      commands: [],
      runCommand: "python face_tracker.py",
      runResult:
        "Press S. The terminal prints \"Saved capture_01.png\" and a file with that name appears in your project folder; press S again for capture_02.png. Open one — it's what the window showed, HUD and all.",
      why: "shot_count counts how many screenshots this run has taken, and each press adds one. The filename f\"capture_{shot_count:02d}.png\" pads the number to two digits with a leading zero (01, 02, ... 10) so the files sort in the right order. cv2.imwrite(filename, frame) writes an image file, and the extension decides the format. It saves frame — the finished, composited picture with all the overlays and the top bar — not the raw camera image. The file lands in the folder your terminal is currently in (the working directory), and print confirms it. One limit worth knowing: shot_count lives only in memory, so it starts at 0 again every time you run the program.",
      glossary: [],
      commonProblems: [
        {
          error: "Screenshots from an earlier run got overwritten",
          solution:
            "The counter restarts at 0 on every run, so the first screenshot is always capture_01.png and replaces the old one. Move or rename the files you want to keep. (Checking which numbers already exist on disk is a good extension, but it isn't built here.)",
        },
        {
          error: "\"Saved capture_01.png\" printed, but I can't find the file",
          solution:
            "It was saved in the terminal's current folder, which isn't always the folder the script is in. In VS Code the integrated terminal normally opens in the project folder — check there first.",
        },
        {
          error: "cv2.imwrite fails but the program still prints \"Saved\"",
          solution:
            "imwrite returns False instead of raising an error when it can't write (a bad extension, or a folder you can't write to), and the print runs regardless. If a file never appears, this is a likely cause.",
        },
        {
          error: "Pressing S prints nothing at all",
          solution:
            "The key never reached the program — click the window so it has focus, and check Caps Lock. That focus problem is exactly what the next step fixes.",
        },
      ],
    },
    {
      id: "face-s4-4",
      index: 3,
      title: "Keys not responding? The window-focus fix (F)",
      say: "On Windows, a window opened by a script often doesn't get keyboard focus, so key presses seem to do nothing until you click it. We add a small workaround that asks Windows to give the window focus — once automatically shortly after it opens, and again whenever you press F.",
      file: {
        filename: "face_tracker.py",
        code: step4Code,
        newLineIndices: [0, 6, ...range(75, 86), 192, ...range(296, 300), ...range(318, 319)],
      },
      commands: [],
      runCommand: "python face_tracker.py",
      runResult:
        "Launch the program without clicking anything. After a moment the window should jump to the front and respond to keys straight away (try C or M). The old \"AR Face Tracker running\" line in the terminal is gone — the window itself is now the sign that it's running.",
      why: "Windows stops background programs from stealing focus, so a freshly opened window can sit there never receiving keyboard input. ctypes lets Python call functions from Windows' own system libraries, and ctypes.windll.user32 is the part that manages windows on screen. FindWindowW(None, window_title) looks up a window by its exact title and returns a handle (hwnd) to it — which is why the title is now one constant, WINDOW_NAME, used both when the window is created and when it's searched for; they must match exactly. If it's found, ShowWindow(hwnd, 5) makes sure it's visible (5 is the Windows code for \"show\") and SetForegroundWindow(hwnd) brings it to the front with focus. The whole thing sits in try/except Exception: pass: on macOS or Linux there is no windll, so the call would fail — the except swallows that and the function quietly does nothing. cv2.namedWindow(WINDOW_NAME, cv2.WINDOW_NORMAL) creates the window up front, and WINDOW_NORMAL makes it resizable by dragging its edges. The automatic call runs when frame_count == 5 — a few frames in, so the window certainly exists — and because it's ==, not >=, it happens only once. The blank lines added around it are just for readability.",
      glossary: [],
      commonProblems: [
        {
          error: "Nothing changes on macOS or Linux",
          solution:
            "Expected: the workaround is Windows-only (ctypes.windll doesn't exist elsewhere), and the try/except hides that instead of crashing. On other systems, click the window once to give it focus.",
        },
        {
          error: "A second window appears, or the focus fix never seems to work",
          solution:
            "The title used by cv2.imshow doesn't match WINDOW_NAME, so the program created two differently-named windows, or FindWindowW can't find the one it's looking for (and fails silently). Both cv2.namedWindow and cv2.imshow must use WINDOW_NAME.",
        },
        {
          error: "Keys are dead and pressing F doesn't help either",
          solution:
            "F is read by the same window, so it can only help while the window still receives some key presses. If nothing responds at all, click the window first — after that, F is a quick way to get focus back next time.",
        },
        {
          error: "AttributeError: module 'ctypes' has no attribute 'windll'",
          solution:
            "This means the ctypes.windll line ended up outside the try block. On non-Windows systems it must stay inside try so the except can catch it.",
        },
      ],
    },
    {
      id: "face-s4-5",
      index: 4,
      title: "The bottom bar: FPS, face count and key legend",
      say: "The last piece of HUD: a bottom bar showing frames per second, how many faces are in view, and a reminder of every key. The FPS number is smoothed — I'll show you why.",
      file: {
        filename: "face_tracker.py",
        code: step5Code,
        newLineIndices: [2, ...range(186, 187), 221, 224, ...range(301, 316)],
      },
      commands: [],
      runCommand: "python face_tracker.py",
      runResult:
        "A black bar along the bottom reads FPS: 24.6, FACES: 1 and the list of keys, with mood:ON/OFF updating when you press E. The FPS number starts near 0 and climbs to its steady value over about a second. Add a second face (or leave the frame) and FACES changes.",
      why: "dt is how many seconds passed since the previous frame, so 1.0 / dt is the speed of this one frame. Shown raw, that number jumps around (18, 27, 21, 25...) and is impossible to read. So the code keeps 90% of the old value and blends in only 10% of the new one — fps = 0.9 * fps + 0.1 * (1.0 / dt) — a running average that moves smoothly. It also explains why fps starts at 0.0 and visibly climbs at the beginning: it's averaging its way up from zero. The if dt > 0 guard avoids dividing by zero in the rare case the clock gives the same time twice. face_count is reset to 0 at the start of every frame and then set to the number of detections, so it correctly drops back to 0 when nobody is in view. mood_tag = \"ON\" if show_mood else \"OFF\" is a one-line choice between two words. The bar is drawn after the blend, so it's solid. This is also why Session 3's label is kept above the bottom edge: min(h - 45, ...) leaves room for a 34-pixel bar. Finally, this is where you can see what running two MediaPipe models costs — the number here is the real answer to \"is this fast enough?\".",
      glossary: [],
      commonProblems: [
        {
          error: "FPS stays at 0.0 or resets constantly",
          solution:
            "prev_time and fps must be created once, before the loop. If they're typed inside the loop they reset every frame, and the average never has anything to build on.",
        },
        {
          error: "The FPS number jumps around and is hard to read",
          solution:
            "The two weights are probably swapped (0.1 on the old value and 0.9 on the new one), which makes the number mostly raw. The old value should get the big share: 0.9 * fps + 0.1 * (1.0 / dt).",
        },
        {
          error: "FPS is much lower than expected (10-15)",
          solution:
            "Not a bug. Two MediaPipe models run on every frame, and a phone stream over USB adds its own delay. This is the slowdown Session 2 warned about, now visible.",
        },
        {
          error: "The key list on the right is cut off",
          solution:
            "It's positioned with w - 700, which assumes the window is at least about 700 pixels wide. Dragging the window narrower clips it.",
        },
      ],
    },
    {
      id: "face-s4-6",
      index: 5,
      title: "Tidy up: the finished face_tracker.py",
      say: "One last pass. Nothing here changes what the program does — we add a description at the top, section headers, a fuller note about CAM_SOURCE, and swap the order of two lines. When you finish, your file should match face_tracker.py exactly, line for line.",
      file: {
        filename: "face_tracker.py",
        code: step6Code,
        newLineIndices: [...range(0, 15), ...range(24, 26), ...range(30, 34), ...range(73, 75), ...range(191, 193), 207, 250],
      },
      commands: [],
      runCommand: "python face_tracker.py",
      runResult:
        "The program behaves exactly as before. To check your file against the finished one, look at the line count in VS Code (the status bar or the end of the line-number column): it should be exactly 396 lines. Then read down the changed places on the right and compare them with yours.",
      why: "The block of text in triple quotes at the very top is a docstring — the file's own description. It's ignored when the program runs, but tools and other programmers read it, and here it doubles as a cheat-sheet of every key. The banner comments split the file into Config, Helpers and Main, and the longer CAM_SOURCE comment explains what to change on a lab PC (a phone tunnelled over USB). The comment beside the URL branch tells the reader why it's a separate case. Swapping the two process() lines makes no difference to the result: face detection and the face mesh both read the same rgb picture and neither uses the other's answer, so their order doesn't matter — the finished file just happens to run the mesh first. Step back and look at the whole file: constants at the top, drawing helpers, the measuring and classifying helpers, and then main(), which does the same five things every frame — capture, detect and measure, draw, add the HUD, then read the keyboard.",
      glossary: [],
      commonProblems: [
        {
          error: "SyntaxError: unterminated triple-quoted string literal",
          solution:
            "The docstring at the top opened with three quote marks but never closed with three. Check that the closing \"\"\" is on its own line after the Q / ESC line.",
        },
        {
          error: "The program broke after adding comments",
          solution:
            "Comments can't break code — so a line was probably deleted or changed by accident while editing. Compare the top of your file and each changed place carefully.",
        },
        {
          error: "My file has a different number of lines",
          solution:
            "Blank lines count. Compare section by section (docstring, Config, Helpers, Main) to find where the counts diverge — often it's a banner comment that is missing its blank lines.",
        },
        {
          error: "Does the order of the two process() calls really not matter?",
          solution:
            "Correct — neither model reads the other's output, so they can run in either order and give the same results.",
        },
      ],
    },
  ],
};
