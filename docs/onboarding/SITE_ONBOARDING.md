# Platform Onboarding Guide

Welcome to Ecent! This guide will walk you through setting up your account and getting started with the platform.

## Table of Contents

1. [Account Creation](#account-creation)
2. [Email Verification](#email-verification)
3. [Profile Setup](#profile-setup)
4. [Dashboard Overview](#dashboard-overview)
5. [API Access](#api-access)
6. [Settings & Preferences](#settings--preferences)
7. [Troubleshooting](#troubleshooting)

---

## Account Creation

### Getting Started

1. Visit **[https://ecent.online](https://ecent.online)**
2. Click **"Sign Up"** in the top-right corner
3. Enter your details:
   - **Email**: Your primary email address
   - **Name**: Your full name (or username)
   - **Password**: Strong password (8+ characters, mixed case, numbers, symbols)

4. Review the Terms of Service and Privacy Policy
5. Click **"Create Account"**

### Registration Confirmation

After clicking "Create Account," you'll see:
```
✓ Account created successfully!
Check your email to verify your account.
```

---

## Email Verification

### Verify Your Email Address

1. Check your email inbox for a message from **noreply@ecent.online**
2. Click the **"Verify Email"** button in the email
3. You'll be redirected to the login page

### Didn't receive an email?

- **Check spam folder** - Verify emails may be filtered
- **Resend verification** - From login page, click "Resend verification email"
- **Contact support** - If issues persist, email support@ecent.online

---

## Profile Setup

### Complete Your Profile

After logging in, you'll be prompted to complete:

#### Basic Information
- **Display Name**: How others see you (can differ from account name)
- **Avatar**: Upload a profile photo (JPEG, PNG, or GIF)
- **Bio**: Optional short description (max 256 characters)

#### Preferences
- **Time Zone**: Select your timezone (defaults to UTC)
- **Language**: Preferred interface language (currently English)
- **Notification Settings**: Email digest preferences

#### Developer Settings (Optional)
- **API Key**: Enable for programmatic access
- **Webhook URL**: For real-time event notifications

**Example Profile Setup:**
```
Display Name: Alice Chen
Bio: Music producer, electronic music enthusiast
Timezone: America/Los_Angeles
Notifications: Daily digest
API Key: Enabled
```

---

## Dashboard Overview

### Main Dashboard

Your dashboard displays:

#### Projects Section
- **Active Projects**: Projects currently being synced
- **Recent Files**: Recently modified files across all projects
- **Storage Used**: Visual indicator of R2 storage usage
- **New Project Button**: Create or link a new project

#### Quick Stats
```
┌─────────────────┬─────────────────┬─────────────────┐
│  3 Projects     │  24.5 GB Used   │  3 Devices      │
│  Last sync: 2m  │  Max: 100 GB    │  All connected  │
└─────────────────┴─────────────────┴─────────────────┘
```

#### Recent Activity
- File syncs
- Settings changes
- Device connections
- Authentication events

### Project Management

#### Viewing Projects

1. Navigate to **"Projects"** in the main menu
2. Click any project to view:
   - File listing with modification timestamps
   - Version history (last 30 versions)
   - Sync status and pending changes
   - Collaborator access levels

#### Creating a Project

1. Click **"New Project"** or **"+"** button
2. Enter project name: `My Electronic Album`
3. Select folder type:
   - **DAW Project**: Ableton Live (.als), FL Studio (.flp), Logic Pro (.logicx)
   - **Sample Library**: Audio files and samples
   - **Custom**: Any folder with custom content

4. Choose privacy level:
   - **Private**: Only you can access
   - **Shared**: Invite specific collaborators
   - **Public**: Viewable by anyone (read-only)

5. Click **"Create Project"**

---

## API Access

### Enable API Access

1. Go to **Settings** → **Developer** → **API Keys**
2. Click **"Generate New API Key"**
3. Choose scope:
   - **Read**: View projects and files
   - **Write**: Create/update projects
   - **Full Access**: Read + Write + Delete

4. Click **"Generate"**
5. **Copy and save** your API key (shown only once)

### API Key Management

```bash
# Example: List all your projects via API
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://api.ecent.online/api/projects

# Response:
{
  "projects": [
    {
      "id": "proj_abc123",
      "name": "My Electronic Album",
      "privacy": "private",
      "files": 156,
      "size_bytes": 24576000000
    }
  ]
}
```

### API Documentation

- **Full API Reference**: [API Documentation](../feature-specs/API_DOCUMENTATION.md)
- **Authentication**: Bearer token in `Authorization` header
- **Rate Limiting**: 1,000 requests/hour per API key
- **Endpoint Base URL**: `https://api.ecent.online/api`

### Regenerate API Key

If your key is compromised:
1. Go to **Settings** → **Developer** → **API Keys**
2. Click **"Regenerate"** on the key
3. Update any scripts using the old key

**Note**: The old key becomes invalid immediately.

---

## Settings & Preferences

### Account Settings

#### General
- Change display name
- Update email address (requires verification)
- Update password
- Upload profile avatar

#### Privacy & Security
- **Two-Factor Authentication**: Enable TOTP or SMS
- **Login Sessions**: View active sessions, sign out remotely
- **Recovery Codes**: Download backup codes for account recovery
- **Blocked Users**: Manage users you've blocked

#### Notifications
- **Email Digests**: Daily, weekly, or never
- **Event Types**: Control which events trigger notifications
- **Do Not Disturb**: Set quiet hours

#### Data & Privacy
- **Download Your Data**: Export all personal data as JSON
- **Delete Account**: Permanently delete your account (7-day waiting period)
- **Privacy Mode**: Opt-out of analytics (projects still sync)

### Privacy Modes

Ecent supports three privacy levels per project:

| Mode | Encryption | Sharing | Storage Location |
|------|-----------|---------|------------------|
| **Standard** | No | Shareable link | R2 (encrypted at rest) |
| **Private** | Optional client-side | Invite-only | R2 (encrypted at rest) |
| **Maximum Privacy** | Required AES-256 | Invite-only | R2 (encrypted at rest + encrypted in transit) |

---

## Troubleshooting

### Cannot Log In

**Symptom**: "Invalid email or password" error

**Solutions**:
1. Verify email is correct (case-insensitive)
2. Click **"Forgot Password"** to reset
3. Check if account is verified (check email)
4. If still stuck, contact support@ecent.online

### Email Not Received

**Symptom**: Verification or password reset email not arriving

**Solutions**:
1. Check spam/junk folder
2. Check if email is correct in account settings
3. Click "Resend Email" button
4. Wait 5 minutes and check again
5. Try different email client (web vs. app)

### Slow File Syncing

**Symptom**: Files taking long to upload/sync

**Causes & Solutions**:
- **Network speed**: Check internet connection (minimum 5 Mbps recommended)
- **File size**: Large files (>500MB) upload slowly; this is normal
- **Too many files**: Limit to 10,000 files per project
- **Storage full**: Check remaining storage space in Settings

**Monitor sync status**:
1. Go to **Projects** → Select project
2. Look for **Sync Status** indicator (green = synced, orange = syncing, red = error)

### Profile Information Not Saving

**Symptom**: Changes to profile don't persist

**Solutions**:
1. Ensure internet connection is stable
2. Clear browser cache (Ctrl+Shift+Del or Cmd+Shift+Del)
3. Try a different browser
4. Check if saving took more than 30 seconds (timeout)
5. Logout and log back in

### Lost Access to Account

**Symptom**: Can't log in and forgot password

**Solutions**:
1. Click **"Forgot Password"** on login page
2. Enter your email
3. Check email for reset link (5-minute expiry)
4. Create new password
5. Log in with new password

**If email is inaccessible**:
1. Contact support@ecent.online with:
   - Account email
   - Name associated with account
   - Last login date (if known)
2. Support will verify identity and assist with recovery

---

## Next Steps

✅ Account created and verified  
✅ Profile setup complete  
✅ Dashboard explored  
✅ Ready to create projects!

### What to do next?

1. **Create your first project** - Go to Projects → New Project
2. **Install DAW Watcher** (if you use a DAW) - [Watcher Onboarding](./WATCHER_ONBOARDING.md)
3. **Explore API** - [API Documentation](../feature-specs/API_DOCUMENTATION.md)
4. **Invite collaborators** - Share projects with team members
5. **Configure backups** - Set up automatic downloads of important projects

### Support

- **Email**: support@ecent.online
- **Documentation**: [https://ecent.online/docs](https://ecent.online/docs)
- **Status Page**: [status.ecent.online](https://status.ecent.online)

---

**Last Updated**: January 19, 2026  
**Estimated Read Time**: 10 minutes  
**Status**: ✅ Production Ready
