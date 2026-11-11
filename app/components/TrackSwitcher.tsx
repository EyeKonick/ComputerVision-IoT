import Link from "next/link";
import styles from "./TrackSwitcher.module.css";

// One shared `Hand · Face · QR` switcher, shown at the top of every track's
// chain rail. Each track keeps its own localStorage progress key, so
// switching only navigates — it never reads or writes another track's
// progress. Styling reads the design tokens (--mono, --signal-cyan, …) each
// track defines on its own `*-scope` root, so it looks native in all three.
const TRACKS = [
  { id: "hand", label: "Hand", href: "/hand-tracking", title: "Hand Tracking guide" },
  { id: "face", label: "Face", href: "/facial-recognition", title: "Facial Recognition guide" },
  { id: "qr", label: "QR", href: "/qr-attendance", title: "QR Attendance guide" },
] as const;

export type TrackId = (typeof TRACKS)[number]["id"];

export function TrackSwitcher({ current }: { current: TrackId }) {
  return (
    <nav className={styles.switcher} aria-label="Switch guide">
      {TRACKS.map((t) =>
        t.id === current ? (
          <span key={t.id} className={`${styles.item} ${styles.current}`} aria-current="page" title={t.title}>
            {t.label}
          </span>
        ) : (
          <Link key={t.id} href={t.href} className={styles.item} title={`Switch to the ${t.title}`}>
            {t.label}
          </Link>
        )
      )}
    </nav>
  );
}
