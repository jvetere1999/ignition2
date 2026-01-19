# IGNITION OS — COMPREHENSIVE ACTION PLAN
## All Unfinished Work from MASTER_FEATURE_SPEC.md

**Date:** January 19, 2026  
**Status:** ACTION PLAN CREATED — READY TO EXECUTE  
**Scope:** Tier 1 (Complete), Tier 2-4 (Unfinished) — 17 items

---

## PRIORITY EXECUTION ORDER

### 🔴 TIER 1 CONTINUATION (Blocking Tier 2+)

#### ACTION-001: Vault Lock Policy Doc + Enforcement
**Status:** Not Started  
**Priority:** ⭐⭐⭐ CRITICAL (unblocks all Tier 2)  
**Effort:** 4-6 hours  
**Owner:** Backend (Rust)  

**Requirements:**
- Document vault lock triggers (inactivity, session end, explicit lock)
- Auto-lock policy: 10m inactivity default, configurable per user
- Lock enforcement across all devices (propagate lock state via polling)
- Unlock modal with passphrase entry
- Lock/unlock events in audit trail

**Deliverables:**
1. `docs/product/e2ee/vault-lock-policy.md` (2KB spec)
2. Backend route: `POST /api/vault/lock` (requires auth)
3. Backend route: `GET /api/vault/lock-status` (no auth for UX feedback)
4. Database: `vault_lock_state` table (user_id, locked_at, lock_reason)
5. Frontend: VaultLockModal component
6. Polling integration: 30s lock state sync

**Dependencies:** Tier 1.2 complete ✅

**Blockers for:** Tier 2, Privacy modes, Advanced features

---

#### ACTION-002: CryptoPolicy Doc + Version Storage
**Status:** Not Started  
**Priority:** ⭐⭐⭐ CRITICAL (unblocks evolution)  
**Effort:** 3-4 hours  
**Owner:** Backend (Rust) + Frontend

**Requirements:**
- Document crypto algorithm versioning strategy
- v1: AES-256-GCM (current)
- v2: ChaCha20-Poly1305 (future) + Argon2id KDF
- Store `crypto_policy_version` in vault metadata
- Migration path from v1 → v2 (key re-encryption)

**Deliverables:**
1. `docs/product/e2ee/crypto-policy.md` (4KB comprehensive spec)
2. Backend schema: `crypto_policies` table
3. Backend routes: `GET /api/crypto-policy`, `POST /api/crypto-policy/rotate`
4. Database migrations for version tracking
5. Frontend: Display current crypto version in Settings
6. Rotation UI: Trigger key re-encryption (async, long-running)

**Dependencies:** Tier 1.2 complete ✅

**Blockers for:** Tier 2, Collaboration, v2 algorithm rollout

---

#### ACTION-003: Client-Side Encrypted Search Index (IndexedDB)
**Status:** Partially done (from previous session)  
**Priority:** ⭐⭐⭐ HIGH (enables search on Ideas/Infobase)  
**Effort:** 2-3 hours (finishing)  
**Owner:** Frontend (React/IndexedDB)  

**Requirements:**
- IndexedDB trie index for encrypted content
- Regenerate on vault unlock, clear on lock
- Search on Ideas + Infobase (encrypted client-side)
- Deterministic token generation for search terms
- Async indexing with progress UI

**Deliverables:**
1. SearchIndexManager class (complete trie implementation)
2. Tokenizer for search terms (deterministic)
3. SearchBox component with dropdown
4. IndexProgress component (ETA, progress bar)
5. VaultLockContext integration (auto-rebuild on unlock)
6. Ideas + Infobase page integration
7. E2E tests: 15+ test cases

**Dependencies:** Tier 1.2 complete ✅, Vault lock policy (ACTION-001)

**Blockers for:** Tier 2 Privacy modes

---

### 🟡 TIER 2 EXECUTION (Foundation for Features)

#### ACTION-004: Privacy Modes UX (Private Work vs Standard)
**Status:** Not Started  
**Priority:** ⭐⭐ HIGH (security feature)  
**Effort:** 5-7 hours  
**Owner:** Frontend (React) + Backend (Rust)  

**Requirements:**
- Mark content sensitivity in UI (toggle: Private vs Standard)
- Affects sync retention, audit trails, observability
- Private work: Never logged, shorter retention
- Standard work: Normal logging, full retention
- Settings page: Privacy mode preferences

**Deliverables:**
1. Backend schema: `privacy_mode` field on ideas, journal, infobase
2. Backend routes: Filter by privacy mode in queries
3. Frontend: PrivacyToggle component (Private/Standard)
4. Frontend: Settings → Privacy Preferences
5. Audit trail filtering: Hide private work from compliance reports
6. Observability: Exclude private work from telemetry
7. E2E tests: 8 test cases

