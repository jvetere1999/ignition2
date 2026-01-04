"use client";

/**
 * Pending Approval Page
 * Shown to users who have signed up but not yet been approved
 */

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import styles from "./page.module.css";

export default function PendingApprovalPage() {
  const [status, setStatus] = useState<"pending" | "denied" | "approved" | "loading">("loading");
  const [denialReason, setDenialReason] = useState<string | null>(null);

  useEffect(() => {
    // Check approval status
    const checkStatus = async () => {
      try {
        const response = await fetch("/api/auth/approval-status");
        if (response.ok) {
          const data = await response.json() as { status?: "pending" | "denied" | "approved"; denialReason?: string };
          setStatus(data.status || "pending");
          if (data.denialReason) {
            setDenialReason(data.denialReason);
          }
        } else {
          setStatus("pending");
        }
      } catch {
        setStatus("pending");
      }
    };

    checkStatus();
    // Poll every 30 seconds
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/" });
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.card}>
          {status === "loading" ? (
            <div className={styles.loading}>
              <div className={styles.spinner} />
              <p>Checking your status...</p>
            </div>
          ) : status === "denied" ? (
            <>
              <div className={styles.iconDenied}>
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              </div>
              <h1 className={styles.title}>Access Denied</h1>
              <p className={styles.description}>
                We&apos;re sorry, but your access request has been denied.
              </p>
              {denialReason && (
                <div className={styles.reasonBox}>
                  <strong>Reason:</strong>
                  <p>{denialReason}</p>
                </div>
              )}
              <p className={styles.helpText}>
                If you believe this is an error, please contact us at{" "}
                <a href="mailto:support@passion-os.app">support@passion-os.app</a>
              </p>
            </>
          ) : (
            <>
              <div className={styles.iconPending}>
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <h1 className={styles.title}>Pending Approval</h1>
              <p className={styles.description}>
                Thank you for signing up for Passion OS! Your account is currently awaiting approval
                from our administrators.
              </p>
              <div className={styles.infoBox}>
                <h3>What happens next?</h3>
                <ul>
                  <li>An administrator will review your request</li>
                  <li>You&apos;ll receive an email once your account is approved</li>
                  <li>This page will automatically update when approved</li>
                </ul>
              </div>
              <p className={styles.helpText}>
                Questions? Contact us at{" "}
                <a href="mailto:support@passion-os.app">support@passion-os.app</a>
              </p>
            </>
          )}

          <div className={styles.actions}>
            <button onClick={handleSignOut} className={styles.signOutButton}>
              Sign Out
            </button>
            <Link href="/" className={styles.homeLink}>
              Return to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

