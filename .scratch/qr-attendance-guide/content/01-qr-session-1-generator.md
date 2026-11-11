# QR Attendance — Session 1: Generator — QR ID cards

**Track:** QR Attendance (1 of 4)  
**Syllabus mapping:** Module 7 — Reading the Card (making the QR codes the scanner will decode); Module 2 — drawing shapes and text and saving images (here with Pillow); prepares Project 1's ID/Card Scanner  
**Builds on:** QR Session 0's project folder and venv  
**Builds toward:** `source-code/qr-attendance/qr_generator.py`

> Source record for `app/qr-attendance/data/sessions/01-qr-session-1.ts` (generated alongside it — the TS file is what ships). Code blocks show the full file after each step; new lines are marked with `+` in the margin.

## Session goal

Today we write qr_generator.py: it takes the class list and makes one ID-style QR card per student, saved as pictures in a qr_codes folder. By the end, everyone has five cards they can show to the scanner we build next session.

## Instructor notes

- Code-display convention (used in every session): each step shows the entire file so far, with lines added or changed in that step marked as new.
- Step 2 ends make_card with a temporary return qr_img so Step 3 can save plain QR codes and students see output early. Step 5 replaces that one line with return card — say this out loud before Step 5.
- The if __name__ == "__main__" guard (Step 3) is load-bearing: in Session 3 the scanner imports CLASS_NAME and STUDENTS from this file, and without the guard every scanner start would regenerate the cards. Both files must sit in the same folder.
- load_font falls back to ImageFont.load_default(size=...), which needs Pillow 10.1 or newer. This only matters on machines without Arial (macOS/Linux); a fresh pip install gets a new enough Pillow.
- Step 6 ends on the finished file: it should match source-code/qr-attendance/qr_generator.py line for line (99 lines).

---

## Step 1 — Create qr_generator.py and type the class roster

**Say:** Today we build the half of the system that makes the QR cards. Every card starts from one list: who is in the class. We type that list first, because everything else — the codes, the cards, and later the scanner — reads from it.

Each student is two pieces of information kept together: their ID and their full name. We write each one as a pair in round brackets, and put all the pairs inside one list in square brackets.

> **Create a new file:** Create a new file called qr_generator.py inside your qr-attendance folder — next to the venv folder and camera_check.py, not inside venv. In VS Code: File → New File → name it qr_generator.py → save it in qr-attendance. The scanner you write in Session 2 must end up in this same folder.

**`qr_generator.py` after this step:**

```python
+ CLASS_NAME = "ITE 3"
+ 
+ STUDENTS = [
+     ("2024-0001", "Juan Dela Cruz"),
+     ("2024-0002", "Maria Santos"),
+     ("2024-0003", "Jose Rizal"),
+     ("2024-0004", "Andres Bonifacio"),
+     ("2024-0005", "Gabriela Silang"),
+ ]
```

**Run:** `python qr_generator.py`

Nothing is printed, and no error appears — the terminal just comes back. That's a pass: Python read the whole file and found no mistakes. The file doesn't do anything yet; it only describes the class.

### New in this step

- **Variable** — a name that holds a value, so you can use the name later instead of retyping the value.
- **CLASS_NAME = "ITE 3"** — stores the class name as text. Text in quotes is called a string.
- **List [ ... ]** — an ordered collection of values inside square brackets, separated by commas.
- **Tuple ( ..., ... )** — a small fixed group of values inside round brackets — here, one student's ID and name kept together as a pair.
- **CAPITAL_NAMES** — a Python habit: names in capitals are settings that the program doesn't change while it runs.

### Why it matters

CLASS_NAME and STUDENTS are written in capitals because they are settings — values that are set once at the top of the file and never changed while the program runs. Putting them at the top means anyone can edit the class list without reading the rest of the code.

This list is also what the scanner will check cards against in Session 3. The scanner doesn't keep its own copy of the class — it imports this exact list from this file. So there is only one class list to keep up to date, and both programs always agree on who is enrolled. That's also why both files must sit in the same folder.

The IDs are text in quotes ("2024-0001"), not numbers: an ID is a label, and a number would lose the dash and any leading zeros.

### Common problems