**Dependencies:** Tier 1 complete ✅, Vault lock (ACTION-001), CryptoPolicy (ACTION-002)

**Blockers for:** Advanced features, Observability

---

#### ACTION-005: DAW Project File Tracking + Versioning
**Status:** Not Started  
**Priority:** ⭐⭐ MEDIUM (advanced feature)  
**Effort:** 8-10 hours  
**Owner:** Backend (Rust) + Frontend (React)  

**Requirements:**
- Upload/download DAW project files with version history
- Metadata: hash, size, modification time
- R2 versioning support
- Client-side encryption, chunked uploads, resumability
- Track: .als, .flp, .logicx, .serum, .wavetable formats

**Deliverables:**
1. Backend schema: `daw_project_files`, `daw_project_versions`
2. Backend routes: Upload, download, list versions, restore version
3. Chunked upload handler: 5MB chunks, resumability
4. R2 integration: Versioning policy
5. Frontend: DAW Projects page with upload/download UI
6. Encryption: Client-side before upload, decrypt on download
7. Versioning UI: Timeline of changes
8. E2E tests: 12 test cases

**Dependencies:** Tier 1 complete ✅, Vault lock (ACTION-001)

**Blockers for:** Advanced features, Collaboration

---

#### ACTION-006: Observability Red Lines + CI Log Scanning
**Status:** Not Started  
**Priority:** ⭐⭐ MEDIUM (compliance)  
**Effort:** 3-4 hours  
**Owner:** DevOps + Backend  

**Requirements:**
- Define "red line" fields (never log: PII, keys, private content)
- CI scan logs for forbidden fields
- Fail build if red lines found
- Create CI rule database
- Document in security playbook

**Deliverables:**
1. `.github/observability-rules.yml` (forbidden field definitions)
2. CI job: Log scanner with regex patterns
3. Documentation: `docs/ops/observability-red-lines.md`
4. Automated tests: Scan all logs for violations
5. Incident response: Auto-alert if red line found

**Dependencies:** None (can run in parallel)

**Blockers for:** Production deployment confidence

---

### 🟠 TIER 3 EXECUTION (Advanced Capabilities)

#### ACTION-007: DAW Folder Watcher Agent (Local Service)
**Status:** Not Started  
**Priority:** ⭐ MEDIUM (optional)  
**Effort:** 6-8 hours  
**Owner:** Electron/Node.js + Backend  

**Requirements:**
- Local agent watches user-designated DAW project folders
- Sends update events for DAW files with metadata (hash/size/mtime)
- Triggers encrypted uploads on file change
- Explicit opt-in required; no silent background syncing
- Respects E2EE posture and revocation rules

**Deliverables:**
1. Electron app: File system watcher (uses chokidar)
2. Event queue: Batch changes into upload batches
3. Backend integration: `POST /api/daw/file-updates`
4. Settings: Folder path configuration
5. Status UI: Watched folders, sync status
6. E2E tests: 6 test cases

**Dependencies:** ACTION-005 (DAW file tracking)

**Blockers for:** Advanced automation

---

#### ACTION-008: Telemetry & Analytics Framework (Privacy-First)
**Status:** Not Started  
**Priority:** ⭐ LOW (nice-to-have)  
**Effort:** 4-5 hours  
**Owner:** Backend (Rust) + Frontend (React)  

**Requirements:**
- Feature engagement tracking
- Learning outcomes measurement
- Production activity tracking
- Privacy-first: no PII, no personal data
- Aggregated only, never individual

**Deliverables:**
1. Backend schema: `events`, `event_aggregations`
2. Frontend: EventTracker class (batching, privacy)
3. Backend route: `POST /api/telemetry/events` (no auth, fire-and-forget)
4. Dashboard: Analytics page (engagement, retention, outcomes)
5. Privacy policy update
6. E2E tests: 4 test cases

**Dependencies:** None (can run in parallel)

**Blockers for:** Product insights

---

#### ACTION-009: Learning Path Recommendations (Advanced Learning)
**Status:** Not Started  
**Priority:** ⭐ LOW (nice-to-have)  
**Effort:** 5-6 hours  
**Owner:** Backend (Rust) + Neo4j  

**Requirements:**
- Recommend next lessons based on review performance
- Suggest learning sequences for skill development
- Personalized pacing (faster/slower based on mastery)
- Integration with Neo4j for graph projections

**Deliverables:**
1. Backend: Learning recommendation engine
2. Neo4j query: `MATCH (skill)-[:PREREQUISITE]->(next) WHERE user_mastery(skill) > 0.8 RETURN next`
3. Backend route: `GET /api/learn/recommendations`
4. Frontend: "Recommended Next" section on Learn dashboard
5. Settings: Learning pace preference
6. E2E tests: 5 test cases

**Dependencies:** Learn dashboard complete ✅

