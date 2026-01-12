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
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-8 bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900">
      <div className="w-full max-w-lg">
        {/* Error card container */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg dark:shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          {/* Header section with gradient */}
          <div className="bg-gradient-to-r from-red-500 to-red-600 dark:from-red-600 dark:to-red-700 px-6 py-8 sm:px-8 sm:py-10">
            <div className="flex justify-center mb-4">
              <div className="bg-white dark:bg-slate-900 rounded-full p-3 shadow-lg">
                <svg
                  width="44"
                  height="44"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-red-600 dark:text-red-400"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-white text-center mb-2">
              {info.message}
            </h1>

            {provider && (
              <p className="text-sm text-red-100 text-center">
                {provider} • Authentication Issue
              </p>
            )}
          </div>

          {/* Content section */}
          <div className="px-6 py-8 sm:px-8">
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-6 text-sm sm:text-base">
              {info.explanation}
            </p>

            {/* What might be wrong */}
            <div className="bg-blue-50 dark:bg-slate-800/50 border border-blue-200 dark:border-slate-700 rounded-lg p-4 mb-6">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-blue-600 dark:text-blue-400"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                What might be happening
              </h2>
              <ul className="space-y-2">
                {info.actions.map((action, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                    <span className="text-blue-600 dark:text-blue-400 font-bold mt-0.5">•</span>
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Technical details (collapsible) */}
            {(code || details || error) && (
              <details className="bg-amber-50 dark:bg-slate-800/30 border border-amber-200 dark:border-slate-700 rounded-lg overflow-hidden mb-6">
                <summary className="cursor-pointer px-4 py-3 flex items-center gap-2 font-medium text-sm text-amber-900 dark:text-amber-400 bg-amber-100/50 dark:bg-slate-800/50 hover:bg-amber-100 dark:hover:bg-slate-800 transition-colors">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                  Technical Details
                </summary>
                <div className="px-4 py-3 space-y-1.5 bg-slate-50 dark:bg-slate-900/50 font-mono text-xs text-slate-700 dark:text-slate-300 border-t border-amber-200 dark:border-slate-700">
                  {error && (
                    <div>
                      <span className="text-amber-700 dark:text-amber-400 font-semibold">Error Code:</span>{" "}
                      <span className="break-all">{error}</span>
                    </div>
                  )}
                  {code && (
                    <div>
                      <span className="text-amber-700 dark:text-amber-400 font-semibold">Status:</span>{" "}
                      <span>{code}</span>
                    </div>
                  )}
                  {provider && (
                    <div>
                      <span className="text-amber-700 dark:text-amber-400 font-semibold">Provider:</span>{" "}
                      <span>{provider}</span>
                    </div>
                  )}
                  {details && (
                    <div>
                      <span className="text-amber-700 dark:text-amber-400 font-semibold">Details:</span>{" "}
                      <span className="break-all">{decodeURIComponent(details)}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-amber-700 dark:text-amber-400 font-semibold">Time:</span>{" "}
                    <span>{new Date().toISOString()}</span>
                  </div>
                </div>
              </details>
            )}

            {/* Action buttons */}
            <div className="space-y-3">
              <Link
                href="/auth/signin"
                className="block text-center px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 dark:from-red-600 dark:to-red-700 dark:hover:from-red-700 dark:hover:to-red-800 text-white font-medium rounded-lg transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg"
              >
                Try Again
              </Link>

              <Link
                href="/"
                className="block text-center px-6 py-2.5 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 font-medium text-sm transition-colors"
              >
                Back to Home
              </Link>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 sm:px-8 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 text-center">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Need help?{" "}
              <a
                href="mailto:support@ecent.online"
                className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium transition-colors"
              >
                Contact support
              </a>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

