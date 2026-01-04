import Link from "next/link";
import styles from "./page.module.css";

export default function HomePage() {
  return (
    <main className={styles.main}>
      <div className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.badge}>Personal Productivity Suite</div>
          <h1 className={styles.title}>Passion OS</h1>
          <p className={styles.subtitle}>
            Your personal productivity and music production companion.
            Plan your day, focus deeply, track your quests, and level up your creative skills.
          </p>

          <div className={styles.actions}>
            <Link href="/auth/signin" className={styles.primaryButton}>
              Get Started
            </Link>
            <Link href="/hub" className={styles.secondaryButton}>
              Explore DAW Shortcuts
            </Link>
          </div>
        </div>
      </div>

      <section className={styles.features}>
        <div className={styles.feature}>
          <div className={styles.featureIcon} aria-hidden="true">
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
            progress and earn XP as you complete tasks.
          </p>
        </div>

        <div className={styles.feature}>
          <div className={styles.featureIcon} aria-hidden="true">
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
            Stay in the zone with Pomodoro-style focus timers. Track your deep work sessions
            and build consistency over time.
          </p>
        </div>

        <div className={styles.feature}>
          <div className={styles.featureIcon} aria-hidden="true">
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
            Access DAW shortcuts, arrangement tools, and reference track analysis to
            accelerate your music production workflow.
          </p>
        </div>
      </section>

      <section className={styles.howItWorks}>
        <h2 className={styles.sectionTitle}>How to Get Started</h2>
        <div className={styles.steps}>
          <div className={styles.step}>
            <div className={styles.stepNumber}>1</div>
            <h3 className={styles.stepTitle}>Age Verification</h3>
            <p className={styles.stepDescription}>
              Confirm you are 16 years or older to use Passion OS. We take privacy seriously.
            </p>
          </div>
          <div className={styles.stepDivider} aria-hidden="true" />
          <div className={styles.step}>
            <div className={styles.stepNumber}>2</div>
            <h3 className={styles.stepTitle}>Sign In</h3>
            <p className={styles.stepDescription}>
              Create your account using Google or Microsoft. No passwords to remember.
            </p>
          </div>
          <div className={styles.stepDivider} aria-hidden="true" />
          <div className={styles.step}>
            <div className={styles.stepNumber}>3</div>
            <h3 className={styles.stepTitle}>Get Approved</h3>
            <p className={styles.stepDescription}>
              New accounts are reviewed for approval. You will receive access shortly after signing up.
            </p>
          </div>
        </div>
      </section>

      <section className={styles.cta}>
        <h2 className={styles.ctaTitle}>Ready to level up?</h2>
        <p className={styles.ctaDescription}>
          Join Passion OS and start building better habits, shipping more music, and tracking your progress.
        </p>
        <Link href="/auth/signin" className={styles.ctaButton}>
          Start Your Journey
        </Link>
        <p className={styles.ageNotice}>
          Must be 16+ to use Passion OS. See our{" "}
          <Link href="/privacy">Privacy Policy</Link> for details.
        </p>
      </section>

      <footer className={styles.footer}>
        <p>
          <Link href="/about">About</Link>
          {" | "}
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