- **SyntaxError: '(' was never closed (or '[' was never closed)** — A bracket is missing. Every ( needs a ), and the list's [ needs the ] on the last line. Check each student line ends with ), — a closing round bracket and a comma.
- **SyntaxError: invalid syntax. Perhaps you forgot a comma?** — Two items are missing the comma between them — usually between the ID and the name inside a pair, or at the end of a student line.
- **SyntaxError: unterminated string literal** — A quote mark is missing. Every ID and name needs a quote at both ends: "2024-0001", not "2024-0001.
- **IndentationError: unexpected indent on CLASS_NAME or STUDENTS** — Those two lines must start at the very left edge, with no spaces before them. Only the student lines inside the list are indented.
- **python: can't open file '...qr_generator.py': [Errno 2] No such file or directory** — The terminal isn't in the qr-attendance folder, or the file was saved somewhere else (or inside venv). Run cd qr-attendance and check the file is there.
- **Want to use your own class list?** — Go ahead — replace the five example students with real IDs and names, keeping the same ("ID", "Name"), pattern. Just never use the | character inside a name; the next step uses | to join the ID and name together.

---

## Step 2 — Turn one student into a QR code

**Say:** Now the interesting part: turning a student into a QR code. A QR code is just text drawn as a square pattern of black and white blocks. So the first question is what text to put inside it.

We store the ID and the name joined by a | character — for example 2024-0001|Juan Dela Cruz. That's all the code holds. When the scanner reads it in Session 3, it splits the text back apart at the |.

We write this as a function called make_card. For now it only makes the QR image and hands it back — the last line, return qr_img, is temporary. In Step 5 we replace it once the full card is drawn.

**`qr_generator.py` after this step:**

```python
+ from pathlib import Path
+ 
+ import qrcode
+ from PIL import Image, ImageDraw, ImageFont
  
  CLASS_NAME = "ITE 3"
  
  STUDENTS = [
      ("2024-0001", "Juan Dela Cruz"),
      ("2024-0002", "Maria Santos"),
      ("2024-0003", "Jose Rizal"),
      ("2024-0004", "Andres Bonifacio"),
      ("2024-0005", "Gabriela Silang"),
  ]
  
  
+ def make_card(student_id, name):
+     # The QR code only holds "ID|Name" - the scanner splits it back apart.
+     qr = qrcode.QRCode(box_size=12, border=2, error_correction=qrcode.constants.ERROR_CORRECT_M)
+     qr.add_data(f"{student_id}|{name}")
+     qr.make(fit=True)
+     qr_img = qr.make_image(fill_color="black", back_color="white").convert("RGB")
+     qr_img = qr_img.resize((420, 420), Image.NEAREST)
+ 
+     return qr_img
```

**Run:** `python qr_generator.py`

Still nothing is printed, and still no error — the terminal comes back. We've described how to make a QR code, but nothing calls make_card yet. That's next step. If you see ModuleNotFoundError instead, see the common problems.

### New in this step

- **import qrcode** — loads the qrcode package you installed in Session 0, so this file can make QR codes.
- **from PIL import Image, ImageDraw, ImageFont** — loads three tools from Pillow: Image (a picture), ImageDraw (drawing on it) and ImageFont (text fonts). We use Image now and the other two in Steps 4 and 5.
- **from pathlib import Path** — loads Path, a tool for working with folder and file locations. Used in the next step.
- **def make_card(student_id, name):** — creates a function — a named, reusable set of steps. student_id and name are the inputs it's given each time it's used.
- **# comment** — a note for people reading the code; Python ignores everything after #.
- **qrcode.QRCode(...)** — sets up a new, empty QR code with the size and safety settings we choose.
- **box_size / border** — how many pixels wide each small square is, and how many squares of white margin go around the code.
- **Error correction** — extra repair data stored inside the code so it still reads when part of it is damaged or covered.
- **f"{student_id}|{name}"** — an f-string: text where the parts in { } are filled in with real values.
- **make_image(...).convert("RGB")** — draws the QR pattern as a picture and makes it a normal full-colour image.
- **resize((420, 420), Image.NEAREST)** — changes the picture to 420 × 420 pixels while keeping the block edges sharp.
- **return** — sends a result back out of a function to whoever used it.

### Why it matters

qrcode.QRCode(...) sets up a QR code before anything is drawn. box_size=12 makes each little square 12 pixels wide. border=2 adds a quiet white margin around the code — scanners need that empty edge to find where the code starts. error_correction=ERROR_CORRECT_M stores extra repair information, so the code can still be read if about 15% of it is scratched, creased or covered by a thumb.

