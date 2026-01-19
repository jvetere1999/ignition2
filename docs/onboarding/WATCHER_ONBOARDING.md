# DAW Watcher Onboarding Guide

The DAW Watcher is a desktop application that automatically syncs your music production files to Ecent's secure cloud storage. This guide walks you through installation, configuration, and troubleshooting.

## Table of Contents

1. [System Requirements](#system-requirements)
2. [Installation](#installation)
3. [First Launch](#first-launch)
4. [Initial Setup](#initial-setup)
5. [Selecting Folders](#selecting-folders)
6. [Monitoring & Sync](#monitoring--sync)
7. [Encryption Setup](#encryption-setup-optional)
8. [Settings & Preferences](#settings--preferences)
9. [Troubleshooting](#troubleshooting)

---

## System Requirements

### macOS
- **OS**: macOS 11.0 or later (Big Sur or newer)
- **Processor**: Intel or Apple Silicon (M1, M2, M3, etc.)
- **RAM**: 256 MB minimum (1 GB recommended)
- **Storage**: 500 MB free space
- **Network**: Internet connection required

### Windows
- **OS**: Windows 10 or later (Home, Pro, or Enterprise)
- **Processor**: x86_64 (64-bit only)
- **RAM**: 256 MB minimum (1 GB recommended)
- **Storage**: 500 MB free space
- **Network**: Internet connection required
- **Visual C++**: May require Visual C++ Redistributable 2019+

### Linux
- **OS**: Ubuntu 20.04+, Fedora 32+, Debian 11+, or equivalent
- **Processor**: x86_64
- **RAM**: 256 MB minimum (1 GB recommended)
- **Storage**: 500 MB free space
- **Network**: Internet connection required
- **Dependencies**: `libssl-dev`, `libfontconfig1` (usually pre-installed)

---

## Installation

### macOS Installation

#### Option 1: Direct Download
1. Visit [https://ecent.online/download/watcher](https://ecent.online/download/watcher)
2. Select your chip:
   - **Apple Silicon** (M1, M2, M3) → `DAW Watcher.dmg`
   - **Intel** → `DAW Watcher Intel.dmg`

3. Double-click the `.dmg` file to open it
4. Drag **DAW Watcher** to the **Applications** folder
5. Eject the disk image

#### Option 2: Homebrew (Coming Soon)
```bash
brew install ecent-daw-watcher
```

#### Launch the App
1. Open **Applications** folder
2. Find **DAW Watcher**
3. Double-click to launch
4. On first launch, macOS will ask for permission (click **Open**)

#### Troubleshooting macOS Installation
- **"Cannot open" error**: Right-click → **Open** → **Open** again
- **"Damaged" error**: Go to **Security & Privacy** settings and allow the app
- **M1/M2 detection**: System will auto-select correct version; download manually if needed

### Windows Installation

1. Visit [https://ecent.online/download/watcher](https://ecent.online/download/watcher)
2. Download **DAW Watcher.msi** (Windows x64)
3. Double-click the `.msi` file
4. Windows installer will guide you through:
   - License agreement
   - Installation location (default: `C:\Program Files\DAW Watcher`)
   - Start menu shortcuts

5. Click **Finish**
6. DAW Watcher will launch automatically

#### Troubleshooting Windows Installation
- **"Unknown publisher" warning**: Click **"Run anyway"** (unsigned but verified)
- **Antivirus blocks installation**: Add `DAW Watcher.msi` to antivirus whitelist
- **Installation fails**: Ensure Administrator privileges are enabled
- **Missing dependencies**: Install Visual C++ Redistributable from Microsoft

### Linux Installation

#### Ubuntu/Debian
```bash
wget https://ecent.online/download/watcher/linux/daw-watcher.deb
sudo apt install ./daw-watcher.deb
daw-watcher  # Launch
```

#### Fedora/RHEL
```bash
wget https://ecent.online/download/watcher/linux/daw-watcher.rpm
sudo dnf install daw-watcher.rpm
daw-watcher  # Launch
```

#### Manual Download
1. Download `daw-watcher.tar.gz` from [https://ecent.online/download/watcher](https://ecent.online/download/watcher)
2. Extract: `tar -xzf daw-watcher.tar.gz`
3. Run: `./daw-watcher/bin/daw-watcher`

---

## First Launch

### Welcome Screen

When you launch DAW Watcher for the first time, you'll see:

```
╔══════════════════════════════════════╗
║      Welcome to DAW Watcher          ║
║                                      ║
║  Sync your music productions         ║
║  to the cloud, instantly.            ║
║                                      ║
║  [Get Started →]                     ║
║                                      ║
║  Already have an account?            ║
║  [Sign In]                           │
╚══════════════════════════════════════╝
```

### Sign In or Create Account

**If you already have an Ecent account**:
1. Click **"Sign In"**
2. Enter email and password
3. Click **"Sign In"**

**If you don't have an account yet**:
1. Click **"Get Started →"**
2. Enter email and create password
3. Verify email (check inbox)
4. Return to DAW Watcher and sign in

---

## Initial Setup

### Step 1: Grant Permissions

DAW Watcher needs permission to:
- Monitor folders for file changes
- Access the internet for syncing
- Store configuration files locally

**macOS**: Grant **Finder** and **Full Disk Access** permission
```
System Settings → Privacy & Security → Full Disk Access → Add DAW Watcher
```

**Windows**: Click **"Allow"** when prompted by Windows Defender

### Step 2: Choose Your Setup

After signing in, you'll see two options:

#### Option A: Quick Setup (Recommended)
DAW Watcher will automatically detect common DAW locations:
- **macOS**: `~/Music/Logic Pro` or `~/Music/Ableton`
- **Windows**: `C:\Users\[You]\Music` or `C:\Program Files\Ableton`
- **Linux**: `~/Music` or `~/.config/Ableton`

```
Detected projects:
✓ My Album - Logic Pro
✓ Electronic Beats - Ableton Live
✓ Remixes - FL Studio

[Auto-setup with detected folders]
[Or configure manually →]
```

Click **"Auto-setup"** to add all detected folders.

#### Option B: Manual Setup
For custom folders or specific projects:
1. Click **"Configure manually"**
2. Proceed to [Selecting Folders](#selecting-folders)

### Step 3: Encryption Preference

```
Choose your privacy level:

[Standard] Encrypted at rest on servers
[Enhanced] Client-side encryption (slower)
[Skip for now]
```

- **Standard**: Recommended for most users. Ecent handles encryption.
- **Enhanced**: You control encryption key. Can't sync from web dashboard.
- **Skip**: Configure later in Settings

For now, select **"Standard"** and click **"Continue"**.

### Step 4: Confirm Setup

Review your settings:
```
┌─ Sync Configuration ─────────────────┐
│  Folders to sync: 3                  │
│  Total size: ~45 GB                  │
│  Encryption: Standard                │
│  Auto-sync: Enabled                  │
│                                      │
│  [Start Syncing] [Back]              │
└──────────────────────────────────────┘
```

Click **"Start Syncing"** to begin.

---

## Selecting Folders

### Adding Folders to Monitor

1. Click **"Settings"** (gear icon) in the top-right
2. Go to **"Watched Folders"** tab
3. Click **"Add Folder"** button
4. Browse to your folder:
   - **Ableton Live**: `~/Music/Ableton Live/Projects`
   - **Logic Pro**: `~/Music/Logic Pro/Projects`
   - **FL Studio**: `Documents/Image-Line/FL Studio/Projects`
   - **Reaper**: Custom location (find via DAW settings)
   - **Custom**: Any folder with your music files

5. Click **"Select Folder"**
6. Confirm the folder is added to the list

### Supported File Types

DAW Watcher monitors:
- **Ableton Live**: `.als` (project files)
- **Logic Pro**: `.logicx` (project bundles)
- **FL Studio**: `.flp` (project files)
- **Reaper**: `.rpp` (project files)
- **Pro Tools**: `.ptx` (project files)
- **Cubase**: `.cpr` (project files)
- **Audio Files**: `.wav`, `.mp3`, `.aiff` (samples & exports)
- **MIDI**: `.mid` (MIDI sequences)

**Note**: Only changes to tracked files trigger syncs.

### Removing Folders

1. Click **"Settings"** → **"Watched Folders"**
2. Find folder in the list
3. Click **"Remove"** (trash icon)
4. Confirm removal

**Warning**: This stops syncing that folder but doesn't delete files locally or in the cloud.

---

## Monitoring & Sync

### Sync Status Indicator

The DAW Watcher window shows real-time sync status:

```
┌─────────────────────────────────────┐
│  DAW Watcher                        │
├─────────────────────────────────────┤
│  Status: Monitoring                 │
│  ✓ Connected to Ecent               │
│                                     │
│  Recent Activity:                   │
│  └─ Synced: My Album/Piano.als      │
│     2m ago                          │
│  └─ Synced: Electronic/Drums.flp    │
│     5m ago                          │
│  └─ Synced: Remixes/Vocal.wav       │
│     12m ago                         │
│                                     │
│  [Open Dashboard] [Settings]        │
└─────────────────────────────────────┘
```

### Status Meanings

| Status | Icon | Meaning |
|--------|------|---------|
| **Monitoring** | 🟢 | Watching folders, ready to sync |
| **Syncing** | 🔵 (spinning) | Currently uploading files |
| **Paused** | ⏸️ | Syncing temporarily disabled |
| **Error** | 🔴 | Sync failed (see logs) |
| **Offline** | ⚫ | No internet connection |

### Sync Behavior

**Automatic Sync**:
- When you save a DAW project file, it syncs within 3-10 seconds
- Multiple files are batched (up to 1 MB per batch)
- Syncing happens in the background without interrupting your work

**Manual Sync**:
1. Click **"Sync Now"** button
2. Watcher immediately uploads any pending changes

**Pause/Resume**:
- Click **"Pause"** to temporarily stop syncing (e.g., during live performance)
- Click **"Resume"** to continue

---

## Encryption Setup (Optional)

### Enable Client-Side Encryption

For maximum privacy, enable end-to-end encryption (optional):

1. Click **"Settings"** → **"Security"** tab
2. Toggle **"Enable Client-Side Encryption"** ON
3. Enter a strong passphrase:
   - Minimum 12 characters
   - Mix of letters, numbers, symbols
   - Write it down somewhere safe (we can't recover it!)

4. Click **"Enable Encryption"**

### Encryption Details

```
Encryption Mode: AES-256-GCM
Passphrase: Your strong passphrase
Key Derivation: PBKDF2 (100,000 iterations)
Storage: ~/.config/daw-watcher/encrypted.json
```

**Important**:
- ⚠️ **Never forget your passphrase** - We cannot recover encrypted files
- ⚠️ **Share passphrase securely** - If you want collaborators to access encrypted files
- 🔒 **Files are encrypted before upload** - We never see unencrypted content

### Disable Encryption

1. Go to **Settings** → **"Security"**
2. Click **"Disable Encryption"**
3. Enter your passphrase to confirm
4. Files will be synced in standard (Ecent-encrypted) mode going forward

---

## Settings & Preferences

### General Settings

**Auto-Start on Login**
- Toggles DAW Watcher launching when you sign in to your computer
- Recommended: ON (for seamless syncing)

**Sync on Change**
- Automatically uploads files within 10 seconds of saving
- Recommended: ON

**Show Notifications**
- Displays desktop notifications for sync events
- Recommended: ON

### Network Settings

**Upload Speed Limit**
- Prevent DAW Watcher from consuming all bandwidth
- Default: Unlimited
- Example: Set to `5 Mbps` if syncing while streaming

**Connection Status**
- Shows your connection to Ecent servers
- Displays current upload/download speeds

### Privacy Settings

**Crash Reporting**
- Help Ecent improve by sending error logs
- Default: ON (anonymous, no personal data sent)

**Automatic Updates**
- DAW Watcher checks for updates daily
- Default: ON

### Folder Management

See [Selecting Folders](#selecting-folders) section above.

### About

View:
- DAW Watcher version
- License information
- Check for updates manually
- View system information (for support)

---

## Troubleshooting

### Not Syncing / Status is "Offline"

**Symptom**: Sync status shows offline or red icon

**Causes & Solutions**:

1. **Check internet connection**
   ```
   ping 8.8.8.8
   ```
   If fails, restart your router and try again.

2. **Check Ecent server status**
   - Visit [status.ecent.online](https://status.ecent.online)
   - If red status, Ecent is down (usually resolves in minutes)

3. **Restart DAW Watcher**
   - macOS: Click app → **Quit**
   - Windows: Right-click taskbar icon → **Close**
   - Windows: Task Manager → Kill `daw-watcher.exe`
   - Linux: `killall daw-watcher`
   - Relaunch the app

4. **Check authentication**
   - Click **"Settings"** → **"Account"**
   - Click **"Sign Out"**
   - Sign back in

5. **Firewall issue**
   - Add DAW Watcher to firewall whitelist:
     - **macOS**: System Settings → Security & Privacy → Firewall Options
     - **Windows**: Windows Defender Firewall → Allow app through firewall
   - Or temporarily disable firewall (testing only)

### Files Not Syncing Despite Being Modified

**Symptom**: You save a file but DAW Watcher doesn't sync it

**Causes & Solutions**:

1. **Check if monitoring is enabled**
   - Go to Settings → Watched Folders
   - Verify the folder containing your file is listed
   - If not, click "Add Folder" and add it

2. **Check file type is supported**
   - See [Supported File Types](#supported-file-types)
   - If file type isn't listed, DAW Watcher won't sync it

3. **Check file size limit**
   - Single files larger than 5 GB will not sync
   - Split project into smaller files if needed

4. **Check storage quota**
   - Click **"Settings"** → **"Account"** → **"Storage"**
   - If over 100 GB limit, delete old backups or files
   - Click **"Delete"** on items in cloud dashboard

5. **Restart the app**
   - Kill and relaunch DAW Watcher (see above)

### Slow Syncing

**Symptom**: Files take a long time to upload

**Causes & Solutions**:

1. **Check internet speed**
   - Run speedtest: [https://speedtest.net](https://speedtest.net)
   - Ecent requires minimum 2 Mbps upload speed
   - If slower, wait for better network or reduce other usage

2. **Check file size**
   - Large files (>500 MB) upload slowly
   - This is normal for big DAW projects with samples
   - Typical speed: 5-20 MB/sec depending on connection

3. **Reduce simultaneous sync**
   - Only save one project at a time
   - DAW Watcher queues files and syncs sequentially

4. **Check CPU usage**
   - Open Task Manager (Windows) or Activity Monitor (macOS)
   - If DAW Watcher CPU is >20%, report to support

5. **Limit upload speed**
   - Go to Settings → Network
   - Set "Upload Speed Limit" to `10 Mbps` (if you want to preserve bandwidth)

### Crashes or High CPU Usage

**Symptom**: DAW Watcher crashes repeatedly or uses excessive CPU

**Solutions**:

1. **Update to latest version**
   - Click **"Settings"** → **"About"**
   - Click **"Check for Updates"**
   - Install if available

2. **Check for conflicting apps**
   - Some antivirus or backup software can interfere
   - Temporarily disable and test
   - Add DAW Watcher to antivirus whitelist

3. **Reduce watched folder count**
   - Remove unnecessary folders from monitoring
   - More folders = more CPU usage

4. **Clear app cache**
   - macOS: `rm -rf ~/.config/daw-watcher/cache`
   - Windows: Delete `%APPDATA%\DAW Watcher\cache`
   - Linux: `rm -rf ~/.config/daw-watcher/cache`
   - Restart app

5. **Report to support**
   - Click **"Settings"** → **"About"** → **"Send Logs"**
   - Include system information
   - Email support@ecent.online

### Cannot Access Cloud Files from DAW Watcher

**Symptom**: "Cannot access cloud storage" error

**Causes & Solutions**:

1. **Check R2 connection**
   - Click **"Settings"** → **"Account"** → **"Storage"**
   - If red status, R2 storage is temporarily unavailable

2. **Check API key permissions**
   - Sign in to [https://ecent.online](https://ecent.online)
   - Go to **"Settings"** → **"Developer"** → **"API Keys"**
   - Verify API key has `write` and `read` permissions
   - If not, regenerate with full access

3. **Verify account subscription**
   - Ensure your account is active (not suspended)
   - Check that storage quota hasn't been exceeded

4. **Restart app**
   - Kill and relaunch DAW Watcher

### Password Reset Required

**Symptom**: You're signed out and need to reset password

**Steps**:

1. Click **"Forgotten Password?"** on login screen
2. Enter email address
3. Check email for reset link
4. Create new password
5. Sign back into DAW Watcher

### Lost Local Files After Folder Deletion

**Symptom**: You removed a watched folder and lost local files

**Recovery**:

1. **Check Trash/Recycle Bin** - Files may still be recoverable
   - Restore files to original location
   - DAW Watcher will re-sync them

2. **Download from Cloud**
   - Sign in to [https://ecent.online](https://ecent.online)
   - Go to **"Projects"** → Select project
   - Click **"Download"** to get file versions
   - Restore to local folder
   - DAW Watcher will resume syncing

3. **Contact Support**
   - If files were deleted >30 days ago
   - Email support@ecent.online with project name and date
   - We may be able to recover from backup

---

## Data & Storage

### View Cloud Storage Usage

1. Click **"Settings"** → **"Account"**
2. See storage breakdown:
   ```
   Storage Used: 45.3 GB / 100 GB
   ├─ My Album: 15.2 GB
   ├─ Electronic Beats: 18.5 GB
   ├─ Remixes: 11.6 GB
   ```

### Delete Files from Cloud

1. Sign in to [https://ecent.online](https://ecent.online)
2. Go to **"Projects"** → Select project
3. Click **"Files"** tab
4. Right-click file → **"Delete"**
5. Confirm deletion
6. File is removed from cloud (local copy unaffected)

### Download Project Backup

1. Go to [https://ecent.online](https://ecent.online)
2. Select project → **"Download"**
3. Choose format:
   - **Latest**: Most recent version
   - **Version history**: Download any previous version
4. Download as `.zip`

---

## Next Steps

✅ DAW Watcher installed  
✅ Logged in and authenticated  
✅ Folders selected for monitoring  
✅ Syncing is active

### What to do next?

1. **Let files sync** - Wait 5-10 minutes for initial sync to complete
2. **Open Dashboard** - Click "Open Dashboard" to view cloud files
3. **Create shared project** - Invite collaborators if desired
4. **Enable encryption** (optional) - See [Encryption Setup](#encryption-setup-optional)
5. **Set up recovery codes** - At [https://ecent.online](https://ecent.online) → Settings → Security

---

## Support

- **Email**: support@ecent.online
- **Status Page**: [status.ecent.online](https://status.ecent.online)
- **Documentation**: [https://ecent.online/docs](https://ecent.online/docs)

---

**Last Updated**: January 19, 2026  
**Estimated Read Time**: 15 minutes  
**Status**: ✅ Production Ready
