# ACTION-005: DAW File Tracking - Implementation Guide

**Priority:** Tier 2 - Foundation Feature  
**Effort Estimate:** 8-10 hours  
**Blocked By:** Tier 1 deployment (needed for testing)  
**Blocking:** None (can develop in parallel with ACTION-006)  

---

## Feature Overview

**DAW File Tracking** enables the system to track when users work with external files (attachments, documents, media) - creating a comprehensive activity log showing:
- File upload/download events
- Access patterns
- Modification timestamps
- Associated content (which idea/journal/infobase references the file)
- Privacy mode classification (private files tracked separately)

**Purpose:** Foundation for usage analytics, file lifecycle management, and privacy audit trails.

---

## Implementation Scope

### Backend Components Needed

**1. DAW Models (File Tracking Data Types)**
- File: `app/backend/crates/api/src/db/daw_models.rs`
- Structures:
  - `FileMetadata` - File properties (size, mime type, hash, path)
  - `FileAccessLog` - Individual access event (timestamp, action, user_id)
  - `FileTrackingPreferences` - User tracking preferences
  - `UpdateFileTrackingRequest` - Settings update request
- Size estimate: ~100 lines

**2. DAW Repository (File Operations CRUD)**
- File: `app/backend/crates/api/src/db/daw_repos.rs`
- Methods:
  - `log_file_access(user_id, file_id, action, privacy_mode)` - Record access
  - `get_file_metadata(file_id)` - Fetch file info
  - `get_access_logs(user_id, filters?)` - Query access history
  - `update_tracking_preferences(user_id, prefs)` - Settings
  - `get_associated_content(file_id)` - Find linked ideas/journal/infobase
  - `delete_expired_logs(retention_days)` - Cleanup per retention policy
- Size estimate: ~150 lines

**3. DAW Routes (File Tracking API)**
- File: `app/backend/crates/api/src/routes/daw.rs`
- Endpoints:
  - `GET /api/daw/files` - List tracked files
  - `GET /api/daw/files/{file_id}` - File details + access logs
  - `POST /api/daw/files/{file_id}/access` - Log access event
  - `GET /api/daw/preferences` - Get tracking settings
  - `POST /api/daw/preferences` - Update tracking settings
- Size estimate: ~120 lines

**4. Database Migration (File Tracking Schema)**
- File: `app/database/migrations/0047_daw_file_tracking.sql`
- Tables:
  - `file_metadata` - File registry with hashes, sizes, mime types
  - `file_access_log` - Access event log (timestamps, actions, user_id)
  - `file_tracking_preferences` - User settings (enable/disable, retention)
  - `file_content_associations` - Links files to ideas/journal/infobase
- Indexes: Optimize for timestamp queries, user_id lookups
- Size estimate: ~100 lines

### Frontend Components

**1. File Access Dashboard**
- File: `app/frontend/src/components/daw/FileAccessDashboard.tsx`
- Displays:
  - Recent file access history (table: filename, access time, action, privacy mode)
  - File statistics (total files, total accesses, private vs standard)
  - Retention policy settings
- Size estimate: ~120 lines

**2. File Access Analytics**
- File: `app/frontend/src/components/daw/FileAccessAnalytics.tsx`
- Displays:
  - Timeline of file access patterns
  - Most accessed files
  - Access type breakdown (upload/download/view)
  - Privacy mode distribution
- Size estimate: ~100 lines

**3. File Tracking Settings**
- File: `app/frontend/src/components/settings/FileTrackingSettings.tsx`
- Features:
  - Enable/disable file tracking
  - Set retention periods (0-365 days)
  - Choose what actions to track (upload, download, view, modify)
  - Filter options (privacy mode, date range)
- Size estimate: ~100 lines

### Tests

**1. E2E Tests**
- File: `tests/daw-tracking.spec.ts`
- Test coverage (14+ tests):
  - File access logging
  - API response validation
  - Retention policy enforcement
  - Privacy mode filtering
  - Associated content linking
  - Analytics calculations
- Size estimate: ~350 lines

---

## Integration Points

### Module Integration
```
1. app/backend/crates/api/src/db/mod.rs
   + pub mod daw_models;
   + pub mod daw_repos;

2. app/backend/crates/api/src/routes/mod.rs
   + pub mod daw;

3. app/backend/crates/api/src/routes/api.rs
   + .nest("/daw", super::daw::router())
```

### Database Migration
```
Migration 0047_daw_file_tracking.sql:
  - CREATE TABLE file_metadata
  - CREATE TABLE file_access_log
  - CREATE TABLE file_tracking_preferences
  - CREATE TABLE file_content_associations
  - CREATE INDEXES for performance
```

### Frontend Integration
```
1. Settings page: Add "File Tracking" section
   - Include: FileTrackingSettings component

2. Dashboard: Add "File Activity" widget
   - Include: FileAccessDashboard component

3. Analytics page: Add file access analytics
   - Include: FileAccessAnalytics component
```

---

## Implementation Checklist

### Phase 1: Backend Models & Database (2-3 hours)
- [ ] Create `daw_models.rs` with all data types
- [ ] Create `daw_repos.rs` with CRUD methods
- [ ] Create `0047_daw_file_tracking.sql` migration
- [ ] Module integration (db/mod.rs, routes/mod.rs, routes/api.rs)
- [ ] Backend compiles without errors
- [ ] Review database schema for normalization

