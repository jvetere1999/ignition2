import Link from "next/link";
import styles from "./page.module.css";

export default function HomePage() {
  return (
    <main className={styles.main}>
      <div className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.badge}>Free Productivity App for Creators</div>
          <h1 className={styles.title}>
            Passion OS: Level Up Your Productivity
          </h1>
          <p className={styles.subtitle}>
            The gamified productivity app for music producers, fitness enthusiasts, and lifelong learners.
            Track focus sessions, log workouts, build habits, and earn XP as you grow.
          </p>

          <div className={styles.actions}>
            <Link href="/auth/signin" className={styles.primaryButton}>
              Get Started Free
            </Link>
            <Link href="/about" className={styles.secondaryButton}>
              See All Features
            </Link>
          </div>

          <p className={styles.trustLine}>
            No credit card required. 16+ only.
          </p>
        </div>
      </div>

      <section className={styles.features}>
        <h2 className={styles.sectionTitle}>Everything You Need to Stay Productive</h2>

        <div className={styles.featureGrid}>
          <div className={styles.feature}>
            <div className={styles.featureIcon} aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <h3 className={styles.featureTitle}>Focus Timer</h3>
            <p className={styles.featureDescription}>
              Pomodoro-style deep work sessions with 25/5/15 minute intervals.
              Track focus hours and build consistency streaks.
            </p>
          </div>

          <div className={styles.feature}>
            <div className={styles.featureIcon} aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" />
              </svg>
            </div>
            <h3 className={styles.featureTitle}>Workout Tracker</h3>
            <p className={styles.featureDescription}>
              Log exercises, track personal records, and follow training programs.
              800+ exercises with muscle targeting.
            </p>
          </div>

          <div className={styles.feature}>
            <div className={styles.featureIcon} aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
            </div>
            <h3 className={styles.featureTitle}>Book Tracker</h3>
            <p className={styles.featureDescription}>
              Track reading progress, log sessions, and build reading streaks.
              Rate books and see your yearly stats.
            </p>
          </div>

          <div className={styles.feature}>
            <div className={styles.featureIcon} aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
            </div>
            <h3 className={styles.featureTitle}>DAW Shortcuts</h3>
            <p className={styles.featureDescription}>
              Quick reference for Ableton Live, Logic Pro, FL Studio, Pro Tools,
              and more. Filter by category, search by action.
            </p>
          </div>

          <div className={styles.feature}>
            <div className={styles.featureIcon} aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
            <h3 className={styles.featureTitle}>XP and Levels</h3>
            <p className={styles.featureDescription}>
              Earn XP for focus sessions, workouts, and completed quests.
              Level up and track five skills on your progress wheel.
            </p>
          </div>

          <div className={styles.feature}>
            <div className={styles.featureIcon} aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <h3 className={styles.featureTitle}>Daily Planner</h3>
            <p className={styles.featureDescription}>
              Calendar view for scheduling events, workouts, and focus blocks.
              Set recurring tasks and never miss a session.
            </p>
          </div>
        </div>
      </section>

      <section className={styles.howItWorks}>
        <h2 className={styles.sectionTitle}>Get Started in 3 Simple Steps</h2>
        <div className={styles.steps}>
          <div className={styles.step}>
            <div className={styles.stepNumber}>1</div>
            <h3 className={styles.stepTitle}>Verify Your Age</h3>
            <p className={styles.stepDescription}>
              Passion OS is designed for users 16 and older. Quick age verification ensures a safe community.
            </p>
          </div>
          <div className={styles.stepDivider} aria-hidden="true" />
          <div className={styles.step}>
            <div className={styles.stepNumber}>2</div>
            <h3 className={styles.stepTitle}>Sign In Securely</h3>
            <p className={styles.stepDescription}>
              Use your Google or Microsoft account. No passwords to create or remember. Your data stays private.
            </p>
          </div>
          <div className={styles.stepDivider} aria-hidden="true" />
          <div className={styles.step}>
            <div className={styles.stepNumber}>3</div>
            <h3 className={styles.stepTitle}>Start Earning XP</h3>
            <p className={styles.stepDescription}>
              Complete focus sessions, log workouts, and finish quests to earn XP. Watch your level grow.
            </p>
          </div>
        </div>
      </section>

      <section className={styles.useCases}>
        <h2 className={styles.sectionTitle}>Built for Creators Who Want More</h2>
        <div className={styles.useCaseGrid}>
          <div className={styles.useCase}>
            <h3>Music Producers</h3>
            <p>Master DAW shortcuts, analyze reference tracks, and schedule focused production sessions. Track your output and level up your craft.</p>
          </div>
          <div className={styles.useCase}>
            <h3>Fitness Enthusiasts</h3>
            <p>Log every workout, track personal records, and follow structured programs. Build strength while building streaks.</p>
          </div>
          <div className={styles.useCase}>
            <h3>Lifelong Learners</h3>
            <p>Track books, take courses, review flashcards, and journal your progress. Turn knowledge into measurable growth.</p>
          </div>
        </div>
      </section>

      <section className={styles.cta}>
        <h2 className={styles.ctaTitle}>Ready to Level Up Your Life?</h2>
        <p className={styles.ctaDescription}>
          Join thousands of creators using Passion OS to build better habits, ship more work, and track their progress with XP and levels.
        </p>
        <Link href="/auth/signin" className={styles.ctaButton}>
          Create Your Free Account
        </Link>
        <p className={styles.ageNotice}>
          Must be 16 or older to use Passion OS. We respect your privacy.{" "}
          <Link href="/privacy">Read our Privacy Policy</Link>.
        </p>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerLinks}>
          <Link href="/about">Features</Link>
          <Link href="/help">Help Center</Link>
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/terms">Terms of Service</Link>
          <Link href="/contact">Contact Us</Link>
        </div>
        <p className={styles.copyright}>
          Passion OS - Free productivity app for creators. Focus, train, learn, create.
        </p>
      </footer>
    </main>
  );
}

