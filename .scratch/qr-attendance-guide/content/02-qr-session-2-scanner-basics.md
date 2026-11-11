# QR Attendance — Session 2: Scanner basics — reading QR codes live

**Track:** QR Attendance (2 of 4)  
**Syllabus mapping:** Module 3 — VideoCapture and the phone camera as a source; Module 7 — Reading the Card: decoding QR codes from a live feed (OpenCV's QRCodeDetector in place of pyzbar)  
**Builds on:** QR Session 1's QR cards and Session 0's camera check  
**Builds toward:** `source-code/qr-attendance/qr_scanner.py`

> Source record for `app/qr-attendance/data/sessions/02-qr-session-2.ts` (generated alongside it — the TS file is what ships). Code blocks show the full file after each step; new lines are marked with `+` in the margin.

## Session goal

Today we start qr_scanner.py: a live camera window that finds a QR card, reads the text inside it, and draws an outline around it — even though the picture you see is mirrored.

## Instructor notes

- Code-display convention (used in every session): each step shows the entire file so far, with lines added or changed in that step marked as new.
- Sessions 2–4 grow one file, qr_scanner.py, ending byte-identical to source-code/qr-attendance/qr_scanner.py. Two lines in this session are temporary stand-ins, both replaced in Session 3: print("Scanned:", data) (Step 2) and the fixed-green draw_qr_outline(frame, points, (0, 255, 0), "") call (Step 4). draw_qr_outline itself is typed in a short form here and completed in Session 4 by adding lines only.
- Step 3 is a two-way choice for showing the card: laptop students hold their phone up to the webcam; lab-PC students (phone is the camera) use the PC monitor (recommended), a printed card, or a classmate's phone. Have a few printed cards ready for anyone stuck on glare.
- The detector reads the original frame before it's mirrored for display — older OpenCV builds can't decode mirrored codes — and the corner points are mirrored afterwards so the outline lines up. Worth saying out loud in Step 4.

---

## Step 1 — Create qr_scanner.py: open the camera and show a live window

**Say:** Today we build the other half: the scanner. It starts exactly like the camera check from Session 0 — open the camera, then show frame after frame in a window — but this time inside a function called main, in the real file we'll keep growing until Session 4.

Two things are new compared with the camera check: we ask the camera for a bigger 1280 × 720 picture, and the program also quits on the ESC key, not just Q.

Your CAM_SOURCE line is already set for the camera source you chose in Session 0.

> **Create a new file:** Create a new file called qr_scanner.py in your qr-attendance folder — the same folder as qr_generator.py and the qr_codes folder. In VS Code: File → New File → name it qr_scanner.py → save it in qr-attendance. It must sit right next to qr_generator.py: in Session 3 it reads the class list straight out of that file.

**`qr_scanner.py` after this step:**

```python
+ import cv2
+ 
+ WINDOW_NAME = "QR ATTENDANCE SCANNER"
+ 
+ CAM_SOURCE = 0
+ # Laptop with a built-in webcam: leave as the device index above (0).
+ # Lab PC with no webcam: set to your phone's IP Webcam stream tunneled over
+ # USB via `adb forward tcp:8080 tcp:8080`, e.g.:
+ #   CAM_SOURCE = "http://localhost:8080/video"
+ 
+ 
+ def main():
+     if isinstance(CAM_SOURCE, int):
+         cap = cv2.VideoCapture(CAM_SOURCE, cv2.CAP_DSHOW)
+         if not cap.isOpened():
+             cap = cv2.VideoCapture(CAM_SOURCE)
+     else:
+         cap = cv2.VideoCapture(CAM_SOURCE)  # URL source: let OpenCV pick the FFmpeg backend
+     if not cap.isOpened():
+         raise RuntimeError("Could not open webcam. Check CAM_SOURCE / camera permissions.")
+ 
+     cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
+     cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
+ 
+     while True:
+         ok, frame = cap.read()
+         if not ok:
+             print("Camera frame not received - check CAM_SOURCE.")
+             break
+ 
+         frame = cv2.flip(frame, 1)
+ 
+         cv2.imshow(WINDOW_NAME, frame)
+ 
+         key = cv2.waitKey(1) & 0xFF
+         if key in (ord("q"), 27):
+             break
+ 
+     cap.release()
+     cv2.destroyAllWindows()
+ 
+ 
+ if __name__ == "__main__":
+     main()
```

**Run:** `python qr_scanner.py`

A mirrored live camera window titled QR ATTENDANCE SCANNER opens. Click on it, then press Q or ESC to close it. If the window is bigger than your screen, that's fine for now — Session 4 makes it resizable.

### New in this step

- **WINDOW_NAME** — the window's title, stored once at the top so every line that needs it uses the same text.
- **def main():** — the function that holds the whole program; it runs when the last two lines call it.
- **cv2.CAP_DSHOW** — tells OpenCV to open a webcam using DirectShow, Windows' own fast camera system.
- **cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)** — asks the camera for pictures 1280 pixels wide (and the next line, 720 tall).
- **while True:** — repeat the indented lines forever, until a break stops the loop.
- **ok, frame = cap.read()** — grabs one picture: ok says whether it worked, frame is the picture itself.
- **cv2.flip(frame, 1)** — mirrors the picture left-to-right.
- **cv2.imshow(WINDOW_NAME, frame)** — shows the picture in a window with that title.
- **cv2.waitKey(1) & 0xFF** — waits 1 millisecond for a key press and gives back which key it was (or 255 if none).
- **key in (ord("q"), 27)** — true if the key was either q or ESC (whose key code is 27).
- **cap.release() / cv2.destroyAllWindows()** — lets go of the camera and closes the window when the loop ends.

