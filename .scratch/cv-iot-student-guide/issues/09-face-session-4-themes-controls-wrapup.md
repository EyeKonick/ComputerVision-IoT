Type: prototype
Status: open
Blocked by: 08

## Question

Draft the full teaching content for **Face Tracking — Session 4**: themes, screenshots, remaining controls, and wrap-up polish — the final increment that completes `face_tracker.py` end to end. Covers the `THEMES` list and `c` key cycling, `s` screenshot saving (`cv2.imwrite`), the `force_window_focus` Win32 workaround and `f` key, the top/bottom HUD bars, the FPS smoothing (`fps = 0.9 * fps + 0.1 * (1.0 / dt)`), and the full key-handler block.

Break into small logical-chunk steps. For each: what it does, why (e.g. why FPS is smoothed with a running average instead of shown raw — raw FPS jitters too much to read; why Windows needs the explicit `SetForegroundWindow` workaround at all), and common problems (screenshots overwriting each other if `shot_count` isn't persisted across quits, `force_window_focus` silently failing outside Windows — note it's Windows-only via `ctypes.windll`, keys not registering if the OpenCV window isn't focused).

Close this session with a short **framing note**: the mood readout and mesh HUD are presented as "biometric-logging" flavor per the syllabus's Module 11 framing, but named-person recognition (matching specific known individuals) is NOT implemented here — flag it, as a clearly marked future-extension callout only (not built), alongside a brief note on the privacy/consent/ethics angle the syllabus calls out for this module.

Show the full cumulative file at each step with new lines highlighted (this is now the complete `face_tracker.py`). Output the full drafted content as this ticket's answer.
