/**
 * Admin Configuration
 * Centralized admin email management
 */

/**
 * Get the list of admin emails from environment variable
 * Format: comma-separated list of emails
 * Example: ADMIN_EMAILS=admin@example.com,other@example.com
 */
export function getAdminEmails(): string[] {
  const envEmails = process.env.ADMIN_EMAILS || process.env.NEXT_PUBLIC_ADMIN_EMAILS;

  if (envEmails) {
    return envEmails.split(",").map((email) => email.trim().toLowerCase());
  }

  // Fallback to default admin email
  return ["jvetere1999@gmail.com"];
}

/**
 * Check if an email is an admin email
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const adminEmails = getAdminEmails();
  return adminEmails.includes(email.toLowerCase());
}