### Why it matters

Everything that runs lives inside main(), and the last two lines call it only when the file is started directly — the same if __name__ == "__main__" guard as the generator. Keeping the program inside a function means the file can later be imported or tested without the camera switching on.

The camera-opening block tries cv2.CAP_DSHOW first (the fast way to open a webcam on Windows); if that fails — on macOS or Linux, for example — it tries again with OpenCV's default. A web address (the phone stream) skips straight to the else branch.

cap.set asks for 1280 × 720. It's a request, not an order: if the camera can't do it, OpenCV quietly uses the nearest size it can. Bigger pictures make small QR codes easier to read.

key in (ord("q"), 27) checks the key against two options at once: the letter q, or 27, which is the code for the ESC key. cv2.flip(frame, 1) mirrors the picture so it feels like a selfie camera.

### Common problems

- **RuntimeError: Could not open webcam. Check CAM_SOURCE / camera permissions.** — Another program has the camera — Zoom, Teams, a browser tab, or camera_check.py still running in another terminal. Close it and run again. On the phone path: re-run adb forward tcp:8080 tcp:8080 and make sure IP Webcam's server is on.
- **"Camera frame not received - check CAM_SOURCE." and the program ends** — The camera opened but stopped sending pictures. On the phone path this almost always means the phone's screen locked or IP Webcam went into the background — reopen it and tap Start server. On a laptop, another program grabbed the camera.
- **Nothing happens at all when you run it** — The last two lines are missing or misspelled — two underscores each side of __name__ and "__main__", and main() indented 4 spaces under the if.
- **IndentationError: unexpected indent / expected an indented block** — Inside main everything starts with 4 spaces; inside the while loop, 8; inside an if inside the loop, 12. Compare your indentation with the full-file panel.
- **Pressing Q or ESC does nothing** — Click on the camera window first — key presses go to whichever window is selected, usually the terminal by mistake. Session 4 adds a fix for Windows when this keeps happening.
- **(Laptop webcam) The window is black or shows the wrong camera** — Change CAM_SOURCE = 0 to CAM_SOURCE = 1 — some laptops list an infrared face-login camera first.
- **The window is bigger than the screen** — Your camera gave 1280 × 720. Drag it so you can see the middle; Session 4 makes the window resizable.
- **(Phone over USB) The picture is small or blurry** — cap.set can't change the phone's resolution — set it in IP Webcam: Video preferences → Video resolution → 1280×720, then restart the server.

