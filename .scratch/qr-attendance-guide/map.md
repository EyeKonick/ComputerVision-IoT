# Map: QR Attendance Guide

## Destination

A third guide track, **QR Attendance**, built as real pages under `app/qr-attendance/` in this Next.js app and **live on Vercel**: a Session 0 (Project setup) plus Sessions 1–4 that teach students to build `source-code/qr-attendance/qr_generator.py` and `qr_scanner.py` step by step, each session's last step ending on files byte-identical to those scripts — with a 3-way `Hand · Face · QR` track switcher shared by all three guides.

## Notes

- Domain: ITE 3 — Applied Computer Vision and IoT with Python. Same live-class, code-along-in-VS-Code setting as the [CV/IoT Student Guide map](../cv-iot-student-guide/map.md) and the [Build & Deploy map](../hand-tracking-deploy/map.md); read their Notes for the standing conventions (cumulative full file per step with new lines highlighted, sequential unlock, no-copy code panels, `localStorage` progress, "create a new file" callouts, line-range + trailing-context "Type this" groups, `{ error, solution }` common-problems accordion).
- **This effort carries execution into the tickets** (overriding wayfinder's "plan, don't do"): each session ticket **drafts the content and builds the pages in one pass** (the Face Sessions 2–4 workflow). The drafted markdown is still saved to `content/` here as the source record; the instructor reviews on the live pages.
- **Source of truth for code:** `source-code/qr-attendance/qr_generator.py` and `qr_scanner.py` as they stand. Every step's cumulative file must `python -m py_compile` cleanly; each session's last step must match the real file it builds (generator ends Session 1; scanner ends Session 4). Prefer step orderings where each step is a pure insertion; when a step must re-indent or replace earlier-typed lines, say so out loud in the step (as Face Session 4 did).
- **Every step gets a "New in this step" glossary** from the start — plain-language, non-technical, one entry per new built-in/symbol/concept. Never ship `glossary: []`.
- **No separate troubleshooting pages.** Every QR-specific failure goes into the "Common problems" of the step where it happens — nothing left out. Session 0 links to Hand Tracking's existing troubleshooting pages for Python / venv / adb failures.
- **Session 0 — Project setup** starts students fresh: new `qr-attendance` folder → new venv → activate → `pip install opencv-python "qrcode[pil]" numpy` → camera check. It does **not** re-teach installing Python or the phone/adb setup — it links back to the Hand Tracking Setup steps for those.
- **QR has its own camera-source chooser** (Laptop / Phone) in Session 0's camera-check step, persisted in QR's own progress store; pre-selects Hand Tracking's stored Setup fork choice (`htg_progress_v1` → `forkChoices["setup-6"]`) if one exists, read-only. All QR code panels personalise the `CAM_SOURCE` line from QR's own choice.
- **Showing the QR card to the camera** is documented as a two-way choice at the step where the scanner first reads a code: laptop students show the card PNG on their phone to the webcam; lab-PC students (phone *is* the camera) open the PNG on the PC monitor (recommended), print it, or use a classmate's phone. Glare / moiré / too-small / too-far get their own common-problems entries.
- **Look & feel:** reuse Hand Tracking's approved design verbatim, mirroring `app/facial-recognition/`'s structure — class prefix `qr-`, own `localStorage` key `qra_progress_v1`, independent of the other tracks.
- **Ship policy (standing approval from the user):** when a ticket is finished and verified (py_compile + in-browser check at desktop and phone widths + `npm run build` / lint clean), **commit and push to `main`** — Vercel deploys it live. No separate confirmation needed per ticket.
- Consult `AGENTS.md` at the repo root before touching any Next.js code (pre-release Next.js with breaking changes; docs in `node_modules/next/dist/docs/`).
- If a ticket surfaces a real open decision, invoke `/grilling` and `/domain-modeling` rather than guessing. Ask the user **one question at a time**, in plain text.

## Decisions so far

<!-- one line per closed ticket -->

- [Scaffold, switcher & Session 0](issues/01-scaffold-switcher-session-0.md) — `app/qr-attendance/` live with a 6-step Project setup, shared `TrackSwitcher` in all three rails, QR camera fork `qr-s0-5` (pre-selects Hand's choice). CAM_SOURCE personalisation keys on the bare line `CAM_SOURCE = 0`, and `Step.links` is available for cross-track links.
- [QR Session 1 — Generator](issues/02-qr-session-1-generator.md) — 6 steps ending byte-identical to `qr_generator.py`. The only non-insertion is the temporary `return qr_img` → `return card` swap.
- [QR Session 2 — Scanner basics](issues/03-qr-session-2-scanner-basics.md) — 4 steps, including the "how to show your card" fork (`qr-s2-3`, pre-selected from the camera choice). Its two stand-ins and the short `draw_qr_outline` were all reconciled later.
- [QR Session 3 — Attendance logic](issues/04-qr-session-3-attendance-logic.md) — 5 steps: roster import, cooldown, CSV log/load, final-form `handle_scan` replacing both S2 stand-ins, and a no-code three-result test. No stand-ins remain after it.
- [QR Session 4 — Polished UI & wrap-up](issues/05-qr-session-4-ui-wrapup.md) — 7 pure-insertion steps ending byte-identical to `qr_scanner.py`. Closing note covers attendance-data privacy and consent, Module 8, and the photo-of-a-card limit. **Track complete.**

## Not yet specified

_Nothing — every patch graduated: step boundaries, the Session 4 framing note and each session's syllabusMapping were all settled while drafting._

## Out of scope

- A QR-specific visual identity / Fable design pass — reuses Hand Tracking's design (decided during charting).
- QR troubleshooting sub-pages — failures are covered per step in common problems instead (decided during charting).
- Back-filling the Facial Recognition glossary — tracked on the [Build & Deploy map](../hand-tracking-deploy/map.md), not here.
- Features beyond the given scripts (signed/anti-fake codes, CSV roster input, a database, multi-code scanning) — the guide teaches the scripts as they are.
