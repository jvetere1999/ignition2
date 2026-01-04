import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About",
  description: "Learn more about Passion OS - your productivity companion.",
};

export default function AboutPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "var(--space-8) var(--space-4)",
        maxWidth: "800px",
        margin: "0 auto",
      }}
    >
      <Link
        href="/"
        style={{
          display: "inline-block",
          marginBottom: "var(--space-8)",
          color: "var(--color-text-secondary)",
        }}
      >
        ← Back to Home
      </Link>

      <h1
        style={{
          fontSize: "var(--font-size-3xl)",
          fontWeight: "var(--font-weight-bold)",
          marginBottom: "var(--space-6)",
        }}
      >
        About Passion OS
      </h1>

      <section style={{ marginBottom: "var(--space-8)" }}>
        <h2
          style={{
            fontSize: "var(--font-size-xl)",
            fontWeight: "var(--font-weight-semibold)",
            marginBottom: "var(--space-3)",
          }}
        >
          What is Passion OS?
        </h2>
        <p
          style={{
            color: "var(--color-text-secondary)",
            lineHeight: "var(--line-height-relaxed)",
            marginBottom: "var(--space-4)",
          }}
        >
          Passion OS is your personal productivity and music production
          companion. It combines task planning, focus timers, and music
          production tools into a unified experience.
        </p>
      </section>

      <section style={{ marginBottom: "var(--space-8)" }}>
        <h2
          style={{
            fontSize: "var(--font-size-xl)",
            fontWeight: "var(--font-weight-semibold)",
            marginBottom: "var(--space-3)",
          }}
        >
          Features
        </h2>
        <ul
          style={{
            color: "var(--color-text-secondary)",
            lineHeight: "var(--line-height-relaxed)",
            paddingLeft: "var(--space-6)",
          }}
        >
          <li style={{ marginBottom: "var(--space-2)" }}>
            <strong>Planner</strong> - Organize your day with quests and
            schedules
          </li>
          <li style={{ marginBottom: "var(--space-2)" }}>
            <strong>Focus Timer</strong> - Stay productive with Pomodoro-style
            sessions
          </li>
          <li style={{ marginBottom: "var(--space-2)" }}>
            <strong>DAW Shortcuts</strong> - Quick reference for music
            production software
          </li>
          <li style={{ marginBottom: "var(--space-2)" }}>
            <strong>Templates</strong> - Melody, drum, and chord templates
          </li>
          <li style={{ marginBottom: "var(--space-2)" }}>
            <strong>Progress Tracking</strong> - Earn XP and track your streaks
          </li>
        </ul>
      </section>

      <section>
        <h2
          style={{
            fontSize: "var(--font-size-xl)",
            fontWeight: "var(--font-weight-semibold)",
            marginBottom: "var(--space-3)",
          }}
        >
          Get Started
        </h2>
        <p
          style={{
            color: "var(--color-text-secondary)",
            lineHeight: "var(--line-height-relaxed)",
          }}
        >
          <Link href="/auth/signin">Sign in</Link> with your Google or Microsoft
          account to start using Passion OS.
        </p>
      </section>
    </main>
  );
}

