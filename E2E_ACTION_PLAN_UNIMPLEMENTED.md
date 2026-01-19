# E2E Action Plan — Unimplemented Features (Roadmap v1.1-v4.0)
**Created:** January 18, 2026  
**Scope:** Complete implementation plan for all unimplemented features from audit  
**Timeline:** 4-phase delivery (v1.1 → v4.0)

---

## Executive Summary

Based on the comprehensive feature audit, **13 unimplemented features** have been identified across 4 tiers:

| Tier | Items | Status | Timeline |
|------|-------|--------|----------|
| **Tier 1** | 2/5 | ⏳ High Priority | v1.0.1 (2 weeks) |
| **Tier 2** | 3/3 | 🟡 Medium | v1.1-v1.2 (4-6 weeks) |
| **Tier 3** | 5/5 | 🟠 Low | v2.0-v3.0 (8-12 weeks) |
| **Tier 4** | 4/4 | 🔴 Future | v3.0-v4.0 (12+ weeks) |

**Total Implementation Effort:** ~20 weeks (5 months)  
**MVP Status:** ✅ Ready to launch (Tier 1 & 2 can be post-launch)

---

## Tier 1: E2EE Infrastructure (High Priority)

### Unimplemented Items (2/5)

These are **security-critical** and should be implemented soon after MVP launch.

#### 1.1 Trust Boundary Labeling + Lint Enforcement

**Purpose:** Mark code modules as `server_trusted`, `client_private`, or `e2ee_boundary` to prevent security regressions.

**Specifications:**
```rust
// Example annotations in Rust
/// server_trusted
/// Business logic executed server-side; can read user data
async fn get_today(state: AppState) -> Response { ... }

/// client_private
/// Crypto operations; never touches plaintext across boundary
fn derive_key(passphrase: &str, salt: &[u8]) -> Vec<u8> { ... }

/// e2ee_boundary
/// Data flows in/out of encryption; validation required
async fn sync_poll(state: AppState) -> Response { ... }
```

**Implementation Items:**
1. Define annotation macros in backend + linter config
2. Add lint rules to `clippy` or custom CI check
3. Document trust boundaries in architecture guide
4. Create PR checklist for boundary compliance

**Acceptance Criteria:**
- [ ] All routes tagged with trust boundary
- [ ] All crypto functions tagged `client_private`
- [ ] Sync endpoints tagged `e2ee_boundary`
- [ ] CI fails if unmarked cryptographic code detected
- [ ] Documentation complete (`docs/architecture/trust-boundaries.md`)

**E2E Tests:**
```typescript
// Trust boundary test
test("Trust boundary violation detection in CI", async ({ request }) => {
  // PR with unmarked crypto function should fail CI
  // Lint enforcement should catch: "Missing trust boundary annotation"
  expect(ciResults.passed).toBe(false);
});
```

**Effort:** 2 days (design + implementation + CI integration)  
**Blocker Status:** No (can be async to MVP)  
**Risk:** Low

---

#### 1.2 E2EE Recovery Flows (Recovery Codes + Vault Reset)

**Purpose:** Enable users to recover access to encrypted vault via recovery codes or SSO re-authentication.

**Specifications:**

##### A. Recovery Code Lifecycle

```sql
-- New table
CREATE TABLE vault_recovery_codes (
  id UUID PRIMARY KEY,
  vault_id UUID NOT NULL REFERENCES vaults(id),
  code_hash VARCHAR(256) NOT NULL,  -- Scrypt-hashed
  used_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 year')
);

-- One vault can have 10 recovery codes
-- Each code is single-use
-- User must generate new codes after use
-- Codes expire after 1 year or manual revocation
```

**Flow:**
1. User requests "Generate Recovery Codes" in settings
2. Backend generates 10 random codes (e.g., `XXXX-XXXX-XXXX-XXXX`)
3. Frontend displays codes (one-time display; not stored on server)
4. User downloads/prints codes or confirms they've written them down
5. On vault recovery:
   - User enters recovery code
   - Code is Scrypt-hashed and compared
   - If match: Vault is temporarily unlocked, user must re-authenticate via SSO
   - After SSO: User can reset vault KEK or restore from backup
   - Code marked as used

**Implementation Items:**
1. Add `vault_recovery_codes` table + migration
2. Backend endpoints:
   - `POST /api/vault/recovery-codes/generate` (returns 10 codes)
   - `POST /api/vault/recovery/verify-code` (validates code)
   - `POST /api/vault/recovery/reset` (reset after SSO verification)
   - `GET /api/vault/recovery-codes/list` (admin: show used codes)
3. Frontend:
   - Settings page "Recovery Codes" section
   - Modal with code display + download/print
   - Recovery flow in login (if vault locked)
4. Tests: Recovery code generation, validation, expiry, revocation

**Acceptance Criteria:**
- [ ] 10 recovery codes generated on demand
- [ ] Codes are single-use and expire after 1 year
- [ ] Recovery flow requires SSO re-authentication
- [ ] User can list/revoke old codes
- [ ] Code generation flow tested end-to-end
- [ ] Recovery path tested (code → SSO → vault unlock)

**E2E Tests:**
```typescript
test("E2E: Generate and use recovery codes", async ({ page, request }) => {
  // 1. Login
  await login(page);
  
  // 2. Generate recovery codes
  const codesResponse = await request.post("/api/vault/recovery-codes/generate");
  const { codes } = await codesResponse.json();
  expect(codes).toHaveLength(10);
  
  // 3. Verify format
  codes.forEach(code => {
    expect(code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  });
  
  // 4. Store first code
  const recoveryCode = codes[0];
  
  // 5. Lock vault
  await request.post("/api/vault/lock");
  
  // 6. Attempt recovery with code
  const verifyResponse = await request.post("/api/vault/recovery/verify-code", {
    code: recoveryCode
  });
  expect(verifyResponse.status()).toBe(200);
  
  // 7. Verify code is marked as used
  const listResponse = await request.get("/api/vault/recovery-codes/list");
  const { codes: updatedCodes } = await listResponse.json();
  const usedCode = updatedCodes.find(c => c.code === recoveryCode);
  expect(usedCode.used_at).not.toBeNull();
});

test("E2E: Recovery code expiry", async ({ request }) => {
  // Generate codes
  const codesResponse = await request.post("/api/vault/recovery-codes/generate");
  const { codes } = await codesResponse.json();
  
  // Fast-forward time 1 year
  await mockSystemTime(now + 1 * YEAR);
  
  // Attempt to use expired code
  const verifyResponse = await request.post("/api/vault/recovery/verify-code", {
    code: codes[0]
  });
  expect(verifyResponse.status()).toBe(410); // Gone
});
```

