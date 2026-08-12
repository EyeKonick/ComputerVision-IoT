// Once a student has chosen a camera path (via the Setup fork step or the
// in-page chooser), swap the generic "works for either path" CAM_SOURCE
// line for the concrete value *their* path actually needs — everywhere
// that exact line recurs across the course, not just on the fork step
// itself. Matches on the literal source line only, so it's a no-op (falls
// back to the generic, both-paths-shown line) until a path is chosen.
const CAM_SOURCE_VARIANTS: Record<string, { A: string; B: string }> = {
  'CAM_SOURCE = 0  # laptop webcam. Lab PC + phone: "http://localhost:8080/video"': {
    A: "CAM_SOURCE = 0  # laptop webcam (your path: A)",
    B: 'CAM_SOURCE = "http://localhost:8080/video"  # phone over USB (your path: B)',
  },
  'CAM_SOURCE = 0  # laptop webcam (Path A). Lab PC + phone (Path B): "http://localhost:8080/video"': {
    A: "CAM_SOURCE = 0  # laptop webcam (your path: A)",
    B: 'CAM_SOURCE = "http://localhost:8080/video"  # phone over USB (your path: B)',
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
