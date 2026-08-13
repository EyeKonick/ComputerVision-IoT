// PROTOTYPE DATA — ticket 09 mockup only
// (.scratch/hand-tracking-deploy/issues/09-prototype-troubleshooting-pages.md).
// A condensed, real subset of the full research catalog at
// .scratch/hand-tracking-deploy/research/troubleshooting-scenarios.md —
// enough real scenarios to react to, not the exhaustive set. Ticket 10
// authors the full content for every researched scenario.

export interface TroubleshootingScenario {
  slug: string;
  symptom: string;
  cause: string;
  fixNote: string;
  fixCode: string;
}

export interface TroubleshootingCategory {
  slug: "python-pip-venv" | "adb-android";
  title: string;
  tagline: string;
  scenarios: TroubleshootingScenario[];
}

export const troubleshootingCategories: TroubleshootingCategory[] = [
  {
    slug: "python-pip-venv",
    title: "Python, pip & venv problems",
    tagline:
      "Anything about installing Python, creating the venv, or getting packages installed — before a single line of hand_ar.py runs.",
    scenarios: [
      {
        slug: "mediapipe-wheel-mismatch",
        symptom: "ERROR: No matching distribution found for mediapipe==0.10.14",
        cause:
          "mediapipe 0.10.14 only ships install packages for Python 3.9–3.12. On a newer (3.13+) or older (3.8 and below) Python, there's nothing for pip to install — not a network or permissions problem.",
        fixNote: "Create the venv with a matching Python version instead of the one that's first on PATH:",
        fixCode: "py -3.11 -m venv venv        # Windows\npython3.11 -m venv venv      # macOS / Linux",
      },
      {
        slug: "powershell-execution-policy",
        symptom: "... cannot be loaded because running scripts is disabled on this system.",
        cause: "PowerShell blocks activation scripts (Activate.ps1) by default.",
        fixNote:
          "Scopes the change to just this terminal window — safer than a permanent policy change on a shared lab PC:",
        fixCode: "Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass",
      },
      {
        slug: "onedrive-venv-lock",
        symptom:
          "PermissionError: [WinError 32] The process cannot access the file because it is being used by another process",
        cause:
          "OneDrive syncs venv/'s hundreds of small files while pip is writing them, and briefly locks files mid-write.",
        fixNote: "Create the project outside any OneDrive-synced folder:",
        fixCode: "mkdir C:\\dev\\cv-iot-class\ncd C:\\dev\\cv-iot-class",
      },
      {
        slug: "pip-slow-network",
        symptom: 'WARNING: Retrying... "Read timed out."',
        cause:
          "A classroom's worth of laptops installing the same ~50 MB wheel at once can outrun pip's default read timeout — this is pip retrying, not frozen.",
        fixNote: "Give installs more time to finish:",
        fixCode: "pip install --timeout 120 opencv-python mediapipe==0.10.14 numpy",
      },
      {
        slug: "cv2-not-recognized",
        symptom: "ModuleNotFoundError: No module named 'cv2'",
        cause:
          "pip install succeeded, but the script is running under a DIFFERENT Python than the one it was installed into — almost always because the venv isn't active in this terminal, or (in VS Code specifically) the Run button uses a different interpreter than the one the terminal shows.",
        fixNote: "Check these in order — the first one that's wrong is almost always the actual cause:",
        fixCode:
          "# 1. Is the venv even active? Look for (venv) at the start of your prompt.\n#    If it's missing, activate it again (Setup Step 3).\n\n# 2. Confirm which python this terminal is actually using:\nwhere python        # Windows\nwhich python         # macOS / Linux\n# The path printed must be INSIDE your cv-iot-class\\venv\\ folder.\n\n# 3. VS Code only: the terminal can be right while the Run button still\n#    uses a different interpreter. Fix it explicitly:\n#    Ctrl+Shift+P -> \"Python: Select Interpreter\" -> pick the one\n#    inside venv/, then close and reopen VS Code's terminal.\n\n# 4. Still failing? Reinstall with the now-confirmed-correct python/pip:\npip install opencv-python mediapipe==0.10.14 numpy",
      },
    ],
  },
  {
    slug: "adb-android",
    title: "ADB & Android connection problems",
    tagline:
      "Your phone as a camera, over USB — from \"command not found\" to a working http://localhost:8080/video stream.",
    scenarios: [
      {
        slug: "adb-not-installed",
        symptom:
          "'adb' is not recognized as an internal or external command (Windows)\nbash: adb: command not found (macOS/Linux)",
        cause:
          "adb isn't a Python package — it's a separate tool (Android Platform Tools) that has to be downloaded and put on PATH by itself. \"Not found\" almost always just means it was never installed on this machine, not a broken install.",
        fixNote:
          "Install it for your OS, then open a brand-new terminal window and run adb version to confirm it worked:",
        fixCode:
          "# Windows — download the ZIP from developer.android.com/tools/releases/platform-tools,\n# extract it to C:\\platform-tools, then add that folder to PATH:\n#   Settings -> System -> About -> Advanced system settings -> Environment Variables\n#   -> under \"User variables\", select Path -> Edit -> New -> C:\\platform-tools\n\n# macOS (with Homebrew already installed)\nbrew install android-platform-tools\n\n# Linux (Debian/Ubuntu)\nsudo apt update\nsudo apt install android-tools-adb\n\n# Then, in a NEW terminal window on any OS:\nadb version",
      },
      {
        slug: "adb-bind-listener-error",
        symptom: "adb.exe: error: cannot bind listener: 'tcp:8080': Address already in use",
        cause:
          "A previous adb reverse tunnel from an earlier session is still registered, or another tool (Android Studio's emulator, scrcpy) already holds that port.",
        fixNote: "Reset adb's server, then re-open the tunnel:",
        fixCode: "adb kill-server\nadb start-server\nadb reverse tcp:8080 tcp:8080",
      },
      {
        slug: "adb-more-than-one-device",
        symptom: "adb: more than one device/emulator",
        cause: "An Android Studio emulator (or a second phone) is also visible to adb right now.",
        fixNote: "List everything adb sees, then target your phone specifically:",
        fixCode: "adb devices\nadb -s <serial> reverse tcp:8080 tcp:8080",
      },
      {
        slug: "phone-not-detected",
        symptom: "adb devices\nList of devices attached\n(nothing listed)",
        cause:
          "Windows: no OEM USB driver bound to the device yet. Linux: your user account lacks permission to access the USB device node.",
        fixNote: "Linux fix — add yourself to the right group and install udev rules:",
        fixCode: "sudo usermod -aG plugdev $LOGNAME\nsudo apt-get install android-sdk-platform-tools-common",
      },
      {
        slug: "usb-debug-not-authorized",
        symptom: "R58N90ABCDE     unauthorized",
        cause:
          'USB mode is set to "Charging only" — on many Android versions the authorization dialog only appears in File Transfer/PTP mode.',
        fixNote:
          "On the phone: pull down the USB notification, switch to File Transfer, unlock the screen, then replug. If still stuck:",
        fixCode: "adb kill-server\nadb start-server",
      },
    ],
  },
];

export function findCategory(slug: string) {
  return troubleshootingCategories.find((c) => c.slug === slug) ?? null;
}

export function findScenario(categorySlug: string, scenarioSlug: string) {
  return findCategory(categorySlug)?.scenarios.find((s) => s.slug === scenarioSlug) ?? null;
}
