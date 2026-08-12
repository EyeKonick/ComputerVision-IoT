Type: task
Status: closed
Blocked by: 03

## Question

Instructor feedback on the built guide (ticket 03), given directly with a screenshot and explicit implementation instructions — two concrete UI corrections, not open decisions:

1. The camera-source fork step's detail panel showed **both** Path A and Path B content stacked at once. It should show only the path the student actually chose (via the chain's fork node), never both simultaneously.
2. Students could jump ahead to any step in the chain (the map's Notes had carried over a "jump-to-any-step overview" as a given from the sibling map's earlier grilling). The instructor wants **strict sequential unlock** instead: the next node stays locked until the student clicks through the one before it. This supersedes that earlier "jump to any step" decision for this track — noted here since it changes a previously-recorded given.

## Answer

Both implemented and verified live in-browser; this map's Notes carry execution into tickets, so resolved directly rather than staged as a separate decision ticket.

**1. Single-path fork display** — new `ForkPathChooser` client component (`app/hand-tracking/components/ForkPathChooser.tsx`) replaces the old always-both-paths `ForkPaths`. Until a path is chosen it shows a two-card chooser ("Which camera source are you using today?"); once chosen (via either this chooser or the chain's own fork node — both write the same `localStorage` record) it shows only that path's body/commands, with a small "Not on this path? Switch" escape hatch. A same-tab pub/sub (`notifyProgressChanged`/`subscribeToProgress` in `lib/progress.ts`) keeps the chain rail's fork-node styling and this in-page chooser synchronized without a navigation.

**2. Sequential locking** — added `isLocked`/`maxVisited` to `lib/progress.ts`: a step unlocks once every step before it has been visited, i.e. `flatIndex <= maxVisited(visited) + 1`. `ChainRail` renders any node past that boundary as a non-interactive dashed/dimmed node (own tooltip: "🔒 Locked — finish the previous step first") instead of a `Link`; `ChainForkNode` does the same for both branches when the fork step itself is locked. Added a `LockGuard` client component, mounted on every step page, that independently redirects a locked step's URL back to the real next unlocked step — closing the direct-URL-paste bypass that clicking-only enforcement would have left open.

**A real race-condition bug found and fixed along the way:** `ChainRail`'s own mount effect was unconditionally marking whatever step the current URL pointed at as "visited" — which silently legitimized a locked step (and defeated `LockGuard`) the moment its page rendered, since `LockGuard`'s own check then saw it as already visited. Fixed by having `ChainRail` skip that unconditional save when the current step is itself locked, so `LockGuard` always sees the true, untouched progress. Verified via direct `localStorage` inspection before/after, and via a real Playwright direct-URL-skip attempt that now correctly bounces back.

Also fixed a visual regression caught during verification: the first pass at "locked" styling (opacity 0.3 + dashed border) made locked nodes nearly invisible against the dark background; toned down to a clearly-visible dashed outline instead.

`npx tsc --noEmit` and `npx next build` both pass clean (26/26 static pages).