add_data puts our text inside. make(fit=True) picks the smallest QR size that fits the text. make_image draws the black and white blocks, and convert("RGB") turns it into a normal colour image so we can paste it onto a coloured card later.

resize((420, 420), Image.NEAREST) makes every code exactly the same size, whatever the name length. NEAREST keeps the edges of the blocks perfectly sharp; a smoothing resize would blur them grey, which makes codes harder to read.

The f"{student_id}|{name}" is an f-string: the parts in curly brackets are replaced by the real values.

### Common problems

- **ModuleNotFoundError: No module named 'qrcode'** — The venv isn't active in this terminal, or you're running a different Python. Look for (venv) in the prompt; if it's missing, activate it (Session 0, Step 3). If it's there, run pip install opencv-python "qrcode[pil]" numpy again.
- **ModuleNotFoundError: No module named 'PIL'** — Pillow isn't installed. Run pip install "qrcode[pil]" (with the quotes) or pip install pillow.
- **IndentationError: expected an indented block after function definition** — Every line inside make_card must start with 4 spaces. VS Code usually adds them after you type the colon and press Enter — if a line starts at the left edge, press Tab.
- **AttributeError: module 'qrcode' has no attribute 'qrcode' (or 'Qrcode')** — Capital letters matter: it's qrcode.QRCode with QRC capitalised, and qrcode.constants.ERROR_CORRECT_M in capitals.
- **You named your file qrcode.py** — Never name your own file the same as a package. Python imports your file instead of the real qrcode package and nothing works. The file must be called qr_generator.py; also delete any stray qrcode.py from the folder.
- **The line with qrcode.QRCode(...) is very long and wraps on screen** — That's fine — keep it as one line in your file. Wrapping on screen doesn't change the code. Don't press Enter in the middle of it.

---

## Step 3 — Save a QR code for every student (and run it)

**Say:** Now we make the file actually do something. A main function goes through the class list one student at a time, makes their QR code, and saves it as a PNG picture in a folder called qr_codes.

The last two lines — if __name__ == "__main__": main() — look odd, but they matter a lot for this project. They mean: run main only when this file is started directly. In Session 3 the scanner will import this file just to read the class list, and these two lines stop it from making all the cards again every time the scanner starts.

**`qr_generator.py` after this step:**

```python
  from pathlib import Path
  
  import qrcode
  from PIL import Image, ImageDraw, ImageFont
  
  CLASS_NAME = "ITE 3"
  
  STUDENTS = [
      ("2024-0001", "Juan Dela Cruz"),
      ("2024-0002", "Maria Santos"),
      ("2024-0003", "Jose Rizal"),
      ("2024-0004", "Andres Bonifacio"),
      ("2024-0005", "Gabriela Silang"),
  ]
  
+ OUTPUT_DIR = Path(__file__).parent / "qr_codes"
  
  
  def make_card(student_id, name):
      # The QR code only holds "ID|Name" - the scanner splits it back apart.
      qr = qrcode.QRCode(box_size=12, border=2, error_correction=qrcode.constants.ERROR_CORRECT_M)
      qr.add_data(f"{student_id}|{name}")
      qr.make(fit=True)
      qr_img = qr.make_image(fill_color="black", back_color="white").convert("RGB")
      qr_img = qr_img.resize((420, 420), Image.NEAREST)
  
      return qr_img
  
  
+ def main():
+     OUTPUT_DIR.mkdir(exist_ok=True)
+     for student_id, name in STUDENTS:
+         card = make_card(student_id, name)
+         filename = OUTPUT_DIR / f"{student_id}_{name.replace(' ', '_')}.png"
+         card.save(filename)
+         print(f"Saved {filename.name}")
+     print(f"\nDone! {len(STUDENTS)} cards are in: {OUTPUT_DIR}")
+ 
+ 
+ if __name__ == "__main__":
+     main()
```

**Run:** `python qr_generator.py`

Five lines like Saved 2024-0001_Juan_Dela_Cruz.png, then Done! 5 cards are in: …\qr-attendance\qr_codes. Open the new qr_codes folder in VS Code's file list (or File Explorer) and click a PNG — a plain black-and-white QR code. Point your phone's camera app at it on screen: it should show the text 2024-0001|Juan Dela Cruz.

### New in this step

