// Structured content model for the Hand Tracking guide.
//
// Converted from the instructor-approved source markdown in
// `.scratch/cv-iot-student-guide/content/01-setup-environment.md` through
// `05-hand-session-4-orb-wrapup.md`. Content itself is final — this is a
// structural transcription, not a rewrite. See
// `.scratch/hand-tracking-deploy/issues/02-content-data-model.md` for the
// conversion ticket this data model resolves.

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
 *    an insertion (see ticket 06's Notes — numbers are a reference, not a
 *    guarantee, since an individual student's file can drift by a line).
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

/** A two-path fork within a single step — the camera-source setup step
 * (laptop webcam vs. phone over USB) and the Python-install step
 * (already installed vs. needs installing) both use this same shape.
 * Presentation-only — each fork is still one step in the data model, not
 * two (see the map's Notes), and always merges back into the linear
 * chain before the next step. */
export interface ForkPath {
  letter: "A" | "B";
  label: string;
  body: string;
  commands: CommandBlock[];
}

export interface TwoPathFork {
  /** Shown above the two path cards until the student picks one, e.g.
   * "Which camera source are you using today?" */
  prompt: string;
  pathA: ForkPath;
  pathB: ForkPath;
}

export interface Step {
  /** Stable id, e.g. "hand-s2-4". Used for routing and localStorage. */
  id: string;
  /** 0-indexed position within the session's steps array. */
  index: number;
  title: string;
  /** The "Say:" narration read aloud before typing starts. */
  say: string;
  /** Present for steps that touch the tracked Python file (hand_ar.py or
   * hello_webcam.py). Absent for pure-terminal steps (e.g. `python
   * --version`) and the camera-fork step. */
  file: FileSnapshot | null;
  /** Present for terminal-only steps and the two fork paths' one-time/
   * per-session commands. Rendered as-is in the "type this" panel when
   * `file` is null. */
  commands: CommandBlock[];
  runCommand?: string;
  runResult?: string;
  /** Rare "this looks broken but isn't" callouts, distinct from prose
   * "why it matters" and from "common problems" (which are genuine
   * mistakes/errors). */
  goodToKnow?: string;
  why: string;
  glossary: GlossaryEntry[];
  commonProblems: string[];
  /** Set on any step that forks into two paths merging back before the
   * next step — currently the Setup track's Python-install check and its
   * camera-source step. */
  fork?: TwoPathFork;
}

export interface Session {
  id: string;
  /** null for the Setup & Environment lead-in, 1-4 for Hand Tracking. */
  sessionNumber: number | null;
  track: string;
  title: string;
  syllabusMapping: string;
  buildsOn?: string;
  buildsToward?: string;
  sessionGoal: string;
  /** Standing framing notes shown once at the top of the session (code
   * -display convention reminders, "heads up for the instructor" callouts,
   * the two-path classroom note, etc.) — not tied to a specific step. */
  instructorNotes: string[];
  steps: Step[];
  wrapUp: string;
  /** Session 4 only: the closing framing note read before the wrap-up. */
  closingFramingNote?: string;
}

export type HandTrackingData = Session[];

export interface FlatStep {
  session: Session;
  step: Step;
  /** Position across the entire track, 0-indexed. */
  flatIndex: number;
}
