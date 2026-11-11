// Personalises the CAM_SOURCE line in QR code panels from the student's
// camera-source choice (Session 0's chooser — see loadCameraChoice in
// ./progress). QR's scripts use the bare line `CAM_SOURCE = 0` followed by
// comments explaining the phone URL, so Path A (laptop) keeps the line
// exactly as typed in the real file, and Path B (phone over USB) swaps in
// the URL. Matches on the literal source line only; a no-op until a path
// has been chosen.
const CAM_SOURCE_VARIANTS: Record<string, { A: string; B: string }> = {
  "CAM_SOURCE = 0": {
    A: "CAM_SOURCE = 0",
    B: 'CAM_SOURCE = "http://localhost:8080/video"',
  },
};

export function applyCameraPath(code: string, cameraPath: "A" | "B" | null): string {
  if (!cameraPath) return code;
  return code
    .split("\n")
    .map((line) => CAM_SOURCE_VARIANTS[line]?.[cameraPath] ?? line)
    .join("\n");
}

export function hasCameraPathSubstitution(code: string): boolean {
  return code.split("\n").some((line) => line in CAM_SOURCE_VARIANTS);
}

export function cameraPathLabel(cameraPath: "A" | "B"): string {
  return cameraPath === "A" ? "laptop webcam" : "phone over USB";
}
