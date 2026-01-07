# R2 Storage Usage Inventory

**Generated:** January 6, 2026  
**Branch:** `refactor/stack-split`  
**Purpose:** Complete inventory of Cloudflare R2 storage usage

---

## Summary

| Metric | Value |
|--------|-------|
| Bucket Name | `ignition-blobs` |
| Binding Name | `BLOBS` |
| Storage Files | `src/lib/storage/*.ts` |
| API Routes Using R2 | 6 |
| Key Pattern | `{userId}/{category}/{uuid}.{ext}` |

---

## R2 Configuration

### Wrangler Binding

**Location:** `wrangler.toml` lines 23-25

```toml
[[r2_buckets]]
binding = "BLOBS"
bucket_name = "ignition-blobs"
```

### TypeScript Binding

**Location:** `src/env.d.ts` line 44

```typescript
export interface CloudflareEnv {
  DB: D1Database;
  BLOBS: R2Bucket;
  CACHE?: KVNamespace;
  ASSETS: Fetcher;
}
```

---

## Storage Library Files

| File | Purpose | Lines | Exports |
|------|---------|-------|---------|
| `src/lib/storage/r2.ts` | Core R2 operations | 324 | uploadBlob, getBlob, deleteBlob, etc. |
| `src/lib/storage/types.ts` | Type definitions | 173 | BlobMetadata, UploadRequest, etc. |
| `src/lib/storage/index.ts` | Barrel export | UNKNOWN | Re-exports all |

---

## Blob Key Structure

**Pattern:** `{userId}/{category}/{uuid}.{extension}`

**Example:** `usr_abc123/audio/550e8400-e29b-41d4-a716-446655440000.mp3`

### Categories