---

## Step 2 — Find and read QR codes with QRCodeDetector

**Say:** Now the scanner learns to read. OpenCV has a QR code reader built in: cv2.QRCodeDetector. We make one before the loop, and then, for every frame, ask it: is there a QR code in this picture, and what does it say?

Notice where the new line goes: before the flip. We read the code from the original picture, and only then mirror it for display. A mirrored QR code is a back-to-front pattern, and older OpenCV versions can't read those at all.

For now, whenever a code is read, we just print the text in the terminal. That print line is temporary — Session 3 replaces it with real attendance logic.

**`qr_scanner.py` after this step:**

```python
  import cv2
  
  WINDOW_NAME = "QR ATTENDANCE SCANNER"
  
  CAM_SOURCE = 0
  # Laptop with a built-in webcam: leave as the device index above (0).
  # Lab PC with no webcam: set to your phone's IP Webcam stream tunneled over
  # USB via `adb forward tcp:8080 tcp:8080`, e.g.:
  #   CAM_SOURCE = "http://localhost:8080/video"
  
  
  def main():
      if isinstance(CAM_SOURCE, int):
          cap = cv2.VideoCapture(CAM_SOURCE, cv2.CAP_DSHOW)
          if not cap.isOpened():
              cap = cv2.VideoCapture(CAM_SOURCE)
      else:
          cap = cv2.VideoCapture(CAM_SOURCE)  # URL source: let OpenCV pick the FFmpeg backend
      if not cap.isOpened():
          raise RuntimeError("Could not open webcam. Check CAM_SOURCE / camera permissions.")
  
      cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
      cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
  
+     detector = cv2.QRCodeDetector()
  
      while True:
          ok, frame = cap.read()
          if not ok:
              print("Camera frame not received - check CAM_SOURCE.")
              break
  
+         # Read the QR code from the *original* (unmirrored) frame - the safest
+         # input for the detector, since older OpenCV versions can't read mirrored codes.
+         data, points, _ = detector.detectAndDecode(frame)
  
          frame = cv2.flip(frame, 1)
  
+         if data:
+             print("Scanned:", data)
  
          cv2.imshow(WINDOW_NAME, frame)
  
          key = cv2.waitKey(1) & 0xFF
          if key in (ord("q"), 27):
              break
  
      cap.release()
      cv2.destroyAllWindows()
  
  
  if __name__ == "__main__":
      main()
```

**Run:** `python qr_scanner.py`

The window looks the same as before. The real test is the next step, where you show the camera a card — the terminal will then fill with lines like Scanned: 2024-0001|Juan Dela Cruz.

### New in this step

- **cv2.QRCodeDetector()** — makes a QR code reader. We make it once, before the loop, and reuse it for every frame.
- **detector.detectAndDecode(frame)** — looks for a QR code in the picture and reads it. Gives back the text, the corner points, and a straightened image.
- **data, points, _ = ...** — unpacks the three results into three names; _ means "I don't need this one".
- **if data:** — true when data contains text; an empty text "" counts as false.
- **print("Scanned:", data)** — writes the label and the code's text in the terminal (temporary — replaced in Session 3).

### Why it matters

detectAndDecode does two jobs in one call: it finds where a QR code is in the picture, then decodes the pattern back into text. It gives back three things, which we unpack into three names:
• data — the text inside the code, or an empty text "" when there's no readable code.
• points — the four corners of the code in the picture (or None if no code was found). We use them in Step 4 to draw an outline.
• the third value is a cleaned-up, straightened picture of the code. We don't need it, and _ is Python's way of saying "ignore this one".

if data: is true only when data has some text in it — an empty text counts as false. So the print only happens when a code was actually read.

Why not pyzbar, which the syllabus mentions? OpenCV's own reader does the same job with nothing extra to install.

### Common problems

