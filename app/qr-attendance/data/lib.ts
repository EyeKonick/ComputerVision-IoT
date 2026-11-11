/** Small helpers used when hand-authoring `newLineIndices` arrays in the
 * session data files — keeps long contiguous runs readable instead of
 * spelled-out literal arrays. Identical to `app/hand-tracking/data/lib.ts`. */

export function range(from: number, to: number): number[] {
  const out: number[] = [];
  for (let i = from; i <= to; i++) out.push(i);
  return out;
}

export function allLines(code: string): number[] {
  return range(0, code.split("\n").length - 1);
}