**Blockers for:** Advanced learning

---

#### ACTION-010: Starter Engine V2 (Decision Telemetry + Ranking)
**Status:** Not Started  
**Priority:** ⭐ LOW (research)  
**Effort:** 8-10 hours  
**Owner:** Backend (Rust) + ML/Data  

**Requirements:**
- Dynamic UI ranking based on user behavior
- Decision telemetry: what users choose, when, why
- Neo4j projection: User decision patterns
- Feature-flagged rollout (A/B testing framework exists)
- Scoring: Engagement, completion, mastery

**Deliverables:**
1. Backend: DecisionTelemetry schema
2. Telemetry route: `POST /api/telemetry/decisions`
3. Neo4j: Decision pattern projection
4. Ranking algorithm: Weighted scoring
5. Feature flag: `starter_engine_v2_enabled`
6. Admin dashboard: Decision analytics
7. E2E tests: 8 test cases

**Dependencies:** Telemetry framework (ACTION-008)

**Blockers for:** Advanced personalization

---

#### ACTION-011: Friend List + Secondary Revocable Keys
**Status:** Not Started  
**Priority:** ⭐ LOW (collaboration feature)  
**Effort:** 7-9 hours  
**Owner:** Backend (Rust) + Frontend (React)  

**Requirements:**
- Friend list management (add, remove, block)
- Collaboration scope: Share specific content
- Secondary revocable keys for friends
- Key derivation: Friend DEK from user KEK
- Revocation: Immediate, logs audit trail

**Deliverables:**
1. Backend schema: `friends`, `friend_requests`, `secondary_keys`
2. Backend routes: Add friend, remove, block, list
3. Backend routes: `POST /api/crypto/derive-friend-key`
4. Frontend: Friends management page
5. Frontend: Share modal (with friend selection)
6. Key rotation on friend removal
7. E2E tests: 10 test cases

**Dependencies:** Tier 1 complete ✅, CryptoPolicy (ACTION-002)

**Blockers for:** Collaboration features

---

### 🔵 TIER 4 EXECUTION (Infrastructure)

#### ACTION-012: Delta Sync Endpoint + Client Merge
**Status:** Not Started  
**Priority:** ⭐ LOW (infrastructure)  
**Effort:** 6-8 hours  
**Owner:** Backend (Rust) + Frontend (React)  

**Requirements:**
- Delta sync: Only changed records since last sync
- Reduces bandwidth, improves UX
- Conflict resolution: Last-write-wins, or app-specific logic
- Client merge: Apply deltas to local state

**Deliverables:**
1. Backend schema: `sync_checkpoints` (per user, per entity)
2. Backend route: `GET /api/sync/delta?since=timestamp`
3. Response: Only records changed since checkpoint
4. Client: SyncManager with merge logic
5. Conflict detection: timestamp-based
6. E2E tests: 8 test cases

**Dependencies:** Cross-device sync working ✅

**Blockers for:** Large-scale data efficiency

---

#### ACTION-013: Real-Time Push Sync (WebSocket)
**Status:** Not Started  
**Priority:** ⭐ LOW (infrastructure)  
**Effort:** 5-7 hours  
**Owner:** Backend (Rust) + Frontend (React)  

**Requirements:**
- WebSocket connection for real-time updates
- Polling fallback if WebSocket unavailable
- Heartbeat: Keep connection alive
- Reconnection: Exponential backoff
- Multi-device push: Notify all user devices

**Deliverables:**
1. Backend: WebSocket server (Axum with tokio-tungstenite)
2. Route: `WS /api/sync/realtime`
3. Message type: `SyncUpdate { entity, action, data }`
4. Frontend: WebSocketClient with reconnection logic
5. Heartbeat: 30s ping/pong
6. Fallback: Resume polling if WebSocket fails
7. E2E tests: 8 test cases

**Dependencies:** Delta sync (ACTION-012)

**Blockers for:** Real-time collaboration

---

#### ACTION-014: Chunked Encryption Standard + Resumable Uploads
**Status:** Not Started  
**Priority:** ⭐ LOW (infrastructure)  
**Effort:** 4-5 hours  
**Owner:** Backend (Rust) + Frontend (React)  

**Requirements:**
- Chunked upload format: 5MB chunks default
- Encryption per-chunk: Deterministic nonce generation
- Resumability: Resume interrupted uploads
- Metadata: Hash, size, completion status

**Deliverables:**
1. Backend schema: `upload_sessions` (session_id, status, chunks_received)
2. Backend route: `POST /api/uploads/[session_id]/chunk`
3. Resumability: `GET /api/uploads/[session_id]` returns progress
4. Finalization: `POST /api/uploads/[session_id]/complete`
5. Frontend: Upload manager with pause/resume
6. Progress bar: Live chunk upload status
7. E2E tests: 6 test cases