- **RuntimeError: Could not open webcam. Check CAM_SOURCE / camera permissions.** — Another program has the camera — Zoom, Teams, a browser tab, or camera_check.py still running in another terminal. Close it and run again. On the phone path: re-run adb forward tcp:8080 tcp:8080 and make sure IP Webcam's server is on.
- **AttributeError: module 'cv2' has no attribute 'QRcodeDetector' (or 'qrCodeDetector')** — Capitals matter: cv2.QRCodeDetector — Q, R, C and D are capitals. Also check detectAndDecode: lower d, capital A and D.
- **ValueError: not enough values to unpack (expected 3, got 2)** — You used detect() or decode() instead of detectAndDecode(). Only detectAndDecode gives back all three values.
- **The detect line is after the flip line** — Move it above frame = cv2.flip(frame, 1). Reading the mirrored picture fails on some OpenCV versions, and Step 4's outline maths assumes the code was found in the original picture.
- **NameError: name 'detector' is not defined** — detector = cv2.QRCodeDetector() must be inside main, above the while loop, indented 4 spaces.
- **Everything runs but nothing prints when there's no card** — Correct — nothing is printed until a code is in view. Show a card in the next step.

---

## Step 3 — First scan test: show your QR card to the camera

**Say:** Time for the first real scan. Run the scanner and hold one of your Session 1 cards up to the camera. How you do that depends on which camera you're using today — pick your setup on the right.

Watch the terminal, not the window: as soon as the code is read, it starts printing Scanned: followed by the student's ID and name. And it prints that line again on every single frame, many times a second, as long as the card stays in view. That's expected — keep it in mind, because fixing it is one of the first things we do in Session 3.

**Fork — How are you showing your card today?**

### Path A · Laptop webcam

Your laptop's webcam is the camera, so your phone is free to show the card.
1. Send yourself a card PNG from the qr_codes folder (or open it from the shared class folder) and open it on your phone.
2. Turn the phone's brightness to about half — full brightness causes glare and stripes.
3. Zoom the picture in so the QR code fills most of the screen.
4. Hold the phone flat, facing the webcam, about 20–40 cm away. Keep it still for a second.

No phone handy? Print a card, or open the PNG on a classmate's screen.

### Path B · Phone is the camera

Your phone is busy being the camera, so the card has to be shown another way. Pick one:
• PC monitor (recommended): open a card PNG from the qr_codes folder on the lab PC, zoom it to fill about half the screen, and point the phone at the monitor from 20–40 cm away. Lower the monitor's brightness if you see stripes.
• Printed card: print one card and hold the paper in front of the phone. Paper has no glare at all.
• A classmate's phone: they open your card PNG on their phone and hold it in front of your phone's camera.

**Run:** `python qr_scanner.py`

With the card in view, the terminal fills with Scanned: 2024-0001|Juan Dela Cruz, over and over. Move the card away and the lines stop. Try a second student's card — the text changes. Press Q or ESC in the window to finish.

### New in this step

- **Glare** — a bright reflection of a light on a shiny screen that hides part of what's behind it.
- **Moiré** — wavy stripes that appear when a camera films a screen, because the camera's pixels and the screen's pixels clash.
- **Quiet zone** — the white margin around a QR code. Scanners need it to find where the code starts.

### Why it matters

A QR scan needs four things at once: the whole code in the picture, sharp edges, enough contrast between black and white, and the white margin around the code visible. Most failed scans break one of these.

Holding a phone screen up to a webcam is a classic: a phone screen reflects lights (glare), and a camera filming a screen can produce rippling stripes called moiré. Tilting the screen a little and dimming its brightness fixes most of both.

On the lab PCs your phone is the camera, so it can't also show the card. Showing the card on the PC's own monitor is the easiest option: it's big, bright and flat. Printing works too, and paper never has glare.

One thing the scanner can't read: a mirror image of a code. If you take a selfie-camera photo of a card, or hold a card up to a mirror, the pattern is reversed and nothing reads. Always show the original card picture.

### Common problems

