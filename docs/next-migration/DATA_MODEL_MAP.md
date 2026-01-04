# Data Model Map: Vault v3 to D1 + R2

> Version: 1.2
> Last Updated: 2025-01-02
> Status: PR5 Complete (R2 Blob Storage Implemented)

This document maps the legacy Vault v3 / IndexedDB data model to the new D1 (relational) + R2 (blob) storage architecture.

## Implementation Status

| Component | Status | Location |
|-----------|--------|----------|
| D1 Schema | Complete | `migrations/0001_*.sql`, `migrations/0002_*.sql` |
| Repository Layer | Complete | `src/lib/db/repositories/*` |
| Type Definitions | Complete | `src/lib/db/types.ts` |
| DB Utilities | Complete | `src/lib/db/utils.ts` |
| R2 Storage | Complete | `src/lib/storage/*` |
| Blob API Routes | Complete | `src/app/api/blobs/*` |
| Unit Tests | Complete | `src/lib/db/__tests__/*`, `src/lib/storage/__tests__/*` |

---

## Executive Summary

| Legacy (SvelteKit) | Target (Next.js) |
|-------------------|------------------|
| IndexedDB: `passion_os_db` | D1: `passion_os` |
| IndexedDB: `daw_hub_db` | D1: `passion_os` + R2: `passion-os-blobs` |
| IndexedDB: `producer_hub_blobs` | R2: `passion-os-blobs` |
| localStorage: settings/session | D1: `user_settings` + cookies |
| Vault v3 encrypted export | D1 backup + R2 backup |

---

## D1 Schema Overview

### Auth Tables (Auth.js Standard)

```sql
-- Auth.js D1 Adapter tables
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT UNIQUE,
    email_verified INTEGER,
    image TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE accounts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    provider TEXT NOT NULL,
    provider_account_id TEXT NOT NULL,
    refresh_token TEXT,
    access_token TEXT,
    expires_at INTEGER,
    token_type TEXT,
    scope TEXT,
    id_token TEXT,
    session_state TEXT,
    UNIQUE(provider, provider_account_id)
);

CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    session_token TEXT UNIQUE NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires TEXT NOT NULL
);

CREATE TABLE verification_tokens (
    identifier TEXT NOT NULL,
    token TEXT NOT NULL,
    expires TEXT NOT NULL,
    PRIMARY KEY(identifier, token)
);
```

### Planner Core Tables

```sql
-- Event log (append-only, source of truth)
CREATE TABLE log_events (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    payload TEXT NOT NULL, -- JSON
    timestamp TEXT NOT NULL,
    domain_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_log_events_user ON log_events(user_id);
CREATE INDEX idx_log_events_type ON log_events(event_type);
CREATE INDEX idx_log_events_timestamp ON log_events(timestamp);
CREATE INDEX idx_log_events_domain ON log_events(domain_id);

-- Quests (materialized from events)
CREATE TABLE quests (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    domain_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    priority TEXT NOT NULL DEFAULT 'medium',
    due_date TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    completed_at TEXT,
    tags TEXT, -- JSON array
    xp_value INTEGER DEFAULT 0,
    parent_id TEXT REFERENCES quests(id),
    content_hash TEXT NOT NULL
);

CREATE INDEX idx_quests_user ON quests(user_id);
CREATE INDEX idx_quests_status ON quests(status);
CREATE INDEX idx_quests_domain ON quests(domain_id);
CREATE INDEX idx_quests_due ON quests(due_date);

-- Schedule rules
CREATE TABLE schedule_rules (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    domain_id TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    recurrence TEXT NOT NULL,
    days_of_week TEXT, -- JSON array
    day_of_month INTEGER,
    custom_cron TEXT,
    quest_template TEXT NOT NULL, -- JSON
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    content_hash TEXT NOT NULL
);

CREATE INDEX idx_schedule_rules_user ON schedule_rules(user_id);
CREATE INDEX idx_schedule_rules_enabled ON schedule_rules(enabled);

-- Plan templates
CREATE TABLE plan_templates (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    domain_id TEXT NOT NULL,
    template_type TEXT NOT NULL,
    quest_templates TEXT NOT NULL, -- JSON array
    tags TEXT, -- JSON array
    estimated_duration INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    content_hash TEXT NOT NULL
);

CREATE INDEX idx_plan_templates_user ON plan_templates(user_id);
CREATE INDEX idx_plan_templates_type ON plan_templates(template_type);

-- Skill tree state
CREATE TABLE skill_trees (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    version INTEGER NOT NULL DEFAULT 1,
    nodes TEXT NOT NULL, -- JSON
    total_xp INTEGER NOT NULL DEFAULT 0,
    achievements TEXT, -- JSON array
    updated_at TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    UNIQUE(user_id)
);

-- Reward ledger (append-only)
CREATE TABLE reward_ledger (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    domain_id TEXT NOT NULL,
    reward_type TEXT NOT NULL,
    amount INTEGER NOT NULL,
    reason TEXT NOT NULL,
    source_event_id TEXT,
    metadata TEXT, -- JSON
    created_at TEXT NOT NULL
);

CREATE INDEX idx_reward_ledger_user ON reward_ledger(user_id);
CREATE INDEX idx_reward_ledger_type ON reward_ledger(reward_type);
```

