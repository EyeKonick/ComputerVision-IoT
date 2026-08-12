Type: prototype
Status: open
Blocked by: 05, 09

## Question

Assemble the final **Claude Code + Fable build-prompt**, using every drafted session's content (tickets 01–09) as its material.

The prompt must specify, concretely enough for a fresh Claude Code session to design and build without further clarification:

- **App shape**: builds inside this existing Next.js repo (`python-cv-iot-guide`); linear node-chain visual metaphor (connected step-nodes in strict sequence, no branching); next/previous navigation plus a jump-to-any-step overview map; no in-browser code execution (reference/walkthrough only).
- **Content model**: how the drafted step content (explanation, full cumulative code with new-lines highlighted, common problems) is structured as data for the app to render — resolve the open question from the map's "Not yet specified" section (MDX per step vs. JSON step array vs. some other structure) and justify the pick.
- **Grouping**: three tracks — Setup & Environment, Hand Tracking (4 sessions), Face Tracking (4 sessions) — and how the node-chain overview represents that grouping (e.g. sessions as sub-chains within a track).
- **Visual design instructions for Fable**: hand off the "what," not the "how" — describe the desired feel (presenter-driven classroom tool, code-forward, legible from a projector at a distance) without prescribing exact colors/components, since aesthetic decisions are explicitly deferred to a Fable prototyping pass.
- **The actual content**: either embedded directly or clearly linked/referenced so the build has real material, not placeholders.

Output the complete build-prompt document as this ticket's answer.
