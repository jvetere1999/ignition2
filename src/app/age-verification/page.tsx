"use client";

/**
 * Age Verification Page
 * Requires users to confirm they are 16+ before proceeding
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./page.module.css";

export default function AgeVerificationPage() {
  const router = useRouter();
  const [birthDate, setBirthDate] = useState({ month: "", day: "", year: "" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - i);

  const calculateAge = (): number | null => {
    const { month, day, year } = birthDate;
    if (!month || !day || !year) return null;

    const monthIndex = months.indexOf(month);
    const birthDateObj = new Date(parseInt(year), monthIndex, parseInt(day));
    const today = new Date();

    let age = today.getFullYear() - birthDateObj.getFullYear();
    const monthDiff = today.getMonth() - birthDateObj.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDateObj.getDate())) {
      age--;
    }

    return age;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    const age = calculateAge();

    if (age === null) {
      setError("Please enter your complete date of birth.");
      setIsSubmitting(false);
      return;
    }

    if (age < 16) {
      setError("You must be at least 16 years old to use Passion OS. We take your privacy seriously and cannot allow access to users under 16.");
      setIsSubmitting(false);
      return;
    }

    // Store verification in session storage (will be sent to server during signup)
    sessionStorage.setItem("age_verified", "true");
    sessionStorage.setItem("age_verified_at", new Date().toISOString());

    // Redirect to sign in
    router.push("/auth/signin");
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.card}>
          <header className={styles.header}>
            <h1 className={styles.title}>Age Verification</h1>
            <p className={styles.subtitle}>
              Passion OS is designed for users 16 years and older. Please verify your age to continue.
            </p>
          </header>

          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.dateFields}>
              <div className={styles.field}>
                <label className={styles.label}>Month</label>
                <select
                  className={styles.select}
                  value={birthDate.month}
                  onChange={(e) => setBirthDate({ ...birthDate, month: e.target.value })}
                  required
                >
                  <option value="">Select</option>
                  {months.map((month) => (
                    <option key={month} value={month}>{month}</option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Day</label>
                <select
                  className={styles.select}
                  value={birthDate.day}
                  onChange={(e) => setBirthDate({ ...birthDate, day: e.target.value })}
                  required
                >
                  <option value="">Select</option>
                  {days.map((day) => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Year</label>
                <select
                  className={styles.select}
                  value={birthDate.year}
                  onChange={(e) => setBirthDate({ ...birthDate, year: e.target.value })}
                  required
                >
                  <option value="">Select</option>
                  {years.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </div>

            {error && (
              <div className={styles.error}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className={styles.submitButton}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Verifying..." : "Verify Age & Continue"}
            </button>
          </form>

          <div className={styles.notice}>
            <h3>Why do we ask for your age?</h3>
            <ul>
              <li>
                <strong>Legal Compliance:</strong> We are required to ensure users meet minimum age
                requirements for online services.
              </li>
              <li>
                <strong>Privacy Protection:</strong> Users under 16 have additional privacy protections
                under GDPR and similar regulations.
              </li>
              <li>
                <strong>Your Safety:</strong> We only store confirmation that you are 16+, not your
                actual birthdate.
              </li>
            </ul>
          </div>

          <footer className={styles.footer}>
            <p>
              By continuing, you agree to our{" "}
              <Link href="/terms">Terms of Service</Link> and{" "}
              <Link href="/privacy">Privacy Policy</Link>.
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}