### Phase 2: API Routes (1-2 hours)
- [ ] Create `routes/daw.rs` with endpoints
- [ ] Implement GET /api/daw/files
- [ ] Implement GET /api/daw/files/{file_id}
- [ ] Implement POST /api/daw/files/{file_id}/access
- [ ] Implement GET/POST /api/daw/preferences
- [ ] Validation for all inputs
- [ ] Error handling for edge cases

### Phase 3: Frontend Components (2-3 hours)
- [ ] Create FileAccessDashboard component
- [ ] Create FileAccessAnalytics component
- [ ] Create FileTrackingSettings component
- [ ] All components fully typed (TypeScript strict)
- [ ] API integration with fetch calls
- [ ] Loading/error state handling

### Phase 4: Testing (1-2 hours)
- [ ] Create `tests/daw-tracking.spec.ts`
- [ ] Write 14+ comprehensive E2E tests
- [ ] Test all endpoints
- [ ] Test filtering and analytics
- [ ] Verify pagination and limits

---

## Key Design Decisions

### Privacy Mode Integration
- All file access logs inherit privacy mode from associated content
- Private files tracked separately, shorter retention by default
- Audit trail maintained for compliance

### Performance Optimization
- Indexes on (user_id, created_at) for fast history queries
- Indexes on (file_id) for associated content lookups
- Partitioning by date for large access logs

### Data Retention
- Private file logs: Default 30 days (configurable)
- Standard file logs: Default 365 days (configurable)
- Automatic cleanup job (background task for post-Tier-2)

### Analytics Calculations
- Aggregated on-demand (via GET endpoints)
- Cache results for 1 hour to avoid recomputation
- Include time-series data for trends

---

## Example Implementation Details

### File Metadata Structure
```rust
pub struct FileMetadata {
    pub id: Uuid,
    pub user_id: Uuid,
    pub filename: String,
    pub file_size_bytes: i64,
    pub mime_type: String,
    pub file_hash: String,
    pub storage_path: String,
    pub privacy_mode: PrivacyMode,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
```

### File Access Log Structure
```rust
pub struct FileAccessLog {
    pub id: Uuid,
    pub file_id: Uuid,
    pub user_id: Uuid,
    pub action: AccessAction, // Upload, Download, View, Modify
    pub privacy_mode: PrivacyMode,
    pub created_at: DateTime<Utc>,
}
```

### API Response
```rust
pub struct FileAccessListResponse {
    pub total: i32,
    pub access_logs: Vec<FileAccessLogResponse>,
    pub pagination: PaginationInfo,
}
```

---

## Testing Strategy

### Unit Tests (Repository Methods)
- [ ] log_file_access with various actions
- [ ] Filter by privacy mode
- [ ] Filter by date range
- [ ] Associated content lookup
- [ ] Retention policy enforcement

### Integration Tests
- [ ] Create file → Log access → Query results
- [ ] Multiple access events per file
- [ ] Cross-content associations
- [ ] Analytics aggregation

### E2E Tests (Playwright)
- [ ] API endpoints return correct status codes
- [ ] Response validation (all fields present)
- [ ] Pagination works correctly
- [ ] Filtering by privacy mode, date, action
- [ ] Settings persistence across sessions
- [ ] Privacy mode filtering consistency

---

## Validation Requirements

✅ **Code Quality:**
- All types have serde/sqlx derives
- No compile-time macros (use runtime binding)
- Trust boundary markers for security documentation
- TypeScript strict mode compliance

✅ **Database:**
- Proper FK/PK relationships
- Indexes on query columns
- Retention policies defined
- Privacy mode inheritance

✅ **Testing:**
- All endpoints tested
- Edge cases covered
- Error cases validated
- Analytics calculations verified

---

## Dependencies

**Backend:**
- Axum (routing)
- SQLx (database)
- Serde (serialization)
- Uuid, Chrono, DateTime

**Frontend:**
- React 19.2.3
- TypeScript strict mode
- Lucide React (icons)
- Tailwind CSS

**Database:**
- PostgreSQL 14+
- Follows naming conventions from existing tables

---

## Next Steps (Execution Order)

1. ✅ Complete ACTION-004 (done)
2. 🟡 Deploy Tier 1 to production
3. 🟡 Execute E2E tests (verify working)
4. **🔴 Start ACTION-005 backend (this)**
   - Begin with models & database migration
   - Then routes & API endpoints
5. Implement frontend components
6. Write E2E tests
7. Deploy Tier 2

---

## Quick Commands (When Ready)

```bash
# After Tier 1 deployment, start development:

# Create backend models
touch app/backend/crates/api/src/db/daw_models.rs

# Create repository
touch app/backend/crates/api/src/db/daw_repos.rs

# Create routes
touch app/backend/crates/api/src/routes/daw.rs

# Create migration
touch app/database/migrations/0047_daw_file_tracking.sql

# Test compilation
cd app/backend && cargo build

# After completion, run tests
cd tests && playwright test daw-tracking.spec.ts
```

---

## Estimated Timeline

| Phase | Time | Status |
|-------|------|--------|
| Backend Models & DB | 2-3h | ⏳ Queued |
| API Routes | 1-2h | ⏳ Queued |
| Frontend Components | 2-3h | ⏳ Queued |
| Testing | 1-2h | ⏳ Queued |
| Total | 8-10h | ⏳ Queued |

**Start:** After Tier 1 deployment verified  
**Expected Completion:** Same day (8-10 hours)  
**Deployment:** Tier 2 combined with ACTION-006 (24-48 hours)

---

**Ready to begin? Confirm Tier 1 deployment is ready, then start ACTION-005 backend implementation.**