### Focus Domain Tables

```sql
-- Focus timer sessions
CREATE TABLE focus_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    started_at TEXT NOT NULL,
    ended_at TEXT,
    planned_duration INTEGER NOT NULL, -- seconds
    actual_duration INTEGER, -- seconds
    status TEXT NOT NULL, -- 'active', 'completed', 'abandoned'
    mode TEXT NOT NULL, -- 'focus', 'break', 'long_break'
    metadata TEXT, -- JSON
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_focus_sessions_user ON focus_sessions(user_id);
CREATE INDEX idx_focus_sessions_started ON focus_sessions(started_at);
CREATE INDEX idx_focus_sessions_status ON focus_sessions(status);
```

### Producing Domain Tables

```sql
-- Projects
CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    starred INTEGER NOT NULL DEFAULT 0,
    tags TEXT, -- JSON array
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    content_hash TEXT NOT NULL
);

CREATE INDEX idx_projects_user ON projects(user_id);
CREATE INDEX idx_projects_status ON projects(status);

-- Reference libraries
CREATE TABLE reference_libraries (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX idx_reference_libraries_user ON reference_libraries(user_id);

-- Reference tracks (blobs in R2)
CREATE TABLE reference_tracks (
    id TEXT PRIMARY KEY,
    library_id TEXT NOT NULL REFERENCES reference_libraries(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    blob_key TEXT NOT NULL, -- R2 key
    mime_type TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    duration_ms INTEGER,
    metadata TEXT, -- JSON
    created_at TEXT NOT NULL
);

CREATE INDEX idx_reference_tracks_library ON reference_tracks(library_id);
CREATE INDEX idx_reference_tracks_user ON reference_tracks(user_id);

-- Infobase entries
CREATE TABLE infobase_entries (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT,
    tags TEXT, -- JSON array
    pinned INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    content_hash TEXT NOT NULL
);

CREATE INDEX idx_infobase_entries_user ON infobase_entries(user_id);
CREATE INDEX idx_infobase_entries_category ON infobase_entries(category);

-- Lane templates
CREATE TABLE lane_templates (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    template_type TEXT NOT NULL, -- 'melody', 'drums', 'chord'
    lane_settings TEXT NOT NULL, -- JSON
    notes TEXT NOT NULL, -- JSON array
    bpm INTEGER NOT NULL,
    bars INTEGER NOT NULL,
    time_signature TEXT NOT NULL, -- JSON [num, denom]
    tags TEXT, -- JSON array
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX idx_lane_templates_user ON lane_templates(user_id);
CREATE INDEX idx_lane_templates_type ON lane_templates(template_type);

-- User settings
CREATE TABLE user_settings (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    theme TEXT NOT NULL DEFAULT 'system',
    selected_product TEXT,
    keyboard_layout TEXT NOT NULL DEFAULT 'mac',
    notifications_enabled INTEGER NOT NULL DEFAULT 1,
    focus_default_duration INTEGER NOT NULL DEFAULT 1500, -- 25 min
    focus_break_duration INTEGER NOT NULL DEFAULT 300, -- 5 min
    focus_long_break_duration INTEGER NOT NULL DEFAULT 900, -- 15 min
    settings_json TEXT, -- Additional settings as JSON
    updated_at TEXT DEFAULT (datetime('now'))
);
```

---

## R2 Layout

### Bucket: `passion-os-blobs`

```
/{user_id}/
    audio/
        {uuid}.{ext}        # Reference tracks, audio loops
    images/
        {uuid}.{ext}        # Project images, covers
    exports/
        vault-{timestamp}.zip  # User data exports
```

### Blob Metadata (in D1)

All blobs have metadata stored in D1 (via `reference_tracks` or dedicated tables), with only the binary data in R2.

### Key Format

```
{user_id}/audio/{uuid}.mp3
{user_id}/images/{uuid}.png
{user_id}/exports/vault-2025-01-02T12-00-00.zip
```

### Access Pattern

1. User requests blob via API: `/api/blobs/{id}`
2. Server checks D1 for metadata + authorization
3. Server generates presigned R2 URL or streams blob
4. Client receives blob

---

## Entity Mapping: Vault v3 to D1

### QuestRef to quests