- **Path(__file__).parent** — the folder that this Python file is saved in.
- **/ "qr_codes"** — with Path, the / joins folder names together into a longer path.
- **OUTPUT_DIR.mkdir(exist_ok=True)** — makes the folder, and quietly does nothing if it already exists.
- **for student_id, name in STUDENTS:** — repeats the indented lines once per student, putting that student's ID and name into the two names each time.
- **name.replace(' ', '_')** — gives back a copy of the name with every space changed to an underscore.
- **card.save(filename)** — writes the picture to a file. The .png ending tells Pillow which picture format to use.
- **filename.name** — just the file's own name, without the folders in front of it.
- **len(STUDENTS)** — how many items are in the list — here, how many students.
- **\n** — inside text, means "start a new line here".
- **if __name__ == "__main__":** — true only when this file is run directly (python qr_generator.py), not when another file imports it.

### Why it matters

Path(__file__).parent is the folder this file is saved in. Adding / "qr_codes" builds the path of a qr_codes folder inside it. Using the file's own folder (instead of "wherever the terminal happens to be") means the cards always land next to qr_generator.py, even if you run it from somewhere else.

mkdir(exist_ok=True) creates the folder, and exist_ok=True means "if it's already there, that's fine" — so running the generator a second time doesn't crash; it just overwrites the cards.

The for loop unpacks each pair from STUDENTS into student_id and name, then calls make_card. Each file name is built from the ID and the name with spaces replaced by underscores — file names with spaces are awkward to type in a terminal.

The \n inside the last print starts a new line, leaving a blank line before Done!.

### Common problems

- **Nothing happens when you run it — no Saved lines** — The last two lines are missing or mistyped. It's two underscores on each side: __name__ and "__main__". And main() on the last line must be indented 4 spaces.
- **NameError: name 'main' is not defined** — The if __name__ block is above def main(). It has to be the very last thing in the file, after main is defined.
- **NameError: name 'OUTPUT_DIR' is not defined** — OUTPUT_DIR must be typed at the top level (no spaces before it), below the STUDENTS list. Check the spelling matches exactly in both places.
- **You can't find the qr_codes folder** — It's made next to qr_generator.py. In VS Code, the Explorer panel may need a refresh — click the refresh icon, or look in File Explorer in your qr-attendance folder.
- **PermissionError when saving a PNG** — That card is open in another program (an image viewer, or Paint). Close it and run again. If the folder is inside OneDrive, move the project out of it (see Session 0).
- **Your phone camera doesn't show the text when pointed at the screen** — Make the picture bigger on screen and hold the phone 20–30 cm away. Some phone camera apps only open web links; for plain text, use Google Lens or any QR reader app. This is only a quick check — the real scanner is Session 2.
- **The printed path looks like C:\Users\…\qr-attendance\qr_codes** — That's correct — it's the full location of the folder on your computer.

---

## Step 4 — Card look: size, colours, fonts and centred text

**Say:** A bare QR code works, but nobody can tell whose it is. In the next step we draw it onto an ID-style card with a header, the student's name and ID. This step gets the tools ready: the card's size and colours, a function that picks a font, and a function that writes text centred on the card.

Nothing changes when you run it yet — we're laying out the paint and brushes before we paint.

**`qr_generator.py` after this step:**

