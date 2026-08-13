Type: task
Status: open
Blocked by: 08, 09

## Question

Build the real troubleshooting sub-pages in this Next.js app, using the approved mockup ([ticket 09](09-prototype-troubleshooting-pages.md)) and the full research catalog ([ticket 08](08-research-troubleshooting-scenarios.md)), per the decisions in [ticket 07](07-troubleshooting-ux-scope.md).

Covers:
- Content data for the two category pages (Python/pip/venv; ADB/Android), authored from the research catalog — real symptom text, real cause, real fix per scenario, not placeholders.
- New route(s) under `app/hand-tracking/troubleshooting/` (or equivalent), entirely outside the node-chain — not a step, not lock-guarded, not a `localStorage` resume target.
- Entry-point links wired into every Setup Step 1–6 (and Hand Session 1 steps, where session-specific) page that has a matching known problem, per the approved mockup.
- Copy-paste-enabled code blocks for fix commands, visually distinct from the main flow's no-copy `FileCodePanel`.
- Verify live in-browser (desktop + phone viewport): entry links work from every relevant step, the "back to Step X" link returns correctly, and leaving/returning to a troubleshooting page never changes or corrupts the main-flow resume state.

This map's Notes carry execution into tickets — resolve by actually building and verifying, not just deciding an approach.
