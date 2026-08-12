Type: task
Status: closed
Blocked by: 03

## Question

Further instructor feedback on the built guide, given directly with explicit implementation instructions — three concrete gaps, not open decisions:

1. The guide never told students to *create* a new file. The source markdown actually carries this instruction (a `**Type (new file `x.py`)**` label on exactly two steps — Setup Step 7's `hello_webcam.py` and Hand Session 1 Step 1's `hand_ar.py`), but ticket 02's data model had no field for it, so it was silently dropped during transcription despite ticket 01's answer claiming this exact gap was "fixed in the source content."
2. Setup Step 7's `hello_webcam.py` (and every `hand_ar.py` afterward) shows a single generic `CAM_SOURCE` line commented for *both* paths at once ("laptop webcam. Lab PC + phone: ..."), leaving the student to figure out which literal value is theirs.
3. The "Type this" code panel shows isolated new-code snippets with no line-number context at all, so moving from one step to the next it's unclear whether new code is a continuation of what was just typed or an insertion somewhere in the middle of the file.

## Answer

All three implemented and verified live in-browser; resolved directly since this map's Notes carry execution into tickets.

**1. File-creation callouts.** Added `newFileNote?: string` to `FileSnapshot` (`data/types.ts`), set on exactly the two steps that create a file (Setup Step 7, Hand Session 1 Step 1), transcribed faithfully from the source markdown's own "new file" label. `FileCodePanel` renders it as a green "📄 Create a new file called …" callout above the code panel whenever present — absent on every other step, which all continue an already-created file.

**2. Path-aware CAM_SOURCE.** New `lib/camSource.ts`: an exact-line-match substitution table for the two known generic `CAM_SOURCE` lines (the `hello_webcam.py` wording and the `hand_ar.py` wording used identically across all four Hand Tracking sessions), each mapped to its concrete Path A / Path B replacement. `FileCodePanel` applies it (via the same `cameraPath` the fork step's chooser writes) to *both* the "Type this" and "full file so far" views, with a small "Showing the CAM_SOURCE line for your Path X setup" note when active. Falls back to the original generic line — showing both options, exactly as before — until a path is chosen, so nothing regresses for a student who hasn't reached the fork step yet. Because the match is on the literal source line, this fix applies everywhere that exact line recurs (every session's `hand_ar.py`), not just Step 7.

**3. Line-range + continuation context in "Type this".** New `newLineGroupsWithContext` in `lib/code.ts`: each isolated new-code group now carries its approximate 1-indexed line range (e.g. "Lines 46–48") plus the next *unchanged* line in the file right after it ("↳ goes right before: `def main():`", or "↳ goes at the very end of the file" when there's none) — verified live against both blank-line and real-code trailing context. This directly answers "is this a continuation or an insertion" without over-promising exactness; the existing "numbers may drift" caveat on the full-file reference panel still stands as the authoritative structure check.

`npx tsc --noEmit` and `npx next build` both pass clean (26/26 static pages).