**Effort:** 5 days (backend 2d, frontend 2d, tests 1d)  
**Blocker Status:** No (can be post-MVP, but recommended soon)  
**Risk:** Medium (crypto + recovery flows complex)

---

### Tier 1 Summary

| Item | Priority | Effort | Risk | Timeline |
|------|----------|--------|------|----------|
| Trust Boundaries | HIGH | 2d | Low | v1.0.1 (Week 1) |
| Recovery Codes | HIGH | 5d | Medium | v1.0.2 (Weeks 2-3) |

---

## Tier 2: Privacy & UX (Medium Priority)

### Unimplemented Items (3/3)

Post-MVP features; can be delivered in v1.1-v1.2 timeframe.

#### 2.1 Privacy Modes UX (Private Work vs. Standard Work)

**Purpose:** Allow users to explicitly mark content as "Private Work" (encrypted, excluded from analytics) vs. "Standard Work" (tracked, analytics-enabled).

**Specifications:**

**Private Work Indicators:**
- Ideas (all) ✓
- Infobase (all) ✓
- Journal (all) ✓
- Reference Tracks (optional per upload)
- DAW Projects (optional per project)

**Standard Work:**
- Habits, Quests, Goals, Focus, Exercise (always tracked for analytics)
- Market, Gamification (always tracked)

**UX Flow:**
1. When creating Idea, Infobase entry, or Journal entry:
   - Toggle "Mark as Private Work"
   - If enabled: Content encrypted, excluded from "Recent Activity"
2. Admin dashboard:
   - Shows count of private vs. standard content
   - Cannot inspect private content (opaque in UI)
   - Can see "5 private ideas", "12 private infobase entries"
3. Settings → Privacy:
   - "Exclude private work from analytics" (default: Yes)
   - "Show private content in search" (default: Yes)

**Implementation Items:**
1. Schema updates:
   - Add `is_private` boolean to `ideas`, `infobase_entries`, `learn_journal_entries`, `reference_tracks`, (future) `daw_projects`
   - Add index on `(user_id, is_private)` for filtering
2. Backend:
   - `/api/ideas?include_private=true/false` filter
   - `/api/infobase?include_private=true/false` filter
   - `/api/learn/journal?include_private=true/false` filter
   - Admin endpoints respect privacy flag
3. Frontend:
   - Toggle on create/edit modals
   - Filter UI to show/hide private content
   - Settings page privacy controls
4. Analytics:
   - Exclude private content from "Recent Activity"
   - Track separately: "X private entries in vault"

