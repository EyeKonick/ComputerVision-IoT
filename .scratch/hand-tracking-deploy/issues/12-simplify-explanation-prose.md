Type: task
Status: open
Blocked by: (none)

## Question

Direct instructor feedback: simplify the guide's explanation prose so it's easier for beginner students to follow. Confirmed via grilling to cover all of:

- The "Say" / "Why it matters" step prose across **every session** in the Hand Tracking track (Setup & Environment + Hand Sessions 1–4 — ~30 steps total), not just the just-revised Setup session.
- The troubleshooting sub-page scenario cards' `cause` / `fixNote` text (`app/hand-tracking/troubleshooting/prototype-data.ts` and, once built, the full catalog from [ticket 08](08-research-troubleshooting-scenarios.md)) — currently written at a fairly technical level (e.g. "PowerShell blocks activation scripts (Activate.ps1) by default").

Source of truth for the step prose is the instructor-approved markdown in `../cv-iot-student-guide/content/*.md`; simplifying means revising that markdown first (same pattern as the Setup Step 7 revision earlier this session), then re-syncing into the corresponding `.ts` session data file — not rewriting the `.ts` files directly.

Not yet decided: whether "simple" means shorter sentences / plainer vocabulary while preserving all current technical content, or also trimming some of the more advanced asides — needs a quick calibration pass against one already-revised step (e.g. Setup Step 7) with the instructor before running across all ~30 steps, so the whole pass doesn't have to be redone if the level is off.

Sized larger than one session — likely wants splitting per-session (matching the sibling map's "one session's worth per ticket" convention) once calibrated, rather than attempted as a single ticket.

## Answer

(unresolved)
