import type { Session } from "../types";
import { range } from "../lib";

const step1Code = `import cv2
import mediapipe as mp

CAM_SOURCE = 0  # laptop webcam. Lab PC + phone: "http://localhost:8080/video"

PRIMARY_COLOR = (255, 255, 0)
ACCENT_COLOR = (0, 255, 255)
BRACKET_LEN = 30
BRACKET_THICKNESS = 3


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


def main():
    mp_face_detection = mp.solutions.face_detection

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

    with mp_face_detection.FaceDetection(
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

            overlay = frame.copy()

            if det_results.detections:
                for det in det_results.detections:
                    box = det.location_data.relative_bounding_box
                    x1 = max(0, int(box.xmin * w) - 15)
                    y1 = max(0, int(box.ymin * h) - 15)
                    x2 = min(w, int((box.xmin + box.width) * w) + 15)
                    y2 = min(h, int((box.ymin + box.height) * h) + 15)
                    draw_corner_brackets(overlay, x1, y1, x2, y2, PRIMARY_COLOR)

            frame = cv2.addWeighted(overlay, 0.85, frame, 0.15, 0)

            cv2.imshow("AR Face Tracker", frame)
            key = cv2.waitKey(1) & 0xFF
            if key in (ord("q"), 27):
                break

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()`;

const step2Code = `import cv2
import mediapipe as mp

CAM_SOURCE = 0  # laptop webcam. Lab PC + phone: "http://localhost:8080/video"

PRIMARY_COLOR = (255, 255, 0)
ACCENT_COLOR = (0, 255, 255)
BRACKET_LEN = 30
BRACKET_THICKNESS = 3


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


def draw_scan_line(img, frame_count, color, top, bottom, left, right):
    """An animated horizontal scan line sweeping through the face box."""
    span = bottom - top
    if span <= 0:
        return
    offset = frame_count % 60
    y = top + int((offset / 60) * span)
    cv2.line(img, (left, y), (right, y), color, 1, cv2.LINE_AA)


def main():
    mp_face_detection = mp.solutions.face_detection

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

    with mp_face_detection.FaceDetection(
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

            frame = cv2.addWeighted(overlay, 0.85, frame, 0.15, 0)

            cv2.imshow("AR Face Tracker", frame)
            frame_count += 1
            key = cv2.waitKey(1) & 0xFF
            if key in (ord("q"), 27):
                break

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()`;

const step3Code = `import cv2
import mediapipe as mp

CAM_SOURCE = 0  # laptop webcam. Lab PC + phone: "http://localhost:8080/video"

PRIMARY_COLOR = (255, 255, 0)
ACCENT_COLOR = (0, 255, 255)
BRACKET_LEN = 30
BRACKET_THICKNESS = 3


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


def draw_scan_line(img, frame_count, color, top, bottom, left, right):
    """An animated horizontal scan line sweeping through the face box."""
    span = bottom - top
    if span <= 0:
        return
    offset = frame_count % 60
    y = top + int((offset / 60) * span)
    cv2.line(img, (left, y), (right, y), color, 1, cv2.LINE_AA)


def main():
    mp_face_detection = mp.solutions.face_detection

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

    with mp_face_detection.FaceDetection(
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

            frame = cv2.addWeighted(overlay, 0.85, frame, 0.15, 0)

            cv2.imshow("AR Face Tracker", frame)
            frame_count += 1
            key = cv2.waitKey(1) & 0xFF
            if key in (ord("q"), 27):
                break

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()`;

const step4Code = `import cv2
import mediapipe as mp

CAM_SOURCE = 0  # laptop webcam. Lab PC + phone: "http://localhost:8080/video"

PRIMARY_COLOR = (255, 255, 0)
ACCENT_COLOR = (0, 255, 255)
MESH_COLOR = (255, 200, 0)
BRACKET_LEN = 30
BRACKET_THICKNESS = 3


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
    main()`;

