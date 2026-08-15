Type: task
Status: resolved
Blocked by: (none)

## Question

The deployed Setup session (Step 6, Path B — phone over USB) instructs students to run `adb reverse tcp:8080 tcp:8080`, but that's backwards: `adb reverse` opens its listener on the *phone's* port 8080, which IP Webcam's own server already occupies once streaming starts, so it fails with "address already in use" every time IP Webcam is running — not intermittently, by design. Apply the corrected procedure (and the debugging-toggle-order / screen-timeout gotchas that surfaced alongside it) everywhere this content is duplicated across the built app.

## Answer

Source: instructor-supplied runbook compiled from a live troubleshooting session on a Windows lab-style machine (six incidents in order, from adb not yet installed through the port-direction bug).

Fixed `adb reverse` → `adb forward` and folded in the corrected every-session sequence (plug in with a data cable → enable USB debugging *after* connecting, then unplug/replug once → watch for the fingerprint authorization dialog, distinct from the file-transfer mode popup → `adb devices` to confirm authorized → `adb forward tcp:8080 tcp:8080` → Start server in IP Webcam with "Keep screen on" and Developer Options' "Stay awake while charging" both enabled → sanity-check `http://localhost:8080/video` in a browser → set `CAM_SOURCE`) in:

- `app/hand-tracking/data/sessions/00-setup.ts` — `setup-6`'s fork body/commands, why, glossary, and common-problems; `setup-7`'s Path B common-problem line.
- `app/hand-tracking/data/sessions/01-hand-session-1.ts` — the "(Phone over USB) Could not open webcam" common-problem entry.
- `app/hand-tracking/troubleshooting/prototype-data.ts` — the `adb-bind-listener-error` scenario's cause/fix were themselves wrong (attributed to a stale tunnel or a competing tool); corrected to name the real cause (two listeners can't share the phone's port 8080) and the real fix (`adb forward`, not resetting the server).
- `source code/hand-tracking/hand_ar.py` and `source code/facial-recognition/face_tracker.py` — the `CAM_SOURCE` setup comment.

Also applied upstream to the sibling map's source-of-truth markdown, `.scratch/cv-iot-student-guide/content/01-setup-environment.md` (see [Setup & Environment session](../../cv-iot-student-guide/issues/01-setup-environment-session.md)'s amendment), since this map's Notes require converting faithfully from that file and it would otherwise drift out of sync.

Not touched: `.scratch/hand-tracking-deploy/research/troubleshooting-scenarios.md` (ticket 08's research artifact) — left as a dated historical record rather than rewritten; this ticket is the pointer to the superseding finding.

Verified: `npx tsc --noEmit -p .` clean.
