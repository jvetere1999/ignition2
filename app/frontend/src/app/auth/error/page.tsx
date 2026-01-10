import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Authentication Error",
  description: "An error occurred during authentication.",
};

/**
 * Auth error page
 * Displays user-friendly error messages for auth failures
 */
export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; details?: string; provider?: string; code?: string }>;
}) {
  const params = await searchParams;
  const error = params.error;
  const details = params.details;
  const provider = params.provider;
  const code = params.code;

  // Map error codes to user-friendly messages and detailed explanations
  const errorInfo: Record<string, { message: string; explanation: string; actions: string[] }> = {
    Configuration: {
      message: "Server Configuration Error",
      explanation: "The authentication service is not properly configured. This is a server-side issue that requires administrator attention.",
      actions: [
        "OAuth provider credentials may not be set",
        "Environment variables may be missing or incorrect",
        "The authentication service may need to be restarted",
      ],
    },
    OAuthNotConfigured: {
      message: "OAuth Provider Not Configured",
      explanation: `The ${provider || "requested"} sign-in method is not available because it hasn't been configured on the server.`,
      actions: [
        "Contact the administrator to enable this sign-in method",
        "Try signing in with a different provider",
        "Check if the service is undergoing maintenance",
      ],
    },
    AccessDenied: {
      message: "Access Denied",
      explanation: "You do not have permission to sign in with this account.",
      actions: [
        "Your account may not be authorized for this application",
        "Try using a different account",
        "Contact support if you believe this is an error",
      ],
    },
    Verification: {
      message: "Verification Failed",
      explanation: "The verification link has expired or has already been used.",
      actions: [
        "Request a new verification link",
        "Check if you've already verified this action",
      ],
    },
    OAuthSignin: {
      message: "OAuth Sign-in Failed",
      explanation: "An error occurred while trying to initiate sign-in with the provider.",
      actions: [
        "The OAuth provider may be temporarily unavailable",
        "Try again in a few moments",
        "Try a different sign-in method",
      ],
    },
    OAuthCallback: {
      message: "OAuth Callback Error",
      explanation: "An error occurred while processing the authentication response from the provider.",
      actions: [
        "The authentication session may have expired",
        "Try signing in again from the beginning",
        "Clear your browser cookies and try again",
      ],
    },
    OAuthCreateAccount: {
      message: "Account Creation Failed",
      explanation: "Could not create an account using the OAuth provider.",
      actions: [
        "An account may already exist with this email",
        "Try signing in with a different method",
        "Contact support for assistance",
      ],
    },
    OAuthAccountNotLinked: {
      message: "Account Not Linked",
      explanation: "This email is already associated with another sign-in method.",
      actions: [
        "Sign in using the original method you used to create your account",
        "Contact support to link your accounts",
      ],
    },
    SessionRequired: {
      message: "Session Required",
      explanation: "You need to be signed in to access this page.",
      actions: [
        "Sign in to continue",
      ],
    },
    ServerError: {
      message: "Server Error",
      explanation: "The authentication server encountered an unexpected error.",
      actions: [
        "This is usually temporary - try again in a few moments",
        "If the problem persists, contact support",
      ],
    },
    Default: {
      message: "Authentication Error",
      explanation: "An unexpected error occurred during authentication.",
      actions: [
        "Try signing in again",
        "Clear your browser cookies and cache",
        "Contact support if the problem persists",
      ],
    },
  };

  const info = error ? errorInfo[error] || errorInfo.Default : errorInfo.Default;

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-4)",
        backgroundColor: "var(--color-background)",
      }}
    >
      <div
        style={{
          maxWidth: "500px",
          width: "100%",
          textAlign: "center",
        }}
      >
        {/* Error icon */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: "var(--space-6)",
          }}
        >
          <div
            style={{
              width: "80px",
              height: "80px",
              borderRadius: "var(--radius-full)",
              backgroundColor: "#FEE2E2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#DC2626"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
        </div>

        <h1
          style={{
            fontSize: "var(--font-size-2xl)",
            fontWeight: "var(--font-weight-bold)",
            marginBottom: "var(--space-2)",
            color: "var(--color-text-primary)",
          }}
        >
          {info.message}
        </h1>

        {provider && (
          <p
            style={{
              fontSize: "var(--font-size-sm)",
              color: "var(--color-text-tertiary)",
              marginBottom: "var(--space-4)",
            }}
          >
            Provider: {provider}
          </p>
        )}

        <p
          style={{
            color: "var(--color-text-secondary)",
            marginBottom: "var(--space-6)",
            lineHeight: "var(--line-height-relaxed)",
          }}
        >
          {info.explanation}
        </p>

        {/* What might be wrong */}
        <div
          style={{
            backgroundColor: "var(--color-surface)",
            borderRadius: "var(--radius-lg)",
            padding: "var(--space-4)",
            marginBottom: "var(--space-6)",
            textAlign: "left",
            border: "1px solid var(--color-border)",
          }}
        >
          <h2
            style={{
              fontSize: "var(--font-size-sm)",
              fontWeight: "var(--font-weight-semibold)",
              color: "var(--color-text-primary)",
              marginBottom: "var(--space-3)",
            }}
          >
            What might be happening:
          </h2>
          <ul
            style={{
              margin: 0,
              paddingLeft: "var(--space-5)",
              color: "var(--color-text-secondary)",
              fontSize: "var(--font-size-sm)",
              lineHeight: "var(--line-height-relaxed)",
            }}
          >
            {info.actions.map((action, i) => (
              <li key={i} style={{ marginBottom: "var(--space-1)" }}>
                {action}
              </li>
            ))}
          </ul>
        </div>

        {/* Technical details (collapsible) */}
        {(code || details || error) && (
          <details
            style={{
              backgroundColor: "#FEF3C7",
              borderRadius: "var(--radius-lg)",
              padding: "var(--space-4)",
              marginBottom: "var(--space-6)",
              textAlign: "left",
              border: "1px solid #F59E0B",
            }}
          >
            <summary
              style={{
                cursor: "pointer",
                fontSize: "var(--font-size-sm)",
                fontWeight: "var(--font-weight-medium)",
                color: "#92400E",
              }}
            >
              Technical Details (for support)
            </summary>
            <div
              style={{
                marginTop: "var(--space-3)",
                fontFamily: "monospace",
                fontSize: "var(--font-size-xs)",
                color: "#78350F",
                wordBreak: "break-all",
              }}
            >
              {error && <div><strong>Error Code:</strong> {error}</div>}
              {code && <div><strong>Status Code:</strong> {code}</div>}
              {provider && <div><strong>Provider:</strong> {provider}</div>}
              {details && <div><strong>Details:</strong> {decodeURIComponent(details)}</div>}
              <div><strong>Timestamp:</strong> {new Date().toISOString()}</div>
            </div>
          </details>
        )}

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-3)",
          }}
        >
          <Link
            href="/auth/signin"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "var(--space-3) var(--space-6)",
              backgroundColor: "var(--color-accent)",
              color: "white",
              fontWeight: "var(--font-weight-medium)",
              borderRadius: "var(--radius-md)",
              textDecoration: "none",
            }}
          >
            Try Again
          </Link>

          <Link
            href="/"
            style={{
              color: "var(--color-text-secondary)",
              fontSize: "var(--font-size-sm)",
            }}
          >
            Back to Home
          </Link>
        </div>

        {/* Support link */}
        <p
          style={{
            marginTop: "var(--space-8)",
            fontSize: "var(--font-size-xs)",
            color: "var(--color-text-tertiary)",
          }}
        >
          If this problem persists, please{" "}
          <a
            href="mailto:support@ecent.online"
            style={{ color: "var(--color-accent)" }}
          >
            contact support
          </a>
        </p>
      </div>
    </main>
  );
}