| Category | MIME Types | Use Case |
|----------|------------|----------|
| `audio` | audio/* | Reference tracks, uploaded audio |
| `images` | image/* | User avatars, content images |
| `exports` | application/zip | User data exports |
| `other` | pdf, json, text | Documents, misc |

---

## Storage Functions

### Core Operations

| Function | File | Line | Purpose |
|----------|------|------|---------|
| `uploadBlob` | r2.ts | 52 | Upload file to R2 |
| `getBlob` | r2.ts | 129 | Get blob by full key |
| `getBlobById` | r2.ts | 139 | Get blob by ID (searches categories) |
| `deleteBlob` | r2.ts | 162 | Delete by full key |
| `deleteBlobById` | r2.ts | 170 | Delete by ID (searches categories) |
| `listBlobs` | r2.ts | 210 | List blobs for user |
| `blobExists` | r2.ts | 240 | Check if blob exists |
| `getBlobMetadata` | r2.ts | 251 | Get metadata without content |
| `copyBlob` | r2.ts | 281 | Copy blob to new key |
| `getUserStorageUsage` | r2.ts | 300 | Calculate total storage for user |

### Helper Functions

| Function | File | Line | Purpose |
|----------|------|------|---------|
| `generateBlobKey` | r2.ts | 19 | Generate key from userId/category/ext |
| `parseBlobKey` | r2.ts | 32 | Parse key into components |
| `getCategoryFromMimeType` | types.ts | 43 | Get category from MIME |
| `getExtensionFromMimeType` | types.ts | UNKNOWN | Get file extension |
| `isAllowedMimeType` | types.ts | UNKNOWN | Validate MIME type |
| `validateFileSize` | types.ts | UNKNOWN | Validate file size |

---

## API Routes Using R2

### 1. POST /api/blobs/upload

**File:** `src/app/api/blobs/upload/route.ts`

| Aspect | Value |
|--------|-------|
| Auth | User session required |
| R2 Operation | Write (uploadBlob) |
| Authorization | userId from session attached to key |
| Input | multipart/form-data with file + optional metadata |
| Output | `{ id, key, url, sizeBytes }` |

**Key Security:**
- File stored under user's prefix: `{userId}/...`
- MIME type validated against allowlist
- File size validated

### 2. GET /api/blobs/[id]

**File:** `src/app/api/blobs/[id]/route.ts`

| Aspect | Value |
|--------|-------|
| Auth | User session required |
| R2 Operation | Read (getBlobById) |
| Authorization | Searches only under user's prefix |
| Output | Binary stream with correct Content-Type |

**Key Security:**
- `getBlobById` searches `{userId}/{category}/{blobId}*`
- User can only access their own blobs

### 3. DELETE /api/blobs/[id]

**File:** `src/app/api/blobs/[id]/route.ts`

| Aspect | Value |
|--------|-------|
| Auth | User session required |
| R2 Operation | Delete (deleteBlobById) |
| Authorization | Searches only under user's prefix |
| Output | `{ success: true }` or error |

**Key Security:**
- Same prefix-based isolation as GET

### 4. HEAD /api/blobs/[id]

**File:** `src/app/api/blobs/[id]/route.ts`

| Aspect | Value |
|--------|-------|
| Auth | User session required |
| R2 Operation | Read metadata |
| Authorization | Prefix-based |
| Output | Headers only (Content-Length, Content-Type, ETag) |

### 5. POST /api/reference/upload

**File:** `src/app/api/reference/upload/route.ts`

| Aspect | Value |
|--------|-------|
| Auth | User session required |
| R2 Operation | Write |
| Authorization | userId from session |
| D1 Integration | Creates `reference_tracks` record |
| Output | Track metadata |

**Key Security:**
- R2 key stored in D1 `reference_tracks.r2_key`
- Access controlled via D1 ownership lookup

### 6. GET /api/reference/tracks/[id]/stream

**File:** `src/app/api/reference/tracks/[id]/stream/route.ts`

| Aspect | Value |
|--------|-------|
| Auth | User session required |
| R2 Operation | Read stream |
| Authorization | D1 lookup: `reference_tracks.user_id = session.user.id` |
| Output | Audio stream with byte-range support |

**Key Security:**
- Track ID looked up in D1 first
- Ownership verified before R2 access
- Supports HTTP Range requests for seeking

### 7. GET /api/reference/tracks/[id]/play

**File:** `src/app/api/reference/tracks/[id]/play/route.ts`

| Aspect | Value |
|--------|-------|
| Auth | User session required |
| R2 Operation | Read stream |
| Authorization | D1 ownership lookup |
| Output | Audio stream |

### 8. DELETE /api/reference/tracks/[id]

**File:** `src/app/api/reference/tracks/[id]/route.ts`

| Aspect | Value |
|--------|-------|
| Auth | User session required |
| R2 Operation | Delete |
| D1 Integration | Deletes `reference_tracks` record |
| Authorization | D1 ownership lookup |

---

## Authorization Patterns

### Pattern 1: Prefix-Based (Blobs)

```typescript
// User can only access blobs under their prefix
export async function getBlobById(
  bucket: R2Bucket,
  userId: string,
  blobId: string
): Promise<R2Object | null> {
  const categories = ["audio", "images", "exports", "other"];
  for (const category of categories) {
    const prefix = `${userId}/${category}/${blobId}`;
    const listed = await bucket.list({ prefix, limit: 1 });
    if (listed.objects.length > 0) {
      return bucket.get(listed.objects[0].key);
    }
  }
  return null;
}
```

**Security:** User ID from session is used as prefix, preventing access to other users' files.

### Pattern 2: D1 Ownership Lookup (Reference Tracks)

```typescript
// Check D1 first for ownership
const track = await db.prepare(
  `SELECT r2_key FROM reference_tracks WHERE id = ? AND user_id = ?`
).bind(trackId, session.user.id).first();

if (!track) {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

// Then access R2
const object = await bucket.get(track.r2_key);
```

**Security:** D1 enforces ownership before revealing R2 key.

---

## Allowed MIME Types

**Location:** `src/lib/storage/types.ts` lines 8-33

```typescript
export const ALLOWED_MIME_TYPES = [
  // Audio
  "audio/mpeg", "audio/mp3", "audio/wav", "audio/wave", "audio/x-wav",
  "audio/ogg", "audio/flac", "audio/aac", "audio/m4a", "audio/x-m4a",
  // Images
  "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml",
  // Documents
  "application/pdf", "application/json", "text/plain",
  // Archives
  "application/zip", "application/x-zip-compressed",
];
```

---

## File Size Limits

**Location:** `src/lib/storage/types.ts` (UNKNOWN exact lines)

Expected limits (to verify):
- Audio: ~100MB
## File Size Limits (Confirmed January 6, 2026)

**Location:** `src/lib/storage/types.ts` lines 99-107

| Limit | Value | Constant |
|-------|-------|----------|
| MAX_FILE_SIZE | 100 MB | General uploads |
| MAX_AUDIO_SIZE | 50 MB | Audio files |
| MAX_IMAGE_SIZE | 10 MB | Image files |
| MULTIPART_THRESHOLD | 5 MB | Multipart upload trigger |

**Enforcement:**
- `validateFileSize()` checks per upload
- Returns `{ valid: false, error: "..." }` if exceeded

**Per-User Quotas:** None implemented. No total storage limit per user.

---

## R2 Custom Metadata

**Location:** `src/lib/storage/r2.ts` lines 102-112

```typescript
await bucket.put(key, data, {
  httpMetadata: {
    contentType: request.mimeType,
  },
  customMetadata: {
    userId: request.userId,
    filename: request.filename,
    uploadedAt: new Date().toISOString(),
    metadata: JSON.stringify(request.metadata), // optional
  },
});
```

---

## Security Considerations for Backend Migration

### Current Protections

| Protection | Implementation |
|------------|----------------|
| Auth required | `auth()` check in every route |
| User isolation | Prefix-based or D1 lookup |
| MIME validation | Allowlist check |
| Size limits | Per-type validation |
| No direct R2 URLs | All access through API |

### Target Protections (per copilot-instructions)

| Requirement | Current | Gap |
|-------------|---------|-----|
| Frontend never receives R2 credentials | ✅ Met | None |
| Backend-only R2 access | ✅ Met | None |
| Short-lived signed URLs | ❌ Not implemented | Need to implement |
| Prevent IDOR on downloads | ✅ Prefix/D1 check | None |

### Recommended Improvements

1. **Signed URLs:** Generate short-lived S3-compatible signed URLs for streaming
2. **Audit logging:** Log all R2 access to `admin_audit_log`
3. **Rate limiting:** Limit upload frequency per user
4. **Storage quotas:** Enforce per-user storage limits
5. **Orphan cleanup:** Implement periodic cleanup for unreferenced blobs

---

## Resolved Items (January 6, 2026)

| Item | Resolution | Evidence |
|------|------------|----------|
| File size limits | MAX_FILE=100MB, MAX_AUDIO=50MB, MAX_IMAGE=10MB | `src/lib/storage/types.ts:99-107` |
| Storage quotas | None exist - per-file limits only | `.tmp/storage_quota.log` |
| Orphan blob cleanup | None exists | `.tmp/orphan_cleanup.log` |

## Open Items

| Item | Needs Investigation |
|------|---------------------|
| Error handling for R2 failures | Review error paths |
| User export format | Check export route |