**Dependencies:** None (can run in parallel)

**Blockers for:** Large file handling

---

#### ACTION-015: Deterministic File Identity Policy
**Status:** Not Started  
**Priority:** ⭐ LOW (infrastructure)  
**Effort:** 2-3 hours  
**Owner:** Backend (Rust)  

**Requirements:**
- Decide: Hash ciphertext or plaintext?
- Ciphertext: Different hash per upload (random IV)
- Plaintext: Same hash for duplicate content detection
- Policy: Document for compliance

**Deliverables:**
1. Decision document: `docs/ops/file-identity-policy.md`
2. Backend: File hash calculation (per policy)
3. Deduplication logic (if using plaintext hashes)
4. Tests: 3 test cases

**Dependencies:** None

**Blockers for:** Deduplication optimization

---

## UNFINISHED CRITICAL ITEMS (from previous sessions)

#### ACTION-016: Fix Pre-Existing Unit Test Framework
**Status:** Blocked  
**Priority:** ⭐⭐ MEDIUM (unblocks testing)  
**Effort:** 1-2 hours  
**Owner:** Backend (Rust)  

**Current Issue:**
- 107 pre-existing test framework errors
- Schema migration test fixtures incompatible
- Cannot run `cargo test` until fixed

**Deliverables:**
1. Update test fixtures to match current schema
2. Run: `cargo test --no-run` to verify compilation
3. Run: `cargo test services::recovery_validator` → 8 tests pass
4. Update: All test fixtures to current migrations

**Dependencies:** None (can fix independently)

**Unblocks:** Unit testing, CI/CD pipeline

---

#### ACTION-017: Deployment Pipeline Verification
**Status:** Not Started  
**Priority:** ⭐⭐⭐ CRITICAL (go-live readiness)  
**Effort:** 2-3 hours  
**Owner:** DevOps + Backend + Frontend  

**Current Status:**
- Backend: 0 errors, compiles ✅
- Frontend: 0 TypeScript errors, builds ✅
- E2E Tests: 18 tests ready ✅
- Database schema: Ready ✅
- Deployment scripts: Need verification ✅

**Deliverables:**
1. Run E2E tests against live servers
2. Verify deployment scripts work
3. Test staging deployment
4. Pre-flight checklist completion
5. Production deployment readiness sign-off

**Dependencies:** All Tier 1 complete ✅

**Unblocks:** Production release

---

## EXECUTION ROADMAP

### Phase 1: Complete Tier 1 (1-2 days)
```
✅ ACTION-001: Vault Lock Policy Doc + Enforcement (4-6h)
✅ ACTION-002: CryptoPolicy Doc + Version Storage (3-4h)
✅ ACTION-003: Client-Side Search Index (2-3h)
✅ ACTION-016: Fix Unit Test Framework (1-2h)
✅ ACTION-017: Deployment Verification (2-3h)
```

**Total:** 12-18 hours (~2 days with parallel work)

### Phase 2: Tier 2 Foundation (2-3 days)
```
✅ ACTION-004: Privacy Modes UX (5-7h)
✅ ACTION-005: DAW File Tracking (8-10h)
✅ ACTION-006: Observability Red Lines (3-4h)
```

**Total:** 16-21 hours (~2-3 days with parallel work)

### Phase 3: Tier 3 Advanced (3-4 days, optional)
```
⏳ ACTION-007: DAW Folder Watcher (6-8h)
⏳ ACTION-008: Telemetry Framework (4-5h)
⏳ ACTION-009: Learning Recommendations (5-6h)
⏳ ACTION-010: Starter Engine V2 (8-10h)
⏳ ACTION-011: Friend List + Keys (7-9h)
```

**Total:** 30-38 hours (~4-5 days with parallel work)

### Phase 4: Tier 4 Infrastructure (2-3 days, optional)
```
⏳ ACTION-012: Delta Sync (6-8h)
⏳ ACTION-013: WebSocket Push (5-7h)
⏳ ACTION-014: Chunked Encryption (4-5h)
⏳ ACTION-015: File Identity Policy (2-3h)
```

**Total:** 17-23 hours (~2-3 days with parallel work)

---

## SUMMARY

| Tier | Actions | Status | Effort | Timeline |
|------|---------|--------|--------|----------|
| 1 | 5 | 🔴 IN PROGRESS | 12-18h | 1-2 days |
| 2 | 3 | 🟡 QUEUED | 16-21h | 2-3 days |
| 3 | 5 | 🟠 QUEUED | 30-38h | 4-5 days |
| 4 | 4 | 🔵 QUEUED | 17-23h | 2-3 days |
| **Total** | **17** | **🔴 START HERE** | **75-100h** | **9-13 days** |

---

**Ready to execute Phase 1? Start with ACTION-001.**

