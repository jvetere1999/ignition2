/**
 * OAuth Callback Handler
 * 
 * Receives redirect from OAuth providers (Google, Microsoft).
 * Verifies session was created and redirects to onboarding or dashboard.
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getApiBaseUrl } from "@/lib/config/environment";

const API_BASE_URL = getApiBaseUrl();

export default function CallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState("Processing...");

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Give browser time to process Set-Cookie header from OAuth redirect
        // Multiple delays to account for redirect chain
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Retry session check a few times in case cookie is delayed
        let retries = 3;
        let sessionResponse;
        
        while (retries > 0) {
          sessionResponse = await fetch(`${API_BASE_URL}/auth/session`,
            {
              method: "GET",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
            }
          );

          const data = (await sessionResponse.json()) as any;
          
          if (data.user) {
            // Session established - redirect to next step
            setStatus("Session established, redirecting...");
            // Check if user has completed onboarding
            router.push(data.user.onboarding_completed ? "/today" : "/onboarding");
            return;
          }
          
          retries--;
          if (retries > 0) {
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
        
        // After retries, still no session
        setStatus("No session found, redirecting to signin...");
        setTimeout(() => router.push("/auth/signin"), 2000);
      } catch (error) {
        console.error("Callback error:", error);
        setStatus("Error processing callback");
        setTimeout(() => router.push("/auth/signin"), 3000);
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div style={{ 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "center", 
      height: "100vh",
      flexDirection: "column",
      gap: "1rem"
    }}>
      <h1>Completing Sign In</h1>
      <p>{status}</p>
    </div>
  );
}