| Vault v3 Field | D1 Column | Notes |
|----------------|-----------|-------|
| `id` | `id` | Direct |
| `title` | `title` | Direct |
| `description` | `description` | Direct |
| `domainId` | `domain_id` | Snake case |
| `status` | `status` | Direct |
| `priority` | `priority` | Direct |
| `dueDate` | `due_date` | ISO string |
| `createdAt` | `created_at` | ISO string |
| `updatedAt` | `updated_at` | ISO string |
| `completedAt` | `completed_at` | ISO string |
| `tags` | `tags` | JSON array |
| `xpValue` | `xp_value` | Integer |
| `parentId` | `parent_id` | Foreign key |
| `contentHash` | `content_hash` | For conflict detection |

### ScheduleRuleRef to schedule_rules

| Vault v3 Field | D1 Column | Notes |
|----------------|-----------|-------|
| `id` | `id` | Direct |
| `name` | `name` | Direct |
| `description` | `description` | Direct |
| `domainId` | `domain_id` | Snake case |
| `enabled` | `enabled` | Boolean -> Integer |
| `recurrence` | `recurrence` | Direct |
| `daysOfWeek` | `days_of_week` | JSON array |
| `dayOfMonth` | `day_of_month` | Integer |
| `customCron` | `custom_cron` | Direct |
| `questTemplate` | `quest_template` | JSON object |
| `createdAt` | `created_at` | ISO string |
| `updatedAt` | `updated_at` | ISO string |
| `contentHash` | `content_hash` | For conflict detection |

### SkillTreeRef to skill_trees

| Vault v3 Field | D1 Column | Notes |
|----------------|-----------|-------|
| `id` | `id` | Direct |
| `updatedAt` | `updated_at` | ISO string |
| `version` | `version` | Integer |
| `nodes` | `nodes` | JSON object |
| `totalXp` | `total_xp` | Integer |
| `achievements` | `achievements` | JSON array |
| `contentHash` | `content_hash` | For conflict detection |

### RewardLedgerRef to reward_ledger

| Vault v3 Field | D1 Column | Notes |
|----------------|-----------|-------|
| `id` | `id` | Direct |
| `createdAt` | `created_at` | ISO string |
| `domainId` | `domain_id` | Snake case |
| `type` | `reward_type` | Renamed (reserved word) |
| `amount` | `amount` | Integer |
| `reason` | `reason` | Direct |
| `sourceEventId` | `source_event_id` | Snake case |
| `metadata` | `metadata` | JSON object |

---

## Migration Strategy

### One-Time Import (User-Initiated)

1. User exports vault from legacy app (encrypted JSON/ZIP)
2. User uploads to Next.js app import page
3. Server decrypts, validates, transforms to D1 schema
4. Server inserts into D1 tables
5. Blobs uploaded to R2
6. Confirmation shown to user

### No Automatic Sync

The legacy app and Next.js app are independent. There is no automatic sync between them. Users must explicitly export/import.

### Data Validation

All imported data is validated against schemas before insertion:

- Required fields present
- Types correct
- Referential integrity (parent IDs exist)
- Size limits (D1 row limit: 2MB)
- Blob limits (R2 object limit: 5GB per object)

---

## D1 Constraints and Limits

| Limit | Value | Mitigation |
|-------|-------|------------|
| Max DB size | 10GB (paid) | Monitor usage |
| Max row size | 2MB | Keep JSON payloads bounded |
| Max columns | 100 | Well under limit |
| Max indexes | 50 per table | Selective indexing |
| Transactions | Durable Objects needed for complex | Keep transactions simple |
| Read/write units | Metered | Batch operations |

### Query Patterns

Avoid:
- Full table scans (use indexes)
- Large JSON payloads in queries
- Unbounded SELECT * (paginate)

Prefer:
- Indexed lookups
- Bounded result sets
- Incremental pagination

---

## R2 Constraints and Limits

| Limit | Value | Notes |
|-------|-------|-------|
| Max object size | 5GB | Well above audio needs |
| Max bucket size | Unlimited | - |
| Storage class | Standard | - |
| Multipart min | 5MB parts | Use for large uploads |

### Access Patterns

- Read: Presigned URLs or streaming
- Write: Direct upload via presigned URL
- Delete: Server-side via API

---

## Security Considerations

### D1

- Row-level security via `user_id` checks in queries
- No raw user input in SQL (parameterized queries only)
- Sensitive data (tokens) not stored in D1 (use secrets manager)

### R2

- Private bucket (no public access)
- Access via authenticated API only
- Presigned URLs for direct download (time-limited)
- User can only access own blobs (`user_id` in path)

---

## References

- [docs/VAULT_V3.md](../VAULT_V3.md) - Legacy vault schema
- [docs/BLOBS.md](../BLOBS.md) - Legacy blob architecture
- [docs/SYNC.md](../SYNC.md) - Legacy sync system
- [Cloudflare D1 Limits](https://developers.cloudflare.com/d1/platform/limits/)
- [Cloudflare R2 Limits](https://developers.cloudflare.com/r2/platform/limits/)

