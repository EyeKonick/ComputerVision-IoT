// Structured content model for the QR Attendance guide.
//
// Drafted alongside `.scratch/qr-attendance-guide/content/*.md` (the
// source record). Mirrors `app/facial-recognition/data/types.ts` shape,
// plus an optional per-step `links` list (see HelpLink).

export type CodeLanguage = "python" | "bash";

/** A single labeled command/snippet block that isn't part of the tracked
 * cumulative Python file — e.g. a terminal command, or a Path A/B setup
 * instruction. Shown verbatim in the "type this" panel with no line
 * highlighting (there's no prior file state to diff against). */
export interface CommandBlock {
  label?: string;
  language: CodeLanguage;
  code: string;
}

/** The tracked Python file's complete text *after* this step, plus which
 * 0-indexed lines within `code` are new/changed this step. This is the
 * single source of truth both code-panel views render from:
 *  - "Type this": the contiguous runs of `newLineIndices` within `code`,
 *    each labeled with its approximate line range plus the next unchanged
 *    line as trailing context, so a student can tell a continuation from
 *    an insertion.
 *  - "Show the full file so far": `code` in full, numbered, with
 *    `newLineIndices` highlighted as a structure-comparison reference.
 */
export interface FileSnapshot {
  filename: string;
  code: string;
  newLineIndices: number[];
  /** Set only on the step that first creates this file (faithfully
   * transcribed from the source markdown's "Type (new file `x.py`)"
   * label) — rendered as an explicit "create a new file" callout instead
   * of silently assuming the file already exists. Absent on every other
   * step, which all continue an already-created file. */
  newFileNote?: string;
}

export interface GlossaryEntry {
  term: string;
  explanation: string;
}

/** One entry in a step's "Common problems" accordion. `error` is the
 * symptom/situation line shown collapsed; `solution` is the cause/fix
 * text revealed on click. */
export interface CommonProblem {
  error: string;
  solution: string;
}

/** A link out to another page (e.g. Hand Tracking's Setup steps or
 * troubleshooting pages), rendered under "Need more help?" on a step. */
export interface HelpLink {
  label: string;
  href: string;
  /** Short plain-text note shown after the link. */
  note?: string;
}

/** A two-path fork within a single step — used by QR Session 0's
 * camera-source chooser (Laptop / Phone). */
export interface ForkPath {
  letter: "A" | "B";
  label: string;
  body: string;
  commands: CommandBlock[];
}

export interface TwoPathFork {
  prompt: string;
  pathA: ForkPath;
  pathB: ForkPath;
}

export interface Step {
  /** Stable id, e.g. "qr-s1-2". Used for routing and localStorage. */
  id: string;
  /** 0-indexed position within the session's steps array. */
  index: number;
  title: string;
  /** The "Say:" narration read aloud before typing starts. */
  say: string;
  /** Present for steps that touch the tracked Python file
   * (qr_generator.py / qr_scanner.py, or Session 0's camera_check.py).
   * Absent for pure-terminal steps and any fork step. */
  file: FileSnapshot | null;
  commands: CommandBlock[];
  runCommand?: string;
  runResult?: string;
  /** Rare "this looks broken but isn't" callouts, distinct from prose
   * "why it matters" and from "common problems" (which are genuine
   * mistakes/errors). */
  goodToKnow?: string;
  why: string;
  glossary: GlossaryEntry[];
  commonProblems: CommonProblem[];
  fork?: TwoPathFork;
  links?: HelpLink[];
}

export interface Session {
  id: string;
  sessionNumber: number | null;
  track: string;
  title: string;
  syllabusMapping: string;
  buildsOn?: string;
  buildsToward?: string;
  sessionGoal: string;
  /** Standing framing notes shown once at the top of the session. */
  instructorNotes: string[];
  steps: Step[];
  wrapUp: string;
  closingFramingNote?: string;
}

export type QrAttendanceData = Session[];

export interface FlatStep {
  session: Session;
  step: Step;
  /** Position across the entire track, 0-indexed. */
  flatIndex: number;
}
