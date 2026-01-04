import Link from "next/link";
import styles from "./page.module.css";

export default function HomePage() {
  return (
    <main className={styles.main}>
      <div className={styles.hero}>
        <h1 className={styles.title}>Passion OS</h1>
        <p className={styles.subtitle}>
          Your personal productivity and music production companion.
          <br />
          Plan, focus, and create.
        </p>

        <div className={styles.actions}>
          <Link href="/auth/signin" className={styles.primaryButton}>
            Get Started
          </Link>
          <Link href="/about" className={styles.secondaryButton}>
            Learn More
          </Link>
        </div>
      </div>

      <section className={styles.features}>
        <div className={styles.feature}>
          <div className={styles.featureIcon} aria-hidden="true">
            {/* Calendar icon */}
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <h2 className={styles.featureTitle}>Plan</h2>
          <p className={styles.featureDescription}>
            Organize your day with quests, schedules, and templates. Track your
            progress and earn XP.
          </p>
        </div>

        <div className={styles.feature}>
          <div className={styles.featureIcon} aria-hidden="true">
            {/* Focus/Target icon */}
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="6" />
              <circle cx="12" cy="12" r="2" />
            </svg>
          </div>
          <h2 className={styles.featureTitle}>Focus</h2>
          <p className={styles.featureDescription}>
            Stay in the zone with focus timers. Track your deep work sessions
            and build consistency.
          </p>
        </div>

        <div className={styles.feature}>
          <div className={styles.featureIcon} aria-hidden="true">
            {/* Music/Create icon */}
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
          </div>
          <h2 className={styles.featureTitle}>Create</h2>
          <p className={styles.featureDescription}>
            Access DAW shortcuts, templates, and tools to accelerate your music
            production workflow.
          </p>
        </div>
      </section>

      <footer className={styles.footer}>
        <p>
          <Link href="/privacy">Privacy</Link>
          {" | "}
          <Link href="/terms">Terms</Link>
          {" | "}
          <Link href="/contact">Contact</Link>
        </p>
      </footer>
    </main>
  );
}

