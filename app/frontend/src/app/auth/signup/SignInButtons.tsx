"use client";

import { useState } from "react";
import styles from "./page.module.css";

interface SignInButtonsProps {
  isSignUp?: boolean;
}

export function SignInButtons({ isSignUp = false }: SignInButtonsProps) {
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = (provider: "google" | "azure") => {
    try {
      setError(null);
      setIsLoading(provider);
      
      // Build absolute redirect URI
      const redirectUri = `${window.location.origin}/auth/callback`;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.ecent.online";
      const endpoint = `${apiUrl}/api/auth/signin/${provider}`;
      const url = `${endpoint}?redirect_uri=${encodeURIComponent(redirectUri)}`;
      
      console.log(`[SignIn] Redirecting to ${provider}: ${url}`);
      
      // Use a small delay to ensure UI updates before navigation
      setTimeout(() => {
        window.location.href = url;
      }, 100);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(`Failed to sign in: ${message}`);
      setIsLoading(null);
      console.error(`[SignIn] Error for ${provider}:`, err);
    }
  };

  const googleProvider = "google";
  const azureProvider = "azure";

  return (
    <div className={styles.oauthButtons}>
      {error && (
        <div style={{ 
          color: "red", 
          marginBottom: "1rem", 
          padding: "0.5rem", 
          border: "1px solid red",
          borderRadius: "4px" 
        }}>
          {error}
        </div>
      )}
      <button
        onClick={() => handleSignIn(googleProvider)}
        disabled={isLoading !== null}
        className={styles.oauthButton}
        type="button"
        aria-label={isSignUp ? "Sign up with Google" : "Sign in with Google"}
      >
        {isLoading === googleProvider ? "Signing in..." : `${isSignUp ? "Sign up" : "Sign in"} with Google`}
      </button>
      <button
        onClick={() => handleSignIn(azureProvider)}
        disabled={isLoading !== null}
        className={styles.oauthButton}
        type="button"
        aria-label={isSignUp ? "Sign up with Microsoft" : "Sign in with Microsoft"}
      >
        {isLoading === azureProvider ? "Signing in..." : `${isSignUp ? "Sign up" : "Sign in"} with Microsoft`}
      </button>
    </div>
  );
}