- **Nothing prints — the card is in view but never reads** — Bring it closer: the code should fill roughly a quarter to a third of the window's height. Hold it still for a second, keep it flat (not tilted away), and make sure all four corners and the white margin are in the picture.
- **Glare: a bright patch on the phone screen covers part of the code** — Tilt the phone slightly so the ceiling lights don't reflect straight into the camera, or turn your back to the window/light.
- **Moiré: wavy stripes or flicker over the code on screen** — Lower the phone's (or monitor's) brightness a few steps, move a little further back, and zoom the card picture in so the code is larger on the screen.
- **The code is too small in the picture** — Zoom the card picture in until the QR code fills most of the phone screen (or the monitor window), or move the card closer to the camera.
- **Too far away — the code is only a small square in the window** — Move closer until the code is at least about 150 pixels across in the window. On the phone-as-camera path, move the phone, not the card.
- **Too close — the window shows only part of the code, or it's blurry** — Move back until the whole card is in view and in focus. Most webcams can't focus closer than about 20 cm.
- **It never reads a photo you took of the card** — Front (selfie) cameras often save mirrored photos, and a mirrored QR code can't be read. Show the original PNG from qr_codes instead.
- **The terminal floods with Scanned: lines** — Expected for now — the scanner reads the code on every frame. Session 3 adds a cooldown so each card counts once.
- **(Phone as camera) The picture lags a second behind** — The USB stream has a small delay. Hold the card still for a moment; lowering IP Webcam's video resolution can help.

---

## Step 4 — Mirror the corner points and draw an outline around the code

**Say:** The terminal knows when a card is read, but the window doesn't show it. Let's draw a green outline around the QR code in the picture.

There's a catch. The detector found the code's corners in the original picture, but we show the mirrored picture. If we drew the corners as they are, the outline would appear on the wrong side of the screen. So right after flipping the picture, we flip the corner points too: each point's x position becomes width − 1 − x.

We draw the outline with a small function, draw_qr_outline. This is its simplest form — Session 4 adds corner dots and a name label to the same function. For now the colour is a fixed green; in Session 3 it changes with the scan result.

**`qr_scanner.py` after this step:**

```python
  import cv2
  
  WINDOW_NAME = "QR ATTENDANCE SCANNER"
  
  CAM_SOURCE = 0
  # Laptop with a built-in webcam: leave as the device index above (0).
  # Lab PC with no webcam: set to your phone's IP Webcam stream tunneled over
  # USB via `adb forward tcp:8080 tcp:8080`, e.g.:
  #   CAM_SOURCE = "http://localhost:8080/video"
  
  
+ def draw_qr_outline(img, points, color, label):
+     pts = points.reshape(-1, 2).astype(int)
+     cv2.polylines(img, [pts], True, color, 4, cv2.LINE_AA)
  
  
  def main():
      if isinstance(CAM_SOURCE, int):
          cap = cv2.VideoCapture(CAM_SOURCE, cv2.CAP_DSHOW)
          if not cap.isOpened():
              cap = cv2.VideoCapture(CAM_SOURCE)
      else:
          cap = cv2.VideoCapture(CAM_SOURCE)  # URL source: let OpenCV pick the FFmpeg backend
      if not cap.isOpened():
          raise RuntimeError("Could not open webcam. Check CAM_SOURCE / camera permissions.")
  
      cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
      cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
  
      detector = cv2.QRCodeDetector()
  
      while True:
          ok, frame = cap.read()
          if not ok:
              print("Camera frame not received - check CAM_SOURCE.")
              break
  
          # Read the QR code from the *original* (unmirrored) frame - the safest
          # input for the detector, since older OpenCV versions can't read mirrored codes.
          data, points, _ = detector.detectAndDecode(frame)
  
+         # Then mirror the picture so it feels like a selfie camera, and
+         # mirror the QR corner points to match.
          frame = cv2.flip(frame, 1)
+         if points is not None:
+             points = points.reshape(-1, 2).copy()
+             points[:, 0] = frame.shape[1] - 1 - points[:, 0]
  
          if data:
              print("Scanned:", data)
  
+         if data and points is not None:
+             draw_qr_outline(frame, points, (0, 255, 0), "")
  
          cv2.imshow(WINDOW_NAME, frame)
  
          key = cv2.waitKey(1) & 0xFF
          if key in (ord("q"), 27):
              break
  
      cap.release()
      cv2.destroyAllWindows()
  
  
  if __name__ == "__main__":
      main()
```

