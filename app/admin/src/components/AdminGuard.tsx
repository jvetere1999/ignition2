/**
 * Admin Guard Component
 * Handles authentication, admin verification, and claiming flow
 */

"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { checkAdminStatus, claimAdmin, type AdminStatus } from "@/lib/api/admin";
import styles from "./AdminGuard.module.css";

interface AdminGuardProps {
  children: React.ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const { user, isLoading: authLoading, isAuthenticated, signIn } = useAuth();
  const [adminStatus, setAdminStatus] = useState<AdminStatus | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [claimKey, setClaimKey] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkStatus() {
      if (authLoading || !isAuthenticated) {
        setIsChecking(false);
        return;
      }

      try {
        const status = await checkAdminStatus();
        setAdminStatus(status);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to check admin status');
      } finally {
        setIsChecking(false);
      }
    }

    checkStatus();
  }, [authLoading, isAuthenticated]);

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimKey.trim()) {
      setError('Claim key is required');
      return;
    }

    setClaiming(true);
    setError(null);

    try {
      const result = await claimAdmin(claimKey);
      if (result.success) {
        // Refresh admin status
        const status = await checkAdminStatus();
        setAdminStatus(status);
        setClaimKey("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to claim admin');
    } finally {
      setClaiming(false);
    }
  };

  // Show loading state
  if (authLoading || isChecking) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <p>Loading...</p>
      </div>
    );
  }

  // Not authenticated - show sign in
  if (!isAuthenticated) {
    return (
      <div className={styles.guard}>
        <div className={styles.card}>
          <h1>Admin Console</h1>
          <p>Authentication required</p>
          <button onClick={signIn} className={styles.button}>
            Sign In
          </button>
        </div>
      </div>
    );
  }

  // Can claim admin (no admins exist)
  if (adminStatus?.canClaim && !adminStatus.isAdmin) {
    return (
      <div className={styles.guard}>
        <div className={styles.card}>
          <h1>Claim Admin Access</h1>
          <p>No administrators exist yet. Enter the claim key to become an admin.</p>
          <p className={styles.hint}>
            The claim key is logged in the API logs at startup.
          </p>
          
          <form onSubmit={handleClaim} className={styles.form}>
            <input
              type="text"
              value={claimKey}
              onChange={(e) => setClaimKey(e.target.value)}
              placeholder="Enter claim key"
              className={styles.input}
              disabled={claiming}
            />
            <button type="submit" disabled={claiming} className={styles.button}>
              {claiming ? 'Claiming...' : 'Claim Admin'}
            </button>
          </form>

          {error && <p className={styles.error}>{error}</p>}

          <p className={styles.user}>
            Signed in as: {user?.name || user?.email}
          </p>
        </div>
      </div>
    );
  }

  // Not an admin
  if (!adminStatus?.isAdmin) {
    return (
      <div className={styles.guard}>
        <div className={styles.card}>
          <h1>Access Denied</h1>
          <p>You do not have administrator privileges.</p>
          <p className={styles.user}>
            Signed in as: {user?.name || user?.email}
          </p>
          <a href={process.env.NEXT_PUBLIC_MAIN_APP_URL || 'https://ignition.ecent.online'} className={styles.link}>
            Return to Ignition
          </a>
        </div>
      </div>
    );
  }

  // User is admin - render children
  return <>{children}</>;
}
