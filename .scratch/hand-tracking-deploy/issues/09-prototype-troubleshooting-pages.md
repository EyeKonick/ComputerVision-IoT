Type: prototype
Status: claimed
Blocked by: 08

## Question

Design and mock up (via `/prototype`) the visual system for the troubleshooting sub-pages decided in [Troubleshooting UX scope & navigation model](07-troubleshooting-ux-scope.md), using real scenarios from [the research catalog](08-research-troubleshooting-scenarios.md) so it's reacted to with real content, not lorem ipsum.

Covers:
- The **entry-point link**: how a "Stuck?" / help affordance appears on a step that has known problems — inline near the relevant content (e.g. next to the command that commonly fails), styled consistently with the approved Fable design system (near-black ground, magenta/cyan/amber accents) but visually distinct enough to read as "this leaves the main flow."
- The **troubleshooting page itself**: one page per category (Python/pip/venv; ADB/Android) per decision #6 — layout for a flat list of symptom → fix cards, how multiple scenarios on one page are scannable/searchable rather than a wall of text, and how OS-specific content within Category A is presented (tabs? all three shown at once? auto-detect from nothing since there's no reliable client-side OS check worth trusting?).
- The **copy-paste-enabled code block** for fix commands — deliberately the opposite of the main flow's no-copy `FileCodePanel`; needs its own distinct visual treatment so students don't confuse "code I should copy" with "code I should type."
- The **return path**: an explicit, unmissable "← Back to Step X" link, and confirmation this never touches the `localStorage` resume state (decision #7).

Resolved when a mockup exists (as an Artifact, following the ticket 01 precedent) that the instructor has reacted to and approved, covering at least one real scenario from each category.
