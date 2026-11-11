Type: task
Status: closed
Assignee: EyeKonick
Blocked by: (none)

## Question

Stand up the QR Attendance track and its first session. Done means all of:

1. **Track scaffold** — `app/qr-attendance/` as a structural mirror of
   `app/facial-recognition/` (`[stepId]` route, `layout.tsx`, `page.tsx`,
   `components/`, `data/` with `types.ts` / `index.ts` / `lib.ts` /
   `sessions/`, `lib/`), class prefix `qr-`, own `localStorage` key
   `qra_progress_v1`, sequential lock + resume behaviour identical to the
   other tracks.
2. **3-way track switcher** — replace the single "↔ Switch to …" link in all
   three chain rails (hand, face, qr) with one shared `Hand · Face · QR`
   switcher, current track highlighted. Home `/` still redirects to
   `/hand-tracking`. Switching never touches another track's progress.
3. **Session 0 — Project setup** (draft + build in one pass): new
   `qr-attendance` folder → new venv → activate → `pip install
   opencv-python "qrcode[pil]" numpy` → camera check. Links back to Hand
   Tracking Setup for installing Python and the phone/adb setup, and to its
   troubleshooting pages. Full glossary + common problems on every step
   (e.g. `ModuleNotFoundError: No module named 'qrcode'`, installing into
   the wrong / un-activated venv, quoting `qrcode[pil]` in some shells).
4. **QR camera-source chooser** in Session 0's camera-check step: Laptop /
   Phone, saved in `qra_progress_v1`, pre-selecting Hand Tracking's stored
   `forkChoices["setup-6"]` if present (read-only). Wire QR's `camSource`
   personalisation to read QR's own choice.
5. **Housekeeping:** the `source code/` → `source-code/` folder rename is
   still uncommitted; update the 7 stale `source code/` references in the
   Hand / Face session data (and the sibling maps' Notes where they name
   paths), and commit the new `source-code/qr-attendance/` scripts
   (`.gitignore` included) alongside.

Save the drafted Session 0 markdown to
`.scratch/qr-attendance-guide/content/00-qr-session-0-project-setup.md`.
Verify in-browser at desktop and phone widths and `npm run build`, then
commit and push (see map's ship policy).

## Answer

All five parts built, verified, and shipped.

**1. Track scaffold** — `app/qr-attendance/` mirrors `app/facial-recognition/` (`[stepId]` route, layout, resume-redirect index, components, `data/`, `lib/`), class prefix `qr-`, storage key `qra_progress_v1` (event `qra-progress-changed`), same sequential lock + `LockGuard` + resume. CSS is Face's stylesheet with the prefix swapped, plus one QR-only block (`.qr-help-links`). The rail numbers sessions from `00`.

**2. 3-way switcher** — new shared `app/components/TrackSwitcher.tsx` (+ `TrackSwitcher.module.css`, styled from each track's own design tokens) replaces the old single "↔ Switch to …" link in all three chain rails; the dead `*-track-switch-link` CSS was removed from Hand and Face. Current track is highlighted (`aria-current`). It only navigates; no track touches another's progress. `/` still redirects to `/hand-tracking`.

**3. Session 0 — Project setup** — 6 steps (`data/sessions/00-qr-session-0.ts`, record at [content/00-qr-session-0-project-setup.md](../content/00-qr-session-0-project-setup.md)): folder → venv → activate + `where/which` check → `pip install opencv-python "qrcode[pil]" numpy` + a one-line import check → camera-source fork → `camera_check.py`. Full glossary + common problems on every step. New optional `Step.links` field renders a "Need more help?" list. Session 0 uses it to link to Hand Tracking's `setup-1b` (install Python), `setup-6` (one-time phone setup), and both troubleshooting pages. **Known limitation:** Hand Tracking's own sequential lock bounces a student who hasn't been through it on that browser to an earlier step, so the links carry a one-line note ("click Next until you reach it"). Path B also inlines the every-session `adb devices` / `adb forward` routine, so day-to-day use never needs Hand's page.
- `camera_check.py`'s `CAM_SOURCE` block and camera-open block are copied exactly from `qr_scanner.py` (top-level instead of inside `main()`), so Session 2 re-meets them. It passes `py_compile`.
- The syllabus's Module 7 names pyzbar. Step 4 says why we use OpenCV's built-in `QRCodeDetector` instead.

**4. QR camera-source chooser** — Step 5 (`qr-s0-5`, `QR_CAMERA_FORK_STEP_ID` in `lib/progress.ts`) is a fork step (Path A laptop / Path B phone), saved in `qra_progress_v1`. `forkChoiceFor` / `loadCameraChoice` fall back to Hand's `htg_progress_v1` → `forkChoices["setup-6"]` (read-only) until the student picks in QR. **Personalisation (`lib/camSource.ts`) matches the bare line `CAM_SOURCE = 0`**: Path A leaves it unchanged, Path B swaps in `CAM_SOURCE = "http://localhost:8080/video"`. **Sessions 2–4 must keep that line exactly as `qr_scanner.py` has it** (it does) for personalisation to work.

**5. Housekeeping** — the `source code/` → `source-code/` rename is committed; 7 stale references fixed in Hand/Face session data, plus the path in `cv-iot-student-guide/map.md`. Closed tickets' history was left as written. `source-code/qr-attendance/` is committed with its `.gitignore` (which ignores `qr_codes/`, `attendance.csv`, `scanner_*.png`, `__pycache__/`, `venv/`). Root metadata description now names all three guides.

**Verified:** `npx tsc --noEmit` and `npx next build` clean (QR prerenders 6 step pages). In the browser (Playwright) at 1440px and phone width, with no console warnings or errors and no horizontal overflow:
- the Hand-stored "B" choice pre-selects Path B in both the chooser and the chain fork node
- switching writes only `qra_progress_v1` (Hand's store untouched)
- step 6's panel shows the phone URL line
- the switcher highlights the right track on all three guides

**Lint:** `eslint app` reports 4 `react-hooks/set-state-in-effect` errors in QR. These are the identical, already-present pattern that Face (4) and Hand (6) have on `main`. They were inherited by the mirror, not fixed here, so the repo is not lint-clean.
