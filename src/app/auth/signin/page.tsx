import type { Metadata } from "next";
import Link from "next/link";
import { SignInButtons } from "./SignInButtons";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to Passion OS with Google or Microsoft account.",
};

export default function SignInPage() {
  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <div className={styles.header}>
          <Link href="/" className={styles.logo}>
            Passion OS
          </Link>
        </div>

        <div className={styles.card}>
          <h1 className={styles.title}>Welcome Back</h1>
          <p className={styles.subtitle}>
            Sign in to access your Passion OS account.
          </p>

          <SignInButtons />

          <p className={styles.terms}>
            By signing in, you agree to our{" "}
            <Link href="/terms">Terms of Service</Link> and{" "}
            <Link href="/privacy">Privacy Policy</Link>.
          </p>
        </div>

        <p className={styles.backLink}>
          <Link href="/">Back to Home</Link>
        </p>
      </div>
    </main>
  );
}

