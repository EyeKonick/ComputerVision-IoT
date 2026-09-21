export interface CodeGroup {
  text: string;
  /** 1-indexed, inclusive — an approximate reference, not a guarantee (an
   * individual student's file can drift by a line or two). */
  startLine: number;
  endLine: number;
  /** The next unchanged line right after this group, so a student can tell
   * whether new code is a continuation or an insertion — null when the
   * group runs to the end of the file. */
  trailingContext: string | null;
}

// Splits a file's new-line indices into contiguous runs and pulls the
// actual source text for each run — the isolated "type this" snippet.
// Identical to `app/hand-tracking/lib/code.ts`.
export function newLineGroupsWithContext(code: string, newLineIndices: number[]): CodeGroup[] {
  const lines = code.split("\n");
  if (!newLineIndices.length) return [];
  const sorted = [...newLineIndices].sort((a, b) => a - b);
  const groups: number[][] = [[sorted[0]]];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === sorted[i - 1] + 1) {
      groups[groups.length - 1].push(sorted[i]);
    } else {
      groups.push([sorted[i]]);
    }
  }
  return groups.map((idxs) => {
    const afterIdx = idxs[idxs.length - 1] + 1;
    return {
      text: idxs.map((idx) => lines[idx]).join("\n"),
      startLine: idxs[0] + 1,
      endLine: idxs[idxs.length - 1] + 1,
      trailingContext: afterIdx < lines.length ? lines[afterIdx] : null,
    };
  });
}

// Caption used only inside the collapsed "full file so far" reference panel,
// e.g. "New this step: lines 5-7 and line 10 in the full file below".
export function describeNewLines(newLineIndices: number[]): string {
  if (!newLineIndices.length) return "No new lines this step";
  const sorted = [...newLineIndices].sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];
  for (let i = 1; i <= sorted.length; i++) {
    const current: number | undefined = sorted[i];
    if (current !== prev + 1) {
      ranges.push(start === prev ? String(start + 1) : `${start + 1}–${prev + 1}`);
      start = current as number;
    }
    prev = current as number;
  }
  const parts = ranges.map((r) => (r.includes("–") ? `lines ${r}` : `line ${r}`));
  const joined =
    parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}` : parts[0];
  return `New this step: ${joined} in the full file below`;
}
