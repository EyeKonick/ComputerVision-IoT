# Map: CV/IoT Student Guide

## Destination

A detailed **Claude Code + Fable build-prompt**, delivered together with a **complete drafted content spec** (real per-session step explanations, cumulative code with new lines highlighted, and common-problems notes — not placeholders), describing an in-repo (this Next.js app), presenter-driven, linear node-chain step guide.

Coverage: environment setup, the **Hand & Finger AR Tracker** activity (`source code/hand-tracking/hand_ar.py`, ~4 class sessions), and the **AR Face Tracker** activity (`source code/facial-recognition/face_tracker.py`, ~4 class sessions).

No in-browser code execution — students code in VS Code on their own machines; the guide is a live-class reference the instructor drives on a projector, with next/previous plus jump-to-any-step navigation over a visible node-chain overview.

Actual visual/UI design (via Fable) and building the real app happen **after** this map, using its output as the brief — that build is not part of this destination.

## Notes

- Domain: ITE 3 — Applied Computer Vision and IoT with Python, an 18-week college course. Instructor teaches live, one step at a time, students code along on their own laptops in VS Code.
- **This effort carries execution into the tickets** (overriding wayfinder's default "plan, don't do"): resolving a content ticket means actually drafting the real teaching content — Claude drafts from the source script + syllabus, the instructor reviews/corrects during resolution. The map's tickets are not slice-of-a-build tasks in the usual sense, but each still resolves one clear question: "what does this session's step-by-step teaching content look like?"
- Class meets **twice weekly**; each 2-week syllabus module block ≈ 4 class sessions.
- Source of truth for code is the two scripts as given — they are the literal end state students build toward. Content tickets reverse-engineer them into small (~5–20 line) logical-chunk steps, one session's worth per ticket, each step showing the **full cumulative file** with newly-added lines highlighted (never an isolated snippet).
- `face_tracker.py` teaches detection + mesh + mood only — NOT named-person recognition. `hand_ar.py`'s virtual orb stands in for a real IoT actuation. Both gaps get a short "future extension" callout in the relevant session's content, never new code.
- Both scripts now open the camera via a `CAM_SOURCE` config (int device index for a laptop webcam, URL string for a phone tunneled over USB via `adb reverse`) instead of a hardcoded index — see [Camera source for lab computers](issues/11-camera-source-lab-computers.md). Hand Tracking Session 1 and Face Tracking Session 1's "open the webcam" steps should teach `CAM_SOURCE` directly (students already met the pattern in the Setup session), not the old hardcoded-index version.
- If a ticket surfaces a real open decision or ambiguity, invoke `/grilling` and `/domain-modeling` rather than guessing.
- Consult `AGENTS.md` at the repo root before touching any Next.js code (this project has non-standard/breaking-change docs under `node_modules/next/dist/docs/`) — relevant once ticket 10 starts describing concrete build instructions.
- **Every step needs a "New in this step" glossary** — a short, plain-language, non-technical definition for each new built-in function/symbol/concept introduced that step, placed after the code and before "Why it matters" ("why it matters" stays focused on design rationale, not vocabulary). Standard as of the glossary pass done for the whole Hand Tracking track (Setup + Sessions 1–4, all 26 steps). **Not yet applied to Face Tracking** — Session 1 (already drafted/closed) and Sessions 2–4 all still need this pass whenever that track resumes; don't assume it's there.

## Decisions so far

- [Setup & Environment session](issues/01-setup-environment-session.md) — drafted content (Python/PATH → venv → activate → verify → install pinned deps → choose camera source → "Hello, Camera" check); also fixed a real mediapipe version mismatch in the repo (`hand-tracking/requirements.txt` now pins `==0.10.14` to match `facial-recognition/requirements.txt`). Revised after [Camera source for lab computers](issues/11-camera-source-lab-computers.md) closed — see that ticket for what changed.
- [Camera source for lab computers](issues/11-camera-source-lab-computers.md) — lab PCs have no webcam and no WiFi (Ethernet only), so students there use an Android phone over USB instead. Recommended path: `adb reverse` + IP Webcam app, no vendor driver install (fallback: DroidCam USB mode). Implemented a shared `CAM_SOURCE` config (int index or URL) in both `hand_ar.py` and `face_tracker.py`, replacing their old hardcoded camera-index logic. Full findings in `research/camera-source-lab-computers.md`.
- [Hand Tracking Session 1](issues/02-hand-session-1-webcam-loop.md) — 5-step drafted content (imports/config → `ensure_model()` → open camera via `CAM_SOURCE` → capture/mirror/show loop → quit + cleanup). Established the cumulative-file-with-`# ← new`-markers convention used for the rest of the guide. *Corrected later:* Step 1 now explicitly instructs creating `hand_ar.py` as a new file (was missing). Face Session 1 likely needs the same fix when that track resumes.
- [Hand Tracking Session 2](issues/03-hand-session-2-landmarks-skeleton.md) — 5-step drafted content (load model → detect per frame → extract landmarks + draw skeleton → draw joints → composite glow onto frame). Flags that Steps 3–4 have no visible effect until Step 5.
- [Hand Tracking Session 3](issues/04-hand-session-3-trails-gestures.md) — 4-step drafted content (fingertip trails → `count_fingers()` → pinch + handedness → HUD readout). Orb-interaction bookkeeping (`pinch_active_any`/`index_tip_px`) deferred entirely to Session 4.
- [Hand Tracking Session 4](issues/05-hand-session-4-orb-wrapup.md) — 5-step drafted content (orb state + hand selection → grab/drag → draw orb → FPS/title HUD → 'r' reset), completing `hand_ar.py`. Includes the required IoT-actuation framing note. **Hand Tracking track fully drafted.**
- [Face Tracking Session 1](issues/06-face-session-1-webcam-detection.md) — 4-step drafted content (imports/config/camera-open with extra `CAP_DSHOW` retry → capture loop → load `FaceDetection` + run per frame → plain bounding box).

## Not yet specified

- Exact number/boundary of steps within each session — settled as each session ticket resolves.
- The precise data/component architecture for the node-chain UI in the Next.js app (routes vs. single scrolling page, MDX vs. JSON step data, etc.) — resolved in the final build-prompt ticket.
- Exact wording/placement of the "future extension" callouts for the face-recognition and IoT-actuation gaps.

## Out of scope

- The other 10 modules of the ITE 3 syllabus (Python refresher, general image processing, the ID/Card Scanner + Smart Attendance project, the student-chosen final project) — this guide covers only the two activities with existing source code.
- Actual visual/UI design work (Fable) and building the real guide app — happens in a future effort that consumes this map's build-prompt output; not part of this destination.
- Building real named-face recognition (embeddings / known-faces matching) and real IoT hardware/API actuation — the given scripts don't implement these; the guide documents what exists and flags these as future extensions only, never builds them.
