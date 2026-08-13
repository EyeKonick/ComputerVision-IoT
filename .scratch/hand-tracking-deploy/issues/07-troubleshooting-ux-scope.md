Type: grilling
Status: closed
Blocked by: (none)

## Question

New loose idea from the user: make the Hand Tracking guide beginner-friendly for students with zero Python background, by adding troubleshooting/diagnostic help for common early failures (missing dependencies, adb not installed, Android connection/bind-listener errors, Python permission-to-run issues) — a path that diverges outside the main flow and returns once resolved, backed by deep research into all realistic failure scenarios.

Needed grilling before this could be ticketed: does this extend the existing map or start a new one; what does "a path outside the main flow" actually render as, given the map's existing "strictly linear, no branching" navigation decision; which session(s) this actually targets; how wide the research should go; and whether "zero Python background" expands scope beyond error-recovery.

## Answer

Nine decisions, reached via `/grilling` directly with the user:

1. **Extends this map**, not a new sibling map — same pages/content model/component system, not a separate concern like Face Tracking.
2. **Dedicated troubleshooting sub-pages** (not inline accordions, not new chain nodes) — a "Stuck?" link from a step navigates to a real separate page, with an explicit link back to the step. This does **not** actually conflict with the "no branching" chain decision on reflection: troubleshooting pages sit entirely outside the node-chain (not steps, never counted toward progress/lock state), so the existing Note's "no branching" claim about the chain itself still holds — this is closer to a footnote/appendix than an alternate route through the guide.
3. **Primarily the Setup & Environment session** (Steps 1–6: PATH, venv, activation, install, camera source) — that's where nearly all the described failure modes actually live, not "Hand Tracking Session 1" (the webcam loop) as the user's shorthand literally named. Extends into Hand Session 1 only where genuinely session-specific (e.g. `hand_landmarker.task` download/firewall failures).
4. **Research covers Windows, macOS, and Linux** for the Python/pip/venv side, plus **Android/adb/USB-debugging issues regardless of host OS** for the phone-camera path.
5. **Scope stays error-recovery/troubleshooting only** — no expansion into baseline terminal/file literacy (what's a terminal, what's a file extension, etc.). That's a different, valid enhancement, parked in Not yet specified if ever wanted.
6. **Troubleshooting pages organized per-symptom/category**, not per-step — e.g. one canonical "ADB & Android connection problems" page and one "Python/pip/venv problems" page, linked from every step where relevant. Avoids duplicating the same fix in multiple places.
7. **Resume/progress (`localStorage`) never targets a troubleshooting page** — closing the browser mid-troubleshooting and returning always resumes on the main-flow step the student diverged from.
8. **Flat symptom → fix reference style**, not an interactive branching diagnostic quiz — matches the existing content's voice and the guide's already-locked "read-along reference, not interactive" philosophy.
9. **Copy-paste is allowed on troubleshooting pages**, unlike main-flow code panels. The no-copy rule exists to force typing *lesson* code for muscle memory; one-off environment-fix commands (`adb kill-server`, `Set-ExecutionPolicy ...`) aren't lesson content, and a stuck student shouldn't also have to hand-type a PowerShell incantation correctly.

Also surfaced live during grilling: ticket 06 already delivered the "detailed direction for where to create each file" part of the original ask — that's done, out of remaining scope here. And a real content gap was found before research even started: the current source markdown has **no coverage of adb bind/listener errors** (`cannot bind to socket`, `Address already in use`, `more than one device/emulator`) — a genuine gap for the research ticket to fill, not invented scope.

Unblocks: [Research beginner setup & troubleshooting failure scenarios](08-research-troubleshooting-scenarios.md) → [Prototype troubleshooting page system](09-prototype-troubleshooting-pages.md) → [Build troubleshooting pages](10-build-troubleshooting-pages.md).