```python
  from pathlib import Path
  
  import qrcode
  from PIL import Image, ImageDraw, ImageFont
  
  CLASS_NAME = "ITE 3"
  
  STUDENTS = [
      ("2024-0001", "Juan Dela Cruz"),
      ("2024-0002", "Maria Santos"),
      ("2024-0003", "Jose Rizal"),
      ("2024-0004", "Andres Bonifacio"),
      ("2024-0005", "Gabriela Silang"),
  ]
  
  OUTPUT_DIR = Path(__file__).parent / "qr_codes"
  
+ # Card look
+ CARD_W, CARD_H = 600, 820
+ HEADER_COLOR = (24, 39, 71)      # navy
+ ACCENT_COLOR = (0, 184, 148)     # teal
+ TEXT_DARK = (30, 30, 30)
+ TEXT_MUTED = (110, 110, 110)
+ 
+ 
+ def load_font(size, bold=False):
+     """Use Arial if Windows has it, otherwise Pillow's built-in font."""
+     name = "arialbd.ttf" if bold else "arial.ttf"
+     try:
+         return ImageFont.truetype(name, size)
+     except OSError:
+         return ImageFont.load_default(size=size)
+ 
+ 
+ def draw_centered(draw, y, text, font, fill):
+     text_w = draw.textlength(text, font=font)
+     draw.text(((CARD_W - text_w) / 2, y), text, font=font, fill=fill)
  
  
  def make_card(student_id, name):
      # The QR code only holds "ID|Name" - the scanner splits it back apart.
      qr = qrcode.QRCode(box_size=12, border=2, error_correction=qrcode.constants.ERROR_CORRECT_M)
      qr.add_data(f"{student_id}|{name}")
      qr.make(fit=True)
      qr_img = qr.make_image(fill_color="black", back_color="white").convert("RGB")
      qr_img = qr_img.resize((420, 420), Image.NEAREST)
  
      return qr_img
  
  
  def main():
      OUTPUT_DIR.mkdir(exist_ok=True)
      for student_id, name in STUDENTS:
          card = make_card(student_id, name)
          filename = OUTPUT_DIR / f"{student_id}_{name.replace(' ', '_')}.png"
          card.save(filename)
          print(f"Saved {filename.name}")
      print(f"\nDone! {len(STUDENTS)} cards are in: {OUTPUT_DIR}")
  
  
  if __name__ == "__main__":
      main()
```

**Run:** `python qr_generator.py`

Same as last step: five Saved lines and Done!. The cards are still plain QR codes — the new functions aren't used until Step 5. No error means everything typed so far is valid.

### New in this step

- **CARD_W, CARD_H = 600, 820** — sets two variables in one line: the card's width and height in pixels.
- **(24, 39, 71)** — a colour written as red, green and blue amounts, each from 0 to 255.
- **bold=False** — a default value: if whoever uses load_font doesn't say bold, it's taken as False (not bold).
- **""" docstring """** — a text note right under def that explains what the function does.
- **x if condition else y** — picks x when the condition is true, otherwise y — here, the bold or normal Arial file.
- **try: / except OSError:** — try the indented lines; if they fail with that kind of error, run the except lines instead of crashing.
- **ImageFont.truetype(name, size)** — loads a font file (like arial.ttf) at a given size.
- **ImageFont.load_default(size=size)** — Pillow's own built-in font — the backup when Arial isn't available.
- **draw.textlength(text, font=font)** — measures how many pixels wide a piece of text will be in that font.
- **draw.text((x, y), text, ...)** — writes text onto the picture with its top-left corner at x, y.

### Why it matters

Colours here are (red, green, blue) amounts from 0 to 255 — (24, 39, 71) is mostly blue, a dark navy. (Remember this order: OpenCV in the scanner uses blue-green-red, which trips people up in Session 4.)

load_font tries to load Arial, which every Windows PC has. try/except is how Python says "try this, and if it fails in this specific way, do that instead": on a Mac or Linux machine without arial.ttf, ImageFont.truetype raises an OSError, and we fall back to Pillow's own built-in font at the same size. The card still works everywhere — it just looks a little plainer.

draw_centered measures how wide the text will be (textlength), then starts drawing at (card width − text width) ÷ 2, so it's centred left-to-right whatever the name's length. Every line of text on the card uses it.

### Common problems