**Run:** `python qr_scanner.py`

Show a card: a green outline hugs the QR code in the window, and follows it as you move. The terminal still prints Scanned: lines. Move the card left — the outline moves left with it, on the correct side.

### New in this step

- **points is not None** — true when the detector found corners. None is Python's "nothing here" value.
- **points.reshape(-1, 2)** — rearranges the numbers into rows of two (x, y); -1 means "as many rows as needed".
- **.copy()** — makes a separate copy, so changing it doesn't change the original.
- **points[:, 0]** — the first column of every row — here, all the x values at once.
- **frame.shape[1]** — the picture's width in pixels (shape[0] is its height).
- **.astype(int)** — turns decimal numbers into whole numbers.
- **cv2.polylines(img, [pts], True, color, 4, cv2.LINE_AA)** — draws lines joining the points; True closes the shape, 4 is the thickness, LINE_AA makes it smooth.
- **(0, 255, 0)** — pure green — in OpenCV colours are written blue, green, red.
- **and** — both conditions must be true.

### Why it matters

points comes out of the detector as a small grid of numbers — four corners, each with an x and a y. reshape(-1, 2) arranges it as four rows of (x, y). copy() makes our own copy before we change it, so we never edit the detector's data.

points[:, 0] means "the x value of every corner". Mirroring flips the picture across its middle, so a point 100 pixels from the left edge ends up 100 pixels from the right edge: new x = width − 1 − old x. frame.shape[1] is the picture's width in pixels. The y values don't change — a mirror only swaps left and right.

In draw_qr_outline, astype(int) rounds the corners to whole pixels, because you can't draw at pixel 412.7. cv2.polylines joins the points with lines; True closes the shape back to the first corner, 4 is the line thickness and cv2.LINE_AA smooths the edges. The label input isn't used yet — Session 4 uses it to write the student's name.

if data and points is not None: only draws when the code was both found and read. Sometimes the detector finds a code-shaped thing it can't read, and we don't want to outline that.

### Common problems

- **The outline appears on the opposite side from the card** — The corner-mirroring lines are missing or come before the flip. They must come right after frame = cv2.flip(frame, 1), and the x line must be frame.shape[1] - 1 - points[:, 0].
- **The outline is mirrored vertically (upside down)** — You changed the y values. Only column 0 (x) is mirrored: points[:, 0] on both sides of the =.
- **TypeError: 'NoneType' object is not subscriptable / has no attribute 'reshape'** — The mirroring lines aren't inside if points is not None:. They must be indented 4 more spaces than that line, so they only run when corners were found.
- **cv2.error: (-215:Assertion failed) ... in function 'polylines'** — The points weren't turned into whole numbers. Check draw_qr_outline has .astype(int), and pass [pts] — a list with pts inside — not pts on its own.
- **NameError: name 'draw_qr_outline' is not defined** — The function must be defined above main, at the left edge, with two blank lines around it.
- **The outline flickers on and off** — Normal: on some frames the code is found but not read (motion blur, a bit of glare). Holding the card still helps. Session 4 shows a guide frame when nothing is detected, so the flicker reads as a deliberate state.
- **The outline is green but you expected another colour** — Session 3 makes it green, amber or red depending on whether the student is new, already scanned or unknown.

---

## Wrap-up

qr_scanner.py can now see: it opens your camera, finds a QR card in a live picture, reads its text, and outlines it in the right place on a mirrored screen. But it isn't taking attendance — it just shouts the same text many times a second. Next session we give it a memory: who's on the class list, who already checked in, and a file that records it all.