**Acceptance Criteria:**
- [ ] `is_private` flag persisted for all IP-bearing content
- [ ] UI toggle appears on create/edit for Ideas, Infobase, Journal
- [ ] Admin console respects privacy (shows opaque banner)
- [ ] Search results can be filtered by privacy status
- [ ] Analytics exclude private by default
- [ ] E2E flow tested (create private → verify admin can't see)

**E2E Tests:**
```typescript
test("E2E: Create private idea & verify admin cannot inspect", async ({ 
  page: userPage, 
  request: userRequest, 
  browser 
}) => {
  // 1. User logs in and creates private idea
  const userContext = await userPage.context();
  await loginAs("user@example.com", userContext);
  
  const createResponse = await userRequest.post("/api/ideas", {
    data: {
      title: "Secret production technique",
      content: "Use XYZ filter on bass",
      is_private: true
    }
  });
  const { id: ideaId } = await createResponse.json();
  expect(createResponse.ok()).toBe(true);
  
  // 2. Admin logs in and tries to view
  const adminPage = await browser.newPage();
  const adminContext = await adminPage.context();
  await loginAs("admin@example.com", adminContext);
  
  const adminRequest = adminContext.request;
  const adminViewResponse = await adminRequest.get(`/api/ideas/${ideaId}`);
  
  // 3. Admin gets 403 or opaque response
  expect([403, 200]).toContain(adminViewResponse.status());
  if (adminViewResponse.status() === 200) {
    const data = await adminViewResponse.json();
    // Content should be encrypted (opaque)
    expect(data.content).toMatch(/^[A-Za-z0-9+/]+={0,2}$/); // Base64
  }
});

test("E2E: Filter private content from analytics", async ({ request }) => {
  // Create both private and standard ideas
  await request.post("/api/ideas", {
    data: { title: "Private", is_private: true }
  });
  await request.post("/api/ideas", {
    data: { title: "Standard", is_private: false }
  });
  
  // Fetch analytics (private excluded by default)
  const analyticsResponse = await request.get("/api/analytics/ideas");
  const { count } = await analyticsResponse.json();
  
  // Should only count standard
  expect(count).toBe(1);
});
```

**Effort:** 4 days (schema 0.5d, backend 1d, frontend 1.5d, tests 1d)  
**Blocker Status:** No  
**Risk:** Low

---

#### 2.2 DAW Project File Tracking + Versioning

**Purpose:** Store DAW project files (`.als`, `.flp`, `.logicx`, etc.) with version history, client-side encryption, and resumable uploads.

**Specifications:**

**Schema:**
```sql
CREATE TABLE daw_projects (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  name VARCHAR(255) NOT NULL,  -- e.g., "Summer Banger v3"
  daw_type VARCHAR(50) NOT NULL,  -- "ableton", "fl_studio", "logic", "other"
  file_size INT NOT NULL,
  file_hash_ciphertext VARCHAR(256) NOT NULL,  -- SHA256 of encrypted file
  is_private BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE daw_project_versions (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES daw_projects(id),
  version_number INT NOT NULL,
  file_size INT NOT NULL,
  file_hash_ciphertext VARCHAR(256) NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  uploaded_by_device_id VARCHAR(255)  -- Track which device uploaded
);

-- R2 bucket: ignition-daw/
-- Key format: {user_id}/{project_id}/v{version}.encrypted
```

**Upload Flow:**
1. User selects DAW project file (`.als`, `.flp`, `.logicx`, etc.)
2. Frontend chunked upload (64KB chunks) with encryption:
   - Each chunk encrypted with current vault KEK
   - Chunk hash stored for resumability
   - Progress tracked in IndexedDB
3. Backend receives chunks:
   - Validates chunk signature
   - Stores in R2 temporary bucket
   - On completion: move to versioned bucket
   - Create version entry in DB
4. Download flow:
   - User clicks "Download v2" (prior version)
   - Backend signs R2 URL (1-hour expiry)
   - Frontend downloads, decrypts client-side

**APIs:**
```
POST /api/daw-projects                      -- Create project
POST /api/daw-projects/{id}/upload-start    -- Initiate chunked upload (returns session_id)
POST /api/daw-projects/{id}/upload-chunk    -- Upload single chunk
POST /api/daw-projects/{id}/upload-complete -- Finalize upload
GET  /api/daw-projects/{id}/versions        -- List versions
GET  /api/daw-projects/{id}/download/v{n}   -- Download specific version (signed URL)
DELETE /api/daw-projects/{id}/versions/{v}  -- Delete version (keep latest 10)
```

**Implementation Items:**
1. Schema + migrations (DAW projects + versions)
2. Backend:
   - Chunked upload handler (resumable, with session tracking)
   - R2 integration (upload, download, cleanup old versions)
   - Version history queries
3. Frontend:
   - Upload UI with progress bar + resumability
   - Version history viewer
   - Download with client-side decryption
4. E2E tests: Upload, verify version, download, decrypt

**Acceptance Criteria:**
- [ ] Chunked upload with 64KB chunks
- [ ] Resume upload if interrupted
- [ ] Versions stored in R2 with ciphertext hashes
- [ ] Client-side encryption/decryption working
- [ ] Version history queryable (limit 10 kept)
- [ ] Admin cannot view project files (opaque)
- [ ] E2E: Upload → Download → Verify file integrity

**E2E Tests:**
```typescript
test("E2E: DAW project chunked upload and version history", async ({ 
  request, 
  page 
}) => {
  // 1. Create project
  const createResponse = await request.post("/api/daw-projects", {
    data: {
      name: "Summer Song v1",
      daw_type: "ableton",
      is_private: true
    }
  });
  const { id: projectId } = await createResponse.json();
  
  // 2. Initiate upload
  const startResponse = await request.post(
    `/api/daw-projects/${projectId}/upload-start`,
    { data: { file_size: 5242880 } }  // 5 MB
  );
  const { session_id } = await startResponse.json();
  
  // 3. Upload chunks (64KB each)
  const chunk1 = Buffer.alloc(65536).fill('A');
  const chunk1Response = await request.post(
    `/api/daw-projects/${projectId}/upload-chunk`,
    {
      data: {
        session_id,
        chunk_index: 0,
        chunk_data: chunk1.toString('base64'),
        total_chunks: 80
      }
    }
  );
  expect(chunk1Response.ok()).toBe(true);
  
  // 4. Simulate interruption and resume
  // ... upload chunks 1-40 ...
  
  // 5. Complete upload
  const completeResponse = await request.post(
    `/api/daw-projects/${projectId}/upload-complete`,
    { data: { session_id } }
  );
  expect(completeResponse.ok()).toBe(true);
  
  // 6. Verify version created
  const versionsResponse = await request.get(
    `/api/daw-projects/${projectId}/versions`
  );
  const { versions } = await versionsResponse.json();
  expect(versions[0].version_number).toBe(1);
  
  // 7. Download and verify
  const downloadResponse = await request.get(
    `/api/daw-projects/${projectId}/download/v1`
  );
  expect(downloadResponse.ok()).toBe(true);
  
  // 8. Verify file integrity
  const downloadedFile = await downloadResponse.arrayBuffer();
  // Decrypt on client and verify hash
  const decrypted = await vault.decrypt(downloadedFile);
  expect(hash(decrypted)).toBe(expectedHash);
});

test("E2E: DAW project version retention (keep 10, delete older)", async ({ 
  request 
}) => {
  const projectId = "...";
  
  // Upload 15 versions
  for (let i = 0; i < 15; i++) {
    // ... upload version i ...
  }
  
  // Query versions
  const versionsResponse = await request.get(
    `/api/daw-projects/${projectId}/versions`
  );
  const { versions } = await versionsResponse.json();
  
  // Should only have 10 (v6-v15)
  expect(versions).toHaveLength(10);
  expect(versions[0].version_number).toBe(6);
  expect(versions[9].version_number).toBe(15);
});
```

**Effort:** 8 days (backend 3d, R2 integration 1.5d, frontend 2d, tests 1.5d)  
**Blocker Status:** No  
**Risk:** Medium (chunked upload + R2 integration complex)

---

#### 2.3 Observability Red Lines + CI Log Scanning

**Purpose:** Prevent logging of sensitive data (ciphertext, PII, credentials) in production logs.

**Specifications:**

**Forbidden Fields (CI Check):**
```yaml
# .github/workflows/lint-logs.yml
forbidden_patterns:
  - pattern: "cipher|ciphertext|plaintext|passphrase"
    severity: "error"
  - pattern: "\\$password|\\$secret|\\$key"
    severity: "error"
  - pattern: "Authorization.*Bearer"
    severity: "warn"
  - pattern: "\\[a-zA-Z0-9]{256,}"  # Likely ciphertext
    severity: "error"
  - pattern: "user_id.*password|password.*user_id"
    severity: "error"

log_size_limits:
  - field_name: "request_body"
    max_size_kb: 100
  - field_name: "response_body"
    max_size_kb: 100
  - field_name: "error_message"
    max_size_kb: 50
```

**Implementation Items:**
1. Create log scanning tool (Go or Rust)
   - Regex + pattern matching
   - Scans all `*.rs` (backend) files for logging calls
   - Whitelist safe patterns (e.g., `info!("User {}", user_id)` is OK)
2. Integrate into CI/CD (.github/workflows/lint-logs.yml)
   - Fail PR if forbidden patterns found
   - Provide suggestions for safe logging
3. Create logging guidelines doc
   - Safe: `info!("Idea created: {}", idea_id)`
   - Unsafe: `info!("Idea: {}", idea.content)`
   - Unsafe: `error!("Decryption failed: {}", ciphertext)`
4. Retrofit existing code (audit + fix)

**Backend Implementation Example:**
```rust
// ✅ SAFE
info!("User {} created idea {}", user_id, idea_id);

// ❌ UNSAFE (ciphertext logged)
error!("Decryption error: {}", ciphertext);

// ✅ SAFE (with sanitization)
let ciphertext_hash = hash(&ciphertext);
error!("Decryption error for hash: {}", ciphertext_hash);

// ❌ UNSAFE (size indicates sensitive data)
debug!("Response: {} bytes", response_body.len());
if response_body.len() > 1_000_000 {
    return Err("Response too large".into());
}
```

**Acceptance Criteria:**
- [ ] Log scanning tool implemented
- [ ] CI/CD integration (GitHub Actions)
- [ ] All existing logs retrofitted for safety
- [ ] Logging guidelines doc written
- [ ] PR checklist includes: "No forbidden log patterns"
- [ ] Test: PR with `info!("ciphertext: {}", ct)` fails CI

**E2E Tests:**
```typescript
test("E2E: Log scanning detects forbidden patterns", async ({ request }) => {
  // Simulate code with forbidden pattern
  const prCode = `
    error!("E2EE key: {}", vault_kek);  // FORBIDDEN
  `;
  
  // Run log scanner
  const scanResult = await scanCodeForForbiddenPatterns(prCode);
  
  // Should fail with helpful message
  expect(scanResult.passed).toBe(false);
  expect(scanResult.violations).toContain({
    pattern: "vault_kek",
    line: 2,
    message: "Cryptographic keys must never be logged"
  });
});

test("E2E: Safe logging patterns pass CI", async ({ request }) => {
  const prCode = `
    info!("Vault unlocked for user {}", user_id);  // SAFE
    error!("Operation failed with code {}", error_code);  // SAFE
  `;
  
  const scanResult = await scanCodeForForbiddenPatterns(prCode);
  expect(scanResult.passed).toBe(true);
});
```

**Effort:** 3 days (tool 1d, CI integration 0.5d, retrofit + docs 1.5d)  
**Blocker Status:** No  
**Risk:** Low

---

### Tier 2 Summary

| Item | Priority | Effort | Risk | Timeline |
|------|----------|--------|------|----------|
| Privacy Modes UX | MEDIUM | 4d | Low | v1.1 (Week 3-4) |
| DAW Project Versioning | MEDIUM | 8d | Medium | v1.1-v1.2 (Weeks 4-5) |
| Log Scanning | MEDIUM | 3d | Low | v1.1 (Week 3) |

---

## Tier 3: Advanced Features (Low Priority)

### Unimplemented Items (5/5)

Post-v1.1; can be delivered in v2.0-v3.0 timeframe (2-3 months).

#### 3.1 DAW Folder Watcher Agent (Local Service)

**Purpose:** Local daemon watches user's DAW project folders and auto-uploads changes to Ignition OS.

**Specifications:**

**Architecture:**
```
User's Computer
├─ ~/Music/Projects/
│  ├─ Summer.als
│  └─ Remix.flp
├─ ignition-watcher (local service)
│  ├─ Watches directories via fs events
│  ├─ On file change: encrypt + upload to Ignition
│  ├─ Stores metadata (mtime, size, hash)
│  └─ Shows tray icon (status, history)
└─ Token stored: ~/.ignition-watcher/token
    └─ Encrypted with system keychain

Ignition Backend (ecent.online)
└─ Receives encrypted uploads via /api/daw-projects/upload
```

**Features:**
1. **Setup Flow:**
   - User: Settings → "DAW Folder Watcher"
   - Download `ignition-watcher-[OS].zip`
   - Extract and run `ignition-watcher --setup`
   - Prompted to choose folder: `~/Music/Projects`
   - Generate API token (device-specific, revocable)
   - Watcher authenticates with token
   - Add to system startup

2. **Watching:**
   - Monitor `.als`, `.flp`, `.logicx`, `.xrns`, `.serum` files
   - On change: compute file hash, encrypt, upload
   - Rate limit: max 1 upload per 5 minutes
   - Background process (low CPU/memory)

3. **UI:**
   - Tray icon shows sync status (✓ synced, ⧖ syncing, ⚠ error)
   - Click tray → Shows last 10 synced files + timestamps
   - Context menu: Pause, Resume, Settings, Quit

4. **Robustness:**
   - Offline queuing (IndexedDB on client)
   - Automatic retry with exponential backoff
   - Log file: `~/.ignition-watcher/logs/`
   - Crash recovery (resume from last checkpoint)

**Implementation:**
1. Design local watcher app (Electron or Tauri for cross-platform)
2. Implement file system watching (fs events)
3. Token management (system keychain integration)
4. Build distribution (Windows .exe, macOS .dmg, Linux .AppImage)
5. Signed releases (code signing certificates)
6. E2E tests (watch folder, create file, verify upload)

**Acceptance Criteria:**
- [ ] Watcher detects file changes in real-time
- [ ] Encrypted uploads to `/api/daw-projects/upload`
- [ ] Token stored securely in system keychain
- [ ] Tray icon shows sync status
- [ ] Offline queuing works (reconnects on online)
- [ ] E2E: Create DAW file → Watcher detects → Uploads → Visible in Ignition

**E2E Tests:**
```typescript
test("E2E: DAW Folder Watcher detects file change and uploads", async ({ 
  request, 
  execSync, 
  fs 
}) => {
  // 1. Setup watcher
  const setup = execSync("ignition-watcher --setup --folder ~/test-daw --headless");
  const { token } = parseSetupOutput(setup);
  
  // 2. Create a test DAW file
  const testFile = "~/test-daw/Test.als";
  fs.writeFileSync(testFile, Buffer.from("fake_ableton_data"));
  
  // 3. Wait for watcher to detect
  await sleep(2000);
  
  // 4. Verify upload happened
  const projectsResponse = await request.get("/api/daw-projects");
  const { projects } = await projectsResponse.json();
  
  const uploaded = projects.find(p => p.name.includes("Test.als"));
  expect(uploaded).toBeDefined();
  expect(uploaded.file_size).toBe(18);  // File size
  
  // 5. Verify in UI
  // (Navigate to DAW Projects → See "Test.als" uploaded today)
});

test("E2E: Watcher queues and retries on offline", async ({ 
  request, 
  execSync, 
  network 
}) => {
  // 1. Disable network
  await network.setOffline();
  
  // 2. Create file (will be queued)
  fs.writeFileSync("~/test-daw/Offline.als", "data");
  await sleep(1000);
  
  // 3. Verify in watcher logs (queued, awaiting connection)
  const logs = fs.readFileSync("~/.ignition-watcher/logs/latest");
  expect(logs).toContain("Queued: Offline.als (offline)");
  
  // 4. Re-enable network
  await network.setOnline();
  await sleep(2000);
  
  // 5. Verify uploaded
  const projectsResponse = await request.get("/api/daw-projects");
  const { projects } = await projectsResponse.json();
  expect(projects.some(p => p.name.includes("Offline.als"))).toBe(true);
});
```

**Effort:** 12 days (design 1d, app dev 7d, testing 2d, distribution 2d)  
**Blocker Status:** No (nice-to-have)  
**Risk:** High (cross-platform app complexity)

---

#### 3.2 Telemetry & Analytics Framework

**Purpose:** Privacy-first event capture for feature engagement, learning outcomes, production activity.

**Specifications:**

**Event Types (Non-PII Only):**
```json
{
  "event_type": "habit_completed",
  "timestamp": "2026-01-18T22:00:00Z",
  "user_id": "00000000-0000-0000-0000-000000000000",  // Pseudonymized
  "data": {
    "habit_id": "uuid",
    "streak_count": 5,
    "time_of_day": "morning"  // Not exact time
  }
}

// Safe events: categorical, IDs only, no content
// Unsafe events: message content, passwords, file contents
```

**Events to Track:**
1. **Engagement:** Feature opens, time spent, interactions
2. **Learning:** Course completion, quiz scores, drill results
3. **Production:** Focus sessions, DAW file uploads, ideas created
4. **Gamification:** XP earned, level up, achievement unlocked
5. **Errors:** Non-sensitive error codes, feature failures

**Implementation:**
1. Schema:
   - `analytics_events` table (timestamp, event_type, user_id_pseudonym, event_data)
   - Partitioned by month for performance
2. Backend:
   - Event ingestion endpoint (rate-limited)
   - Event validation (prevent PII leakage)
   - Batch write to database (async)
3. Frontend:
   - Event SDK (in `lib/analytics/sdk.ts`)
   - Auto-capture: page views, button clicks, timing
   - Manual capture: feature-specific events
   - Offline queueing + retry
4. Privacy:
   - User can opt-out (Settings → "Share usage data")
   - Events deleted after 90 days
   - No third-party tracking (data stays on-prem)
5. Dashboards:
   - Grafana: Feature engagement, error rates
   - Product analytics: Most used features, churn, retention

**Acceptance Criteria:**
- [ ] Event ingestion working (POST /api/analytics/events)
- [ ] Events persisted to database
- [ ] No PII in events (validation layer)
- [ ] User opt-out respected
- [ ] Dashboards showing engagement metrics
- [ ] E2E: Generate event → Appears in dashboard within 5 min

**E2E Tests:**
```typescript
test("E2E: Telemetry event capture and dashboard visibility", async ({ 
  request, 
  page 
}) => {
  // 1. User completes habit
  const completeResponse = await request.post("/api/habits/123/complete");
  expect(completeResponse.ok()).toBe(true);
  
  // 2. Verify event sent (backend)
  // Wait for async event processing
  await sleep(2000);
  
  // 3. Query events (admin dashboard)
  const eventsResponse = await request.get("/api/admin/analytics/events?type=habit_completed");
  const { events } = await eventsResponse.json();
  
  const event = events.find(e => e.data.habit_id === "123");
  expect(event).toBeDefined();
  expect(event.user_id).not.toContain("@");  // Pseudonymized
  
  // 4. Verify dashboard shows aggregated data
  const dashboardResponse = await request.get("/api/admin/analytics/dashboard");
  const { metrics } = await dashboardResponse.json();
  expect(metrics.habits_completed_today).toBeGreaterThan(0);
});

test("E2E: User opt-out respected", async ({ request }) => {
  // 1. Disable telemetry
  await request.post("/api/settings/telemetry", { enabled: false });
  
  // 2. Complete habit
  await request.post("/api/habits/123/complete");
  
  // 3. Verify NO event sent
  const eventsResponse = await request.get("/api/admin/analytics/events?type=habit_completed");
  const { events } = await eventsResponse.json();
  const event = events.find(e => e.user_id === "opt-out-user");
  expect(event).toBeUndefined();
});

test("E2E: PII rejection in telemetry", async ({ request }) => {
  // 1. Attempt to log event with PII
  const eventResponse = await request.post("/api/analytics/events", {
    events: [{
      event_type: "idea_created",
      data: {
        content: "Secret technique using XYZ filter"  // FORBIDDEN
      }
    }]
  });
  
  // 2. Should be rejected or sanitized
  expect(eventResponse.status()).toBe(400);
  const { error } = await eventResponse.json();
  expect(error).toContain("PII detected");
});
```

**Effort:** 8 days (backend 2d, frontend 1.5d, dashboards 2d, privacy layer 1d, tests 1.5d)  
**Blocker Status:** No  
**Risk:** Medium (privacy validation complex)

---

#### 3.3 Learning Path Recommendations

**Purpose:** Suggest optimal learning sequences based on user's current skills and goals.

**Specifications:**

**Algorithm:**
```
User Profile:
  - Current skills: [Knowledge: 5/10, Proficiency: 3/10, Charm: 2/10]
  - Learning history: [Courses completed, drills attempted, scores]
  - Goals: ["Improve mixing", "Learn sound design"]
  - Time commitment: 30 min/day

Recommendation Engine:
  1. Find courses matching goals + skill level
  2. Rank by:
     - User's weak skills (prioritize)
     - Prerequisite match (user has basics)
     - Time commitment (30 min course before 2-hour course)
     - Engagement (user's learning style)
  3. Return top 3 + reasoning
```

**APIs:**
```
GET /api/learn/recommendations
  → [
      {
        course_id: "xyz",
        reason: "Improve mixing (weak: 3/10)",
        estimated_time: "4 hours",
        prerequisite_met: true,
        match_score: 0.95
      },
      ...
    ]
```

**Implementation:**
1. Backend:
   - User skill analyzer (aggregate drill/quiz results)
   - Recommendation engine (ranking algorithm)
   - A/B testing framework (compare algorithms)
2. Frontend:
   - "Recommended For You" section on Learn dashboard
   - Show reason + estimated time
   - Click → Start course
3. Feedback loop:
   - Track if user follows recommendation
   - Measure completion rate
   - Optimize algorithm weights

**Acceptance Criteria:**
- [ ] Skill analysis accurate (score matches quiz results)
- [ ] Recommendations personalized to user
- [ ] Reasoning shown to user
- [ ] Engagement metrics tracked
- [ ] E2E: User with weak mixing skill → Receives mixing course recommendation

**E2E Tests:**
```typescript
test("E2E: Learning path recommendation based on skills", async ({ 
  request 
}) => {
  // 1. Complete some learning activities
  await request.post("/api/learn/drills/123/submit", { score: 0.6 });  // Low
  await request.post("/api/learn/quizzes/456/submit", { score: 0.9 }); // High
  
  // 2. Request recommendations
  const recommendResponse = await request.get("/api/learn/recommendations");
  const { recommendations } = await recommendResponse.json();
  
  // 3. Should recommend courses matching weak areas
  const weakAreaCourse = recommendations.find(r => 
    r.reason.includes("weak") || r.match_score > 0.8
  );
  expect(weakAreaCourse).toBeDefined();
});
```

**Effort:** 5 days (algorithm 2d, backend 1d, frontend 1d, tests 1d)  
**Blocker Status:** No (nice-to-have)  
**Risk:** Low

---

#### 3.4 Starter Engine V2 (Neo4j Ranking + Telemetry)

**Purpose:** Intelligently rank "Quick Picks" on Today dashboard using transition probabilities and engagement telemetry.

**Specifications:**

**Algorithm:**
```
Score_i = (W_F * Frequency_i) + (W_R * Recency_i) + (W_S * Sequence_i) + (W_C * Context_i)

Where:
  Frequency = normalized count of completions
  Recency = 1 / (1 + days_since_last)
  Sequence = P(Next=i | Prev=LastAction) from Neo4j
  Context = bonus for matching time/goal (0 or 1)
  Weights: W_F=0.4, W_R=0.3, W_S=0.3, W_C=0.0
```

**Neo4j Graph Model:**
```
(:User {id}) -[:NEXT {count}]-> (:Action {type: "habit"|"focus"|"quest"})

Example:
(User:ABC) -[:NEXT {count: 15}]-> (Action:HabitMorningRun)
(User:ABC) -[:NEXT {count: 8}]-> (Action:HabitMeditationAfterRun)
```

**Implementation:**
1. Backend:
   - Ranking service (`RankingEngine`)
   - Neo4j projection worker (batch update graph)
   - Fallback to PG if Neo4j unavailable (200ms timeout)
2. Frontend:
   - Display "Quick Picks" in ranked order
   - Show "Why this?" microline (neutral explanation)
3. Telemetry:
   - Log "decision_exposed" (what was shown)
   - Log "decision_outcome" (what user clicked)
   - Use for A/B testing: ranking v1 vs v2

**Acceptance Criteria:**
- [ ] Neo4j graph projections working
- [ ] Ranking algorithm deterministic
- [ ] Fallback to Postgres if Neo4j unavailable
- [ ] Telemetry captured (exposure + outcome)
- [ ] "Why this?" explanation shown
- [ ] A/B test setup for algorithm comparison
- [ ] E2E: Score calculation verified, ranking deterministic

**E2E Tests:**
```typescript
test("E2E: Starter Engine V2 ranking determinism", async ({ request }) => {
  // 1. Fetch recommendations twice
  const rec1Response = await request.get("/api/today");
  const { quick_picks: picks1 } = await rec1Response.json();
  
  const rec2Response = await request.get("/api/today");
  const { quick_picks: picks2 } = await rec2Response.json();
  
  // 2. Should be identical (same state = same order)
  expect(picks1.map(p => p.id)).toEqual(picks2.map(p => p.id));
});

test("E2E: Starter Engine V2 fallback to Postgres", async ({ 
  request, 
  network 
}) => {
  // 1. Disable Neo4j
  await network.blockHost("neo4j.internal");
  
  // 2. Request recommendations
  const recResponse = await request.get("/api/today", {
    timeout: 5000  // Should return within 5s (not wait for Neo4j)
  });
  expect(recResponse.ok()).toBe(true);
  
  // 3. Verify used fallback (check response header or body)
  const data = await recResponse.json();
  expect(data.ranking_source).toBe("postgres");  // Not neo4j
});

test("E2E: Decision telemetry captured", async ({ request }) => {
  // 1. Fetch recommendations (logs exposure)
  const recResponse = await request.get("/api/today");
  const { exposure_id } = await recResponse.json();
  
  // 2. User clicks a habit (logs outcome)
  await request.post("/api/habits/123/start", {
    exposure_id  // Include for attribution
  });
  
  // 3. Verify telemetry
  const telemetryResponse = await request.get("/api/admin/analytics/decisions");
  const { decision_pairs } = await telemetryResponse.json();
  
  const match = decision_pairs.find(d => d.exposure_id === exposure_id);
  expect(match).toBeDefined();
  expect(match.action).toBe("started");
});
```

**Effort:** 10 days (Neo4j 2d, ranking 2d, backend 2d, frontend 2d, tests 2d)  
**Blocker Status:** No  
**Risk:** High (Neo4j projection + fallback complexity)

---

#### 3.5 Friend List + Secondary Revocable Keys

**Purpose:** Enable optional collaboration by sharing encrypted content with friends using secondary wrapping keys.

**Specifications:**

**Crypto Model:**
```
Vault KEK (primary, user's passphrase-derived)
  ↓
[Encrypted Content] (ideas, infobase entries, etc.)
  ↓
Friend Wrapping Key (per-friend, derived from Friend KEK)
  ↓
Secondary Vault Access for Friend
```

**Schema:**
```sql
CREATE TABLE friend_keys (
  id UUID PRIMARY KEY,
  vault_id UUID REFERENCES vaults(id),
  friend_user_id UUID REFERENCES users(id),
  friend_key_encrypted TEXT,  -- Friend's KEK, encrypted with Vault KEK
  friend_key_hash VARCHAR(256),  -- Hash for revocation
  created_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ NULL  -- NULL = active
);

CREATE TABLE shared_content (
  id UUID PRIMARY KEY,
  content_type VARCHAR(50),  -- "idea", "infobase_entry"
  content_id UUID,
  friend_key_id UUID REFERENCES friend_keys(id),
  shared_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Flow:**
1. User A: Settings → "Share With Friends"
2. User A: Adds User B (email)
3. Backend:
   - Generates Friend Key (random)
   - Encrypts Friend Key with Vault KEK
   - Stores in `friend_keys` table
   - Sends invite to User B
4. User B:
   - Receives invite + accepts
   - Backend creates secondary vault access
   - User B can now decrypt shared content
5. User A: Can revoke anytime
   - Sets `revoked_at` timestamp
   - User B loses access (can't decrypt new Friend Key)

**Implementation:**
1. Schema + migrations
2. Backend:
   - Friend invite endpoints
   - Secondary vault access check
   - Key revocation
3. Frontend:
   - Friend list UI
   - Share content modal
   - Revoke access
4. E2E tests

**Acceptance Criteria:**
- [ ] Friend keys generated and encrypted correctly
- [ ] Shared content readable by friend
- [ ] Revocation works (friend loses access)
- [ ] E2E: User A shares idea → User B reads → User A revokes → User B can't access

**E2E Tests:**
```typescript
test("E2E: Share encrypted content with friend", async ({ 
  request: userARequest, 
  browser 
}) => {
  // 1. User A creates private idea
  const ideaResponse = await userARequest.post("/api/ideas", {
    data: { title: "Secret", is_private: true }
  });
  const { id: ideaId } = await ideaResponse.json();
  
  // 2. User A invites User B
  const inviteResponse = await userARequest.post("/api/friends/invite", {
    email: "user-b@example.com"
  });
  expect(inviteResponse.ok()).toBe(true);
  
  // 3. User B accepts invite (different browser context)
  const userBPage = await browser.newPage();
  const userBRequest = userBPage.context().request;
  const acceptResponse = await userBRequest.post("/api/friends/accept-invite", {
    from_user_id: "user-a-id"
  });
  expect(acceptResponse.ok()).toBe(true);
  
  // 4. User B can now read shared idea
  const userBIdeaResponse = await userBRequest.get(`/api/ideas/${ideaId}`);
  expect(userBIdeaResponse.ok()).toBe(true);
  const sharedIdea = await userBIdeaResponse.json();
  expect(sharedIdea.title).toBe("Secret");
  
  // 5. User A revokes access
  await userARequest.post("/api/friends/revoke", {
    friend_user_id: "user-b-id"
  });
  
  // 6. User B can no longer read
  const revokedResponse = await userBRequest.get(`/api/ideas/${ideaId}`);
  expect(revokedResponse.status()).toBe(403);
});
```

**Effort:** 12 days (design 1d, crypto 2d, backend 3d, frontend 2d, tests 2d, infrastructure 2d)  
**Blocker Status:** No (optional)  
**Risk:** High (E2EE + multi-user complexity)

---

### Tier 3 Summary

| Item | Priority | Effort | Risk | Timeline |
|------|----------|--------|------|----------|
| DAW Folder Watcher | LOW | 12d | High | v2.0 (Month 2-3) |
| Telemetry Framework | LOW | 8d | Medium | v2.0 (Month 2) |
| Learning Recommendations | LOW | 5d | Low | v2.1 (Month 3) |
| Starter Engine V2 | LOW | 10d | High | v3.0 (Month 4) |
| Friend Collaboration | LOW | 12d | High | v3.0 (Month 4) |

---

## Tier 4: Sync & Real-Time (Future Infrastructure)

### Unimplemented Items (4/4)

v3.0+ (post-launch, 3+ months); infrastructure optimization.

#### 4.1 Delta Sync Endpoint

**Purpose:** Reduce bandwidth by 100x — only send changes since last sync.

**API:**
```
GET /api/sync/delta?table=quests&since=2026-01-18T20:00:00Z
  → { 
      items: [...],
      deleted_ids: [...],
      last_sync: "2026-01-18T22:00:00Z",
      has_more: false
    }
```

**Implementation:** 2 days (endpoint 1d, client merge 1d)

**Effort:** 2 days | **Risk:** Low | **Timeline:** v3.0+

---

#### 4.2 Real-Time Push (WebSocket)

**Purpose:** Eliminate 30s polling lag; push updates instantly.

**Architecture:**
```
Backend (Rust + tokio-tungstenite)
  ├─ WebSocket handler
  ├─ Broadcast subscriptions (Redis Pub/Sub for multi-server)
  └─ Connection keep-alive

Frontend
  ├─ Reconnection logic
  ├─ Message queue (if disconnected)
  └─ Sync on reconnect
```

**Implementation:** 5 days (server 2d, client 1d, Redis 1d, tests 1d)

**Effort:** 5 days | **Risk:** Medium | **Timeline:** v3.0+

---

#### 4.3 Chunked Encryption Standard

**Purpose:** Standardize large file encryption with per-chunk IVs and resumable tracking.

**Spec:**
```
Chunk Size: 1 MB
IV: Random 12-byte per chunk
Tag: AEAD authentication tag
Format: [IV (12B)] [TAG (16B)] [CIPHERTEXT (1MB)]
```

**Implementation:** 3 days

**Effort:** 3 days | **Risk:** Low | **Timeline:** v3.0+

---

#### 4.4 Deterministic File Identity Policy

**Purpose:** Decide: use ciphertext hashes (privacy) vs. plaintext hashes (deduplication).

**Options:**
- v1: Ciphertext hashes (no deduplication, max privacy)
- v2: Optional plaintext hashing (opt-in deduplication)

**Implementation:** 1 day (design only; no code)

**Effort:** 1 day | **Risk:** Low | **Timeline:** v3.0 (design phase)

---

### Tier 4 Summary

| Item | Priority | Effort | Risk | Timeline |
|------|----------|--------|------|----------|
| Delta Sync | LOW | 2d | Low | v3.0+ |
| WebSocket Push | LOW | 5d | Medium | v3.0+ |
| Chunked Encryption | LOW | 3d | Low | v3.0+ |
| File Identity Policy | LOW | 1d | Low | v3.0+ (design) |

---

## Implementation Timeline

### Phase 1: MVP Launch (Week 1)
- ✅ All 28 features shipped
- ✅ E2EE Tier 1 complete
- ✅ Monitoring configured
- **Status:** Ready

### Phase 2: Tier 1 Post-MVP (Weeks 2-3, 5 days effort)
- [ ] Trust boundary labeling (2d)
- [ ] Recovery codes (5d) *ongoing*
- **Target:** v1.0.1

### Phase 3: Tier 2 (Weeks 3-5, 15 days effort)
- [ ] Privacy modes UX (4d)
- [ ] DAW project versioning (8d)
- [ ] Log scanning (3d)
- **Target:** v1.1-v1.2

### Phase 4: Tier 3 (Weeks 6-12, 40 days effort)
- [ ] DAW folder watcher (12d)
- [ ] Telemetry framework (8d)
- [ ] Learning recommendations (5d)
- [ ] Starter Engine V2 (10d)
- [ ] Friend collaboration (12d) *optional*
- **Target:** v2.0-v3.0

### Phase 5: Tier 4 (Weeks 13+, 11 days effort)
- [ ] Delta sync (2d)
- [ ] WebSocket push (5d)
- [ ] Chunked encryption (3d)
- [ ] File identity policy (1d)
- **Target:** v3.0-v4.0

---

## Effort Summary

| Tier | Items | Total Effort | Team | Timeline |
|------|-------|--------------|------|----------|
| T1 | 2 | 7d | 1-2 devs | 2 weeks |
| T2 | 3 | 15d | 1-2 devs | 3 weeks |
| T3 | 5 | 40d | 2-3 devs | 8 weeks |
| T4 | 4 | 11d | 1-2 devs | 3 weeks |
| **Total** | **14** | **73d** | **2-3 devs** | **~20 weeks** |

**With 2-3 developers:** ~4-5 months to complete all tiers  
**With 1 developer:** ~6-7 months

---

## Execution Strategy

### Week 1-2 (T1 Post-MVP)
1. **Trust Boundaries** (2d)
   - Define annotations
   - Integrate lint checks
   - Retrofit existing code
   - CI integration

2. **Recovery Codes (Parallel, 5d)**
   - Schema + migrations
   - Backend endpoints
   - Frontend UI
   - E2E tests

### Week 3-5 (T2)
1. **Privacy Modes** (4d) — Independent
2. **DAW Versioning** (8d) — Parallel to privacy modes
3. **Log Scanning** (3d) — Parallel

### Week 6-12 (T3)
1. **Telemetry** (8d) — Independent foundation
2. **Learning Recommendations** (5d) — Uses telemetry
3. **Starter Engine V2** (10d) — Uses telemetry + recommendations
4. **DAW Watcher** (12d) — Parallel
5. **Friend Collab** (12d) — Optional; can skip for v2.0

### Week 13+ (T4)
1. **Delta Sync** (2d)
2. **WebSocket** (5d)
3. **Chunked Encryption** (3d)
4. **File Identity** (1d design)

---

## Go/No-Go Decisions

### Recommended for v1.1 (High Value, Low Risk)
- ✅ Privacy modes UX
- ✅ Log scanning
- ✅ Learning recommendations

### Consider for v1.1 (Medium Value, Medium Risk)
- 🟡 DAW project versioning
- 🟡 Recovery codes
- 🟡 Telemetry framework

### Recommend for v2.0+ (Complex or Optional)
- 🔴 DAW folder watcher (complex, nice-to-have)
- 🔴 Starter Engine V2 (high risk, requires tuning)
- 🔴 Friend collaboration (optional, complex E2EE)
- 🔴 Delta sync / WebSocket (infrastructure, not user-facing)

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| E2EE complexity (T1, T3) | Peer review, security audit, staged rollout |
| DAW watcher reliability (T3) | Extensive testing, fallback to manual upload |
| Neo4j performance (T3) | 200ms timeout, Postgres fallback, A/B test |
| WebSocket scalability (T4) | Load testing, Redis Pub/Sub, connection limits |
| Privacy regression (all) | Log scanning CI, audit layer, compliance review |

---

## Success Criteria

### By Feature
- [ ] All E2E tests passing
- [ ] No security regressions (audit passing)
- [ ] No PII in logs (scanning passing)
- [ ] Documentation complete
- [ ] Stakeholder sign-off

### By Phase
- [ ] T1 post-MVP: Recovery codes + trust boundaries working
- [ ] T2: Privacy modes + DAW versioning + observability live
- [ ] T3: Telemetry, recommendations, Neo4j ranking working
- [ ] T4: Delta sync, WebSocket, chunked encryption production-ready

---

## Next Steps

1. **Approve roadmap** — Decide which tiers to tackle in each version
2. **Allocate team** — Assign devs to phases
3. **Create detailed specs** — Break each item into PRs
4. **Start Phase 2** — Begin Trust Boundaries + Recovery Codes
5. **Monitor progress** — Weekly check-ins on effort accuracy

---

**Created:** January 18, 2026  
**Status:** Ready for development team review & approval  
**Document Version:** 1.0