- **TypeError: load_default() got an unexpected keyword argument 'size'** — Your Pillow is older than version 10.1 — this only shows up on machines without Arial (it runs when Arial can't be found). Update it: pip install --upgrade pillow.
- **IndentationError: unindent does not match any outer indentation level** — Lines inside try: and except OSError: need 8 spaces (two levels). Line up return under the t of try's line plus 4 more spaces. Mixing Tab and spaces can cause this too — in VS Code, retype the spaces.
- **SyntaxError on the except line** — It's except OSError: with a colon at the end, and except must line up exactly with try above it.
- **The # navy and # teal comments are in a different place on your lines** — Spaces before a comment don't matter to Python. Lining them up is just for neatness.
- **Run output is unchanged and you think it didn't work** — That's expected this step. These are tools for Step 5; nothing uses them yet.

---

## Step 5 — Draw the ID card around the QR code

**Say:** Now we paint the card: a white page, a navy header with a teal stripe, the QR code in the middle, the student's name and ID underneath, a footer, and a thin border so it looks like a card when printed.

One line you already have changes in this step: the temporary return qr_img at the end of make_card. Delete it — the function now ends with return card, so it hands back the whole finished card instead of only the QR code.

**`qr_generator.py` after this step:**

```python
  from pathlib import Path
  
  import qrcode
  from PIL import Image, ImageDraw, ImageFont
  
  CLASS_NAME = "ITE 3"
  
  STUDENTS = [
      ("2024-0001", "Juan Dela Cruz"),
      ("2024-0002", "Maria Santos"),
      ("2024-0003", "Jose Rizal"),
      ("2024-0004", "Andres Bonifacio"),
      ("2024-0005", "Gabriela Silang"),
  ]
  
  OUTPUT_DIR = Path(__file__).parent / "qr_codes"
  
  # Card look
  CARD_W, CARD_H = 600, 820
  HEADER_COLOR = (24, 39, 71)      # navy
  ACCENT_COLOR = (0, 184, 148)     # teal
  TEXT_DARK = (30, 30, 30)
  TEXT_MUTED = (110, 110, 110)
  
  
  def load_font(size, bold=False):
      """Use Arial if Windows has it, otherwise Pillow's built-in font."""
      name = "arialbd.ttf" if bold else "arial.ttf"
      try:
          return ImageFont.truetype(name, size)
      except OSError:
          return ImageFont.load_default(size=size)
  
  
  def draw_centered(draw, y, text, font, fill):
      text_w = draw.textlength(text, font=font)
      draw.text(((CARD_W - text_w) / 2, y), text, font=font, fill=fill)
  
  
  def make_card(student_id, name):
      # The QR code only holds "ID|Name" - the scanner splits it back apart.
      qr = qrcode.QRCode(box_size=12, border=2, error_correction=qrcode.constants.ERROR_CORRECT_M)
      qr.add_data(f"{student_id}|{name}")
      qr.make(fit=True)
      qr_img = qr.make_image(fill_color="black", back_color="white").convert("RGB")
      qr_img = qr_img.resize((420, 420), Image.NEAREST)
  
+     card = Image.new("RGB", (CARD_W, CARD_H), "white")
+     draw = ImageDraw.Draw(card)
+ 
+     # Header band
+     draw.rectangle([0, 0, CARD_W, 110], fill=HEADER_COLOR)
+     draw.rectangle([0, 110, CARD_W, 118], fill=ACCENT_COLOR)
+     draw_centered(draw, 22, f"{CLASS_NAME}  ATTENDANCE PASS", load_font(32, bold=True), "white")
+     draw_centered(draw, 66, "Show this code to the scanner", load_font(20), (190, 200, 220))
+ 
+     # QR code
+     card.paste(qr_img, ((CARD_W - 420) // 2, 150))
+ 
+     # Name + ID
+     draw_centered(draw, 600, name, load_font(40, bold=True), TEXT_DARK)
+     draw_centered(draw, 655, f"ID: {student_id}", load_font(26), TEXT_MUTED)
+ 
+     # Footer
+     draw.rectangle([0, CARD_H - 50, CARD_W, CARD_H], fill=HEADER_COLOR)
+     draw_centered(draw, CARD_H - 38, "Python + OpenCV QR Demo", load_font(18), (190, 200, 220))
+ 
+     # Thin border so it looks like a card when printed
+     draw.rectangle([0, 0, CARD_W - 1, CARD_H - 1], outline=(200, 200, 200), width=2)
+     return card
  
  
  def main():
      OUTPUT_DIR.mkdir(exist_ok=True)
      for student_id, name in STUDENTS:
          card = make_card(student_id, name)
          filename = OUTPUT_DIR / f"{student_id}_{name.replace(' ', '_')}.png"
          card.save(filename)
          print(f"Saved {filename.name}")
      print(f"\nDone! {len(STUDENTS)} cards are in: {OUTPUT_DIR}")
  
  
  if __name__ == "__main__":
      main()
```

**Run:** `python qr_generator.py`

Five Saved lines again — the files are overwritten with the new design. Open a PNG from qr_codes: a 600 × 820 ID card with the navy ITE 3 ATTENDANCE PASS header, the QR code, the student's name in bold and their ID. Check the phone camera still reads it.

### New in this step

- **Image.new("RGB", (CARD_W, CARD_H), "white")** — makes a new blank picture of that size, filled with white.
- **ImageDraw.Draw(card)** — gives you a drawing tool for that picture.
- **draw.rectangle([x1, y1, x2, y2], fill=...)** — draws a box from the top-left corner (x1, y1) to the bottom-right corner (x2, y2), filled with a colour.
- **outline=... width=2** — draws only the box's edge, 2 pixels thick, instead of filling it.
- **card.paste(qr_img, (x, y))** — places one picture on top of another, with its top-left corner at x, y.
- **//** — divide and keep only the whole-number part (7 // 2 is 3).
- **Pixel coordinates** — positions on a picture: x counts right from the left edge, y counts down from the top edge.

### Why it matters

Image.new makes a blank white 600 × 820 picture, and ImageDraw.Draw(card) gives us a pen that draws onto it.

draw.rectangle([left, top, right, bottom], fill=...) draws a filled box; the header is the box from the top edge down to 110 pixels, then an 8-pixel teal stripe under it. Position (0, 0) is the top-left corner, and y counts downwards — so bigger y is lower on the card.

card.paste puts the QR picture onto the card. (CARD_W - 420) // 2 is the gap that centres a 420-pixel-wide code on a 600-pixel card: 90 pixels each side. // divides and drops the decimal, because pixel positions must be whole numbers.

The footer uses CARD_H - 50 instead of 770 so it stays at the bottom even if you change the card's height. The final rectangle uses outline= instead of fill=, so it draws only a thin grey edge.

The QR code keeps a white margin around it on the card — the quiet zone from Step 2 — so the dark header never touches the code.

### Common problems

- **The cards still look like plain QR codes** — make_card still ends with return qr_img. Delete that line; the last line of the function must be return card.
- **NameError: name 'card' is not defined** — return card is above the card = Image.new(...) line, or card is misspelled. The return must be the last line inside make_card.
- **NameError: name 'draw_centered' is not defined (or 'load_font', 'HEADER_COLOR')** — Something from Step 4 is missing or spelled differently. Compare the names character by character.
- **TypeError: draw_centered() missing 1 required positional argument** — Each draw_centered call needs five things in order: draw, the y position, the text, the font, and the colour. Count the commas.
- **The text or QR code sits in the wrong place, or overlaps** — Check the numbers against the panel — y values 22, 66, 150, 600, 655 for header, subtitle, QR, name and ID. A typo like 6000 pushes text off the card.
- **PermissionError: [Errno 13] Permission denied: …png** — A card is open in an image viewer, which locks the file. Close the viewer and run again.
- **The font looks plain, not like Arial (Mac/Linux)** — Expected — Arial isn't on that computer, so load_font uses Pillow's built-in font. The card still works with the scanner.
- **The phone reads the card but the code looks blurry when zoomed in** — The resize must use Image.NEAREST (Step 2). Any other resize blurs the block edges.

---

## Step 6 — Tidy-up: a file description and a roster heading

**Say:** Last step for the generator, and it changes nothing about how it works. We add a description at the very top of the file saying what it does and how to run it, and a heading box above the class list so anyone opening the file knows that's the part to edit.

After this step, your qr_generator.py should match the finished file exactly.

**`qr_generator.py` after this step:**

```python
+ """
+ QR Attendance - Generator (classroom demo).
+ 
+ Makes one ID-style QR card per student and saves them to the `qr_codes/`
+ folder. Show a card on your phone (or print it) and hold it up to
+ `qr_scanner.py` to check in.
+ 
+ Run:
+     python qr_generator.py
+ """
  
  from pathlib import Path
  
  import qrcode
  from PIL import Image, ImageDraw, ImageFont
  
+ # ----------------------------------------------------------------------
+ # Class roster - edit this list. Format: (student ID, full name)
+ # ----------------------------------------------------------------------
  
  CLASS_NAME = "ITE 3"
  
  STUDENTS = [
      ("2024-0001", "Juan Dela Cruz"),
      ("2024-0002", "Maria Santos"),
      ("2024-0003", "Jose Rizal"),
      ("2024-0004", "Andres Bonifacio"),
      ("2024-0005", "Gabriela Silang"),
  ]
  
  OUTPUT_DIR = Path(__file__).parent / "qr_codes"
  
  # Card look
  CARD_W, CARD_H = 600, 820
  HEADER_COLOR = (24, 39, 71)      # navy
  ACCENT_COLOR = (0, 184, 148)     # teal
  TEXT_DARK = (30, 30, 30)
  TEXT_MUTED = (110, 110, 110)
  
  
  def load_font(size, bold=False):
      """Use Arial if Windows has it, otherwise Pillow's built-in font."""
      name = "arialbd.ttf" if bold else "arial.ttf"
      try:
          return ImageFont.truetype(name, size)
      except OSError:
          return ImageFont.load_default(size=size)
  
  
  def draw_centered(draw, y, text, font, fill):
      text_w = draw.textlength(text, font=font)
      draw.text(((CARD_W - text_w) / 2, y), text, font=font, fill=fill)
  
  
  def make_card(student_id, name):
      # The QR code only holds "ID|Name" - the scanner splits it back apart.
      qr = qrcode.QRCode(box_size=12, border=2, error_correction=qrcode.constants.ERROR_CORRECT_M)
      qr.add_data(f"{student_id}|{name}")
      qr.make(fit=True)
      qr_img = qr.make_image(fill_color="black", back_color="white").convert("RGB")
      qr_img = qr_img.resize((420, 420), Image.NEAREST)
  
      card = Image.new("RGB", (CARD_W, CARD_H), "white")
      draw = ImageDraw.Draw(card)
  
      # Header band
      draw.rectangle([0, 0, CARD_W, 110], fill=HEADER_COLOR)
      draw.rectangle([0, 110, CARD_W, 118], fill=ACCENT_COLOR)
      draw_centered(draw, 22, f"{CLASS_NAME}  ATTENDANCE PASS", load_font(32, bold=True), "white")
      draw_centered(draw, 66, "Show this code to the scanner", load_font(20), (190, 200, 220))
  
      # QR code
      card.paste(qr_img, ((CARD_W - 420) // 2, 150))
  
      # Name + ID
      draw_centered(draw, 600, name, load_font(40, bold=True), TEXT_DARK)
      draw_centered(draw, 655, f"ID: {student_id}", load_font(26), TEXT_MUTED)
  
      # Footer
      draw.rectangle([0, CARD_H - 50, CARD_W, CARD_H], fill=HEADER_COLOR)
      draw_centered(draw, CARD_H - 38, "Python + OpenCV QR Demo", load_font(18), (190, 200, 220))
  
      # Thin border so it looks like a card when printed
      draw.rectangle([0, 0, CARD_W - 1, CARD_H - 1], outline=(200, 200, 200), width=2)
      return card
  
  
  def main():
      OUTPUT_DIR.mkdir(exist_ok=True)
      for student_id, name in STUDENTS:
          card = make_card(student_id, name)
          filename = OUTPUT_DIR / f"{student_id}_{name.replace(' ', '_')}.png"
          card.save(filename)
          print(f"Saved {filename.name}")
      print(f"\nDone! {len(STUDENTS)} cards are in: {OUTPUT_DIR}")
  
  
  if __name__ == "__main__":
      main()
```

**Run:** `python qr_generator.py`

Exactly the same five Saved lines and the same cards as Step 5 — comments and descriptions never change what a program does. Keep the qr_codes folder; you'll show these cards to the scanner in Session 2.

### New in this step

- **Module docstring** — a description in triple quotes at the very top of a file, saying what the file does.
- **Section heading comment** — comment lines drawn as a box (# ----) to mark where a part of the file starts.

### Why it matters

A text in triple quotes at the very top of a file is the file's docstring — the first thing a person reads when they open it, and what Python's own help tools show for the module. It says what the file is for and how to run it.

The lines of # and dashes are only comments, drawn as a box so the section stands out when scrolling. Marking the roster as "edit this list" tells the next person (or you, next semester) exactly where to put a new class.

This is the habit to take away: once a program works, spend two minutes making it explain itself.

### Common problems

- **SyntaxError: unterminated triple-quoted string literal** — The description needs three double quotes at the start and three at the end, each on their own line. One is probably missing.
- **Your file isn't exactly 99 lines** — An extra or missing blank line doesn't matter to Python. Compare the code itself with the full-file panel, not the line numbers.
- **Running it again overwrote your cards** — That's normal — the generator always rewrites qr_codes from the class list. If you edit STUDENTS, run it again to update the cards.

---

## Wrap-up

qr_generator.py is finished: one class list, and one printable QR ID card per student, made by a program you can rerun whenever the class changes. Remember what's inside each code — just the text ID|Name. Next session we build the other half: a camera program that finds that QR code in a live video feed and reads the text back out.