export const faceSession2: Session = {
  id: "face-s2",
  sessionNumber: 2,
  track: "Face Tracking (2 of 4)",
  title: "Face Tracking — Session 2 (Sci-Fi HUD + Face Mesh)",
  syllabusMapping: "Module 11 — Face Detection & Recognition (guided)",
  buildsOn: "Face Tracking Session 1's plain bounding box",
  buildsToward: "source code/facial-recognition/face_tracker.py",
  sessionGoal:
    "Today the plain green box becomes a targeting-reticle HUD, and we add a full glowing mesh across the whole face.",
  instructorNotes: [
    "Code-display convention (used in every session): each step shows the entire file so far, with lines added in that step marked as new.",
    "Structural note: this session introduces a different compositing style than Hand Tracking used. hand_ar.py drew onto an all-black overlay_layer and blended it additively (so undrawn areas stayed black and vanished). Here, overlay = frame.copy() starts as a copy of the real camera image, gets decorations drawn on top of it, and is blended back at mostly-full strength (0.85) over a slightly dimmed original (0.15) — a different trick for a different look (dimmed-and-decorated vs. neon-on-black). Worth calling out explicitly since students already have the other pattern in their heads from Hand Tracking.",
  ],
  wrapUp:
    "The plain box is now a full sci-fi HUD — reticle, scan line, confidence label, and a glowing face mesh, all from two MediaPipe models working side by side. Next session: we teach the code to read something from that mesh — whether the face in frame looks happy, sad, or surprised.",
  steps: [
    {
      id: "face-s2-1",
      index: 0,
      title: "Corner-bracket reticle instead of a plain box",
      say: "We're replacing that plain green rectangle with a targeting-reticle look — four separate corner brackets instead of a full outline.",
      file: {
        filename: "face_tracker.py",
        code: step1Code,
        newLineIndices: [
          5, 6, 7, 8,
          11, 12, 13, 14,
          ...range(17, 30),
          66, 75, 77,
        ],
      },
      commands: [],
      runCommand: "python face_tracker.py",
      runResult:
        "Instead of a full rectangle, you should see four separate corner brackets — a \"targeting reticle\" look — tracking your face.",
      why: "draw_glow_line is the same two-layer trick from Hand Tracking's glow_line — a colored line with a thin white highlight down the middle, faking a soft glow. draw_corner_brackets builds each of the four corners from a (direction_x, direction_y) pair: at the top-left corner, for example, one bracket arm extends rightward (dx=(1,0)) and the other downward (dy=(0,1)) — the four (dx, dy) pairs in corners are exactly the four ways \"point inward from this corner\" can be expressed for each of the box's four corners. overlay = frame.copy() creates a real, independent copy of the current frame to draw decorations onto, and cv2.addWeighted(overlay, 0.85, frame, 0.15, 0) blends that mostly-opaque decorated copy back over a slightly dimmed original — different from Hand Tracking's black-canvas-plus-additive-glow approach, but the same underlying idea: draw on a separate layer, then blend.",
      glossary: [],
      commonProblems: [
        {
          error: "A bracket arm can extend a few pixels past the visible window near screen edges",
          solution:
            "The bracket's outward-pointing arm (p1 = (cx + dx[0] * BRACKET_LEN, cy)) isn't clamped to the frame bounds the way the box coordinates themselves are (x1/y1/x2/y2 already use max(0, ...)/min(w, ...) from Session 1). Harmless (OpenCV just doesn't draw the off-screen part), worth a one-line mention if a sharp-eyed student notices it, not worth \"fixing\" today.",
        },
        {
          error: "Brackets look mirrored or pointing the wrong way",
          solution:
            "Mixing up which (dx, dy) pair belongs to which corner is an easy typo to make while live-coding — checking the four tuples against the four corners listed right above them is the fastest way to spot it.",
        },
      ],
    },
    {
      id: "face-s2-2",
      index: 1,
      title: "Animated scan-line sweep",
      say: "A single horizontal line now sweeps up and down through each detected face, looping continuously — a classic sci-fi \"scanning\" effect.",
      file: {
        filename: "face_tracker.py",
        code: step2Code,
        newLineIndices: [...range(33, 40), 58, 88, 93],
      },
      commands: [],
      runCommand: "python face_tracker.py",
      runResult:
        "A thin horizontal line should now sweep continuously down through each bracketed face, then jump back to the top and repeat.",
      why: "frame_count % 60 cycles a counter from 0 up to 59 and back to 0, over and over, using the remainder operator — a simple way to get a repeating loop out of a number that only ever increases. offset / 60 turns that into a fraction from 0.0 to just-under-1.0, and multiplying by span (the face box's height) turns that into a Y position somewhere between the top and bottom of the box. The if span <= 0: return guard is defensive — it shouldn't happen given how y1/y2 are computed, but a zero-or-negative span would otherwise produce a nonsensical scan line, so the function just skips drawing rather than risk it.",
      glossary: [],
      commonProblems: [
        {
          error: "The sweep visibly crawls slower on Path B (phone stream) than on a fast laptop webcam",
          solution:
            "The sweep speed is tied to frame rate, not wall-clock time — frame_count only advances once per processed frame, not once per real second. Worth mentioning as an honest limitation, not a bug to fix today.",
        },
        {
          error: "The sweep freezes in place instead of animating",
          solution:
            "frame_count must be initialized before the with block/loop starts (once) and incremented inside the loop (every frame) — reversing that (e.g. resetting it to 0 every iteration) would freeze the sweep in place.",
        },
      ],
    },
    {
      id: "face-s2-3",
      index: 2,
      title: "The \"FACE LOCK\" confidence label",
      say: "One more small addition: text showing MediaPipe's detection confidence, right above the reticle.",
      file: {
        filename: "face_tracker.py",
        code: step3Code,
        newLineIndices: [33, 34, 35, ...range(94, 98)],
      },
      commands: [],
      runCommand: "python face_tracker.py",
      runResult: 'A label like "FACE LOCK  87.3%" should appear just above each reticle.',
      why: "draw_hud_text is the same idea as draw_glow_line — draw the text twice, once thick and black underneath, once normal-colored on top — which gives every HUD label a readable dark outline no matter what's behind it in the live camera feed, without needing a solid background rectangle. det.score is a list (MediaPipe's API shape, even though face detection only ever returns one confidence value per detection) — det.score[0] if det.score else 0.0 reads that first value defensively, falling back to 0.0 in the rare case the list is empty rather than crashing on an index error. max(20, y1 - 12) keeps the label from being drawn above the very top of the window if a face is detected right at the top edge.",
      glossary: [],
      commonProblems: [
        {
          error: "Confidence sitting consistently in the 60-70% range rather than near 100%",
          solution:
            "Not a sign of something broken — it reflects the min_detection_confidence=0.6 threshold from Session 1 and normal lighting variance; only worth investigating if it's below that 0.6 threshold, which shouldn't happen (anything under it wouldn't have been detected at all).",
        },
        {
          error: 'What does the "4.1f" format spec mean?',
          solution:
            'f"{conf * 100:4.1f}%" — 1 digit after the decimal, padded to at least 4 characters wide, so the label doesn\'t visibly jitter in width as the number changes frame to frame.',
        },
      ],
    },
    {
      id: "face-s2-4",
      index: 3,
      title: "Add the face mesh overlay",
      say: "Now, the big one: a full glowing mesh traced across the entire face, running as a second, independent MediaPipe model alongside the one that finds the bounding box.",
      file: {
        filename: "face_tracker.py",
        code: step4Code,
        newLineIndices: [7, 50, 52, 53, ...range(71, 76), 91, ...range(110, 129)],
      },
      commands: [],
      runCommand: "python face_tracker.py",
      runResult:
        "A fine glowing mesh should now cover your whole face, plus a brighter outline tracing its contours (eyes, eyebrows, lips, face edge), alongside the reticle and scan line from before.",
      why: "FaceMesh and FaceDetection are two separate MediaPipe models running independently, not one model doing both jobs — FaceDetection is fast and only answers \"where is a face, roughly\" (a bounding box), while FaceMesh is heavier and answers \"what's the precise 3D-ish shape of this face\" (hundreds of individual points). Running both together, each getting its own .process(rgb) call, is why this file needs two with ... as ...: context managers chained together rather than one. max_num_faces=2 and the confidence thresholds mirror ideas already seen in Hand Tracking's HandLandmarker options. FACEMESH_TESSELATION (the fine dense mesh) and FACEMESH_CONTOURS (a bolder outline of just the key features) are two different predefined sets of connections MediaPipe ships — drawn as two separate draw_landmarks calls with different colors, which is why the mesh looks like \"fine lines everywhere, plus a bolder outline on top.\"",
      glossary: [],
      commonProblems: [
        {
          error: "The reticle box and the mesh appear to lag very slightly relative to each other",
          solution:
            "Detection and mesh are two separate passes over the same frame, computed independently — in rare cases (fast motion, motion blur) this shows up since each model has its own internal confidence/tracking behavior. Not a bug, just a real consequence of running two independent models.",
        },
        {
          error: "Noticeably heavier / a real FPS drop compared to Session 1",
          solution:
            "Running both FaceMesh and FaceDetection together is real extra work — expect it on a weaker lab PC or over Path B's phone stream; this becomes visible once Session 4 adds the FPS counter.",
        },
        {
          error: "mp_styles = mp.solutions.drawing_styles is assigned but never used anywhere in this file",
          solution:
            "Harmless leftover — a small, honest example of dead code students will absolutely encounter in real codebases. Worth pointing out rather than pretending it's not there.",
        },
        {
          error: "Mixing up FACEMESH_TESSELATION and FACEMESH_CONTOURS in the two draw_landmarks calls",
          solution:
            'Still runs without error — it\'ll just draw the fine mesh in the "contour" color and vice versa, a purely cosmetic mix-up that\'s easy to spot and fix by comparing against the code above.',
        },
      ],
    },
  ],
};
