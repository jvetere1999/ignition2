# Auth and D1 Invariants

## Overview

Ignition uses Auth.js (NextAuth v5) with the D1 adapter for authentication. This document describes the auth flow, invariants that must be maintained, and troubleshooting guidance.

## Auth Providers

### Supported Providers

| Provider | Config Key | Notes |
|----------|------------|-------|
| Google | GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET | Primary provider |
| Microsoft Entra | AZURE_AD_* | Enterprise SSO |

### Provider Profile Mapping

Each provider must return:
- `id` - Provider account ID
- `email` - User's email (required)
- `name` - Display name (fallback to email prefix)
- `image` - Profile picture URL (optional)

## Invariants

### I1: No NULL Emails

**Rule:** Users table must never contain NULL email.

**Enforcement:**
1. Provider profile() returns email or throws
2. signIn callback rejects if email missing
3. events.createUser logs warning if reached without email
4. Database has NOT NULL constraint

### I2: No Orphaned Accounts

**Rule:** Every account must reference a valid user.

**Enforcement:**
1. Foreign key: accounts.userId -> users.id
2. ON DELETE CASCADE ensures cleanup
3. Admin cleanup removes orphans

### I3: No Orphaned Sessions

**Rule:** Every session must reference a valid user.

**Enforcement:**
1. Foreign key: sessions.userId -> users.id
2. ON DELETE CASCADE ensures cleanup
3. Expired sessions cleaned up periodically

### I4: Email Uniqueness

**Rule:** No two users can have the same email.

**Enforcement:**
1. UNIQUE constraint on users.email
2. Account linking by email (same email = same user)

## Auth Flow

### Sign In (New User)

```
1. User clicks "Sign in with Google"
2. OAuth redirect to Google
3. User authorizes, Google returns profile
4. Auth.js receives profile in provider callback
5. Adapter checks if account exists
6. No account -> create user first
7. D1Adapter.createUser() inserts into users table
8. Adapter creates account linked to user
9. events.createUser fires (for logging/verification)
10. signIn callback verifies email present
11. Session created, user redirected
```

### Sign In (Existing User)

```
1. User clicks "Sign in with Google"
2. OAuth redirect to Google
3. User authorizes, Google returns profile
4. Auth.js receives profile in provider callback
5. Adapter finds existing account by providerAccountId
6. Loads linked user
7. signIn callback verifies
8. Session created, user redirected
```

### Multi-Provider Linking

**Current Policy:** Merge by email

If Google and Entra return the same email:
1. First provider creates user
2. Second provider finds user by email
3. New account linked to existing user
4. User has two accounts, one user record

## Database Schema

### users

```sql
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT NOT NULL UNIQUE,
    emailVerified TEXT,
    image TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    role TEXT NOT NULL DEFAULT 'user',
    approved INTEGER NOT NULL DEFAULT 0,
    last_activity_at TEXT,
    -- ... app-specific columns
);
```

### accounts

```sql
CREATE TABLE accounts (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    type TEXT NOT NULL,
    provider TEXT NOT NULL,
    providerAccountId TEXT NOT NULL,
    refresh_token TEXT,
    access_token TEXT,
    expires_at INTEGER,
    token_type TEXT,
    scope TEXT,
    id_token TEXT,
    session_state TEXT,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX accounts_provider_providerAccountId 
ON accounts(provider, providerAccountId);
```

### sessions

```sql
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    sessionToken TEXT NOT NULL UNIQUE,
    userId TEXT NOT NULL,
    expires TEXT NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);
```

## Auth.js Callbacks

### signIn

Runs before session is created. Can reject sign-in.

```typescript
async signIn({ user, account, profile }) {
  // Reject if no email
  if (!user.email) {
    console.error("Sign-in rejected: no email");
    return false;
  }
  return true;
}
```

### session

Enriches session with user data.

```typescript
async session({ session, token }) {
  if (token?.sub) {
    session.user.id = token.sub;
  }
  return session;
}
```

### jwt

Manages JWT token contents.

```typescript
async jwt({ token, user }) {
  if (user) {
    token.sub = user.id;
  }
  return token;
}
```

## Admin Endpoints

### GET /api/admin/db-health

Checks database integrity:
- Counts users with null email/name
- Counts orphaned accounts/sessions
- Checks FK consistency

### DELETE /api/admin/cleanup-users

Cleans up invalid users:
- Removes users with null email
- Removes orphaned accounts
- Removes expired sessions

## Troubleshooting

### User Created with NULL Name

**Symptom:** User appears in DB with name = NULL

**Cause:** Provider didn't return name in profile

**Fix:**
1. Update profile() to fallback: `name: profile.name || profile.email?.split("@")[0]`
2. Run cleanup to update existing users

### "Sign-in rejected" Error

**Symptom:** User can't sign in, sees error page

**Cause:** Email missing from provider profile

**Check:**
1. Provider configuration correct
2. OAuth scopes include email
3. User has email on provider account

### Duplicate Users for Same Email

**Symptom:** Two user records with same email

**Cause:** UNIQUE constraint not enforced or race condition

**Fix:**
1. Check constraint exists: `UNIQUE(email)`
2. Merge users manually if already duplicated
3. Delete orphaned accounts

### Session Not Persisting

**Symptom:** User logged out on page refresh

**Check:**
1. Cookie settings (secure, sameSite)
2. AUTH_URL matches actual domain
3. Session not expired
4. Database connection working

## Security Considerations

### Token Handling
- Access tokens stored encrypted in accounts table
- Refresh tokens rotated on use
- Session tokens are random UUIDs

### Cookie Security
- `secure: true` in production
- `sameSite: lax` for CSRF protection
- `httpOnly: true` always

### Sensitive Data
- Never log access_token, refresh_token, id_token
- Redact in error messages
- Use structured logging with redaction

