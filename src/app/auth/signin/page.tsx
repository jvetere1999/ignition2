import type { Metadata } from "next";
import Link from "next/link";
import { SignInButtons } from "./SignInButtons";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to Passion OS with Google or Microsoft account.",
};

export default function SignInPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-4)",
      }}
    >
      <div
        style={{
          maxWidth: "400px",
          width: "100%",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            fontSize: "var(--font-size-2xl)",
            fontWeight: "var(--font-weight-bold)",
            marginBottom: "var(--space-2)",
          }}
        >
          Sign In
        </h1>
        <p
          style={{
            color: "var(--color-text-secondary)",
            marginBottom: "var(--space-8)",
          }}
        >
          Sign in to access your Passion OS account.
        </p>

        <SignInButtons />

        <p
          style={{
            marginTop: "var(--space-8)",
            fontSize: "var(--font-size-sm)",
            color: "var(--color-text-muted)",
          }}
        >
          <Link href="/">Back to Home</Link>
        </p>
      </div>
    </main>
  );
}

