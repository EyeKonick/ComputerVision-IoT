// Once a student has chosen a camera path (during Hand Tracking's shared
// Setup session — see loadSharedCameraPath in ./progress), swap the
// generic "works for either path" CAM_SOURCE line for the concrete value
// *their* path actually needs, here too. Matches on the literal source
// line only, so it's a no-op (falls back to the generic, both-paths-shown
// line) until a path has been chosen. Identical mapping to
// `app/hand-tracking/lib/camSource.ts` since both scripts share the exact
// same CAM_SOURCE comment convention.
const CAM_SOURCE_VARIANTS: Record<string, { A: string; B: string }> = {
  'CAM_SOURCE = 0  # laptop webcam. Lab PC + phone: "http://localhost:8080/video"': {
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
