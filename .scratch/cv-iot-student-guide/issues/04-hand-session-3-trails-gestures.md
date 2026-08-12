Type: prototype
Status: resolved
Blocked by: 03

## Question

Draft the full teaching content for **Hand Tracking — Session 3**: fingertip particle trails and gesture recognition. Covers the `trails` deque structure, drawing fading trail circles per fingertip, `count_fingers()` (distance-based extended-finger detection vs. wrist, with the thumb measured against the pinky MCP instead), pinch detection (`math.hypot` between thumb tip and index tip vs. `PINCH_THRESHOLD`), the handedness label, and the `draw_text_with_bg` HUD readout.

Break into small logical-chunk steps. For each: what it does, why (e.g. why finger-extension is distance-based rather than a simple y-coordinate comparison — it has to work regardless of hand rotation/orientation; why the thumb needs a different reference point than the other four fingers), and common problems (trail flickering if `TRAIL_LENGTH` too short, finger count reading wrong when hand is at an angle, pinch threshold needing tuning for different camera resolutions/distances, confusing "Right"/"Left" handedness with mirrored image).

Show the full cumulative file at each step with new lines highlighted. Output the full drafted content as this ticket's answer.

## Answer

Full drafted content: [`content/04-hand-session-3-trails-gestures.md`](../content/04-hand-session-3-trails-gestures.md) — 4 steps (fingertip trails → `count_fingers()` → pinch detection + handedness label → HUD readout display). Trails are visible immediately after Step 1; Steps 2–3 are invisible until Step 4. Deferred `pinch_active_any`/`index_tip_px` (orb-interaction bookkeeping) entirely to Session 4, since they only matter once the orb exists. Reviewed and approved without requested changes.

**Amendment (glossary pass):** every step now has a "New in this step" section (plain-language definitions — `collections.deque`, `enumerate`, generator expressions, `math`/`math.hypot`, docstrings, `result.handedness`, `cv2.putText`/`cv2.getTextSize`, f-strings, `min`/`max`), placed after the code and before "Why it matters."
