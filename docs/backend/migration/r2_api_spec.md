"R2/Blob Storage API specification for the Rust backend."

# R2 Blob Storage API Specification

**Date:** January 6, 2026  
**Branch:** `refactor/stack-split`  
**Phase:** R2 Integration (Phase 14)  
**Purpose:** Document the backend R2 storage API

---

## Overview

The R2 storage API provides secure, backend-only access to Cloudflare R2 (S3-compatible) storage. Frontend and admin UIs never receive R2 credentials - all access is through backend APIs.

---

## Security Model

### IDOR Prevention

All blob operations use prefix-based isolation:

```
Key Pattern: {userId}/{category}/{blobId}.{extension}
Example: 550e8400-e29b-41d4-a716-446655440000/audio/a1b2c3d4-e5f6-7890-abcd-ef1234567890.mp3
```

**Guarantees:**
- User can only access blobs under their own prefix
- Blob lookup searches only within the authenticated user's prefix
- Even with valid blob ID, access is denied if not owned by user

### Credential Isolation

| Component | Has R2 Credentials |
|-----------|-------------------|
| Backend | ✅ Yes |
| Frontend | ❌ No |
| Admin UI | ❌ No |
| Browser | ❌ No (uses signed URLs) |

### Signed URLs

For direct browser access (uploads/downloads), short-lived signed URLs are generated:

| Operation | Expiry | Method |
|-----------|--------|--------|
| Download | 1 hour | GET |
| Upload | 5 minutes | PUT |

---

## API Endpoints

### Base URL

```
https://api.ecent.online/api/blobs
```

---

### POST /api/blobs/upload

Upload a file via multipart form data (backend proxies to R2).

**Request:**
```http
POST /api/blobs/upload
Content-Type: multipart/form-data
Cookie: session=<token>
Origin: https://ignition.ecent.online

--boundary
Content-Disposition: form-data; name="file"; filename="track.mp3"
Content-Type: audio/mpeg

<binary data>
--boundary
Content-Disposition: form-data; name="metadata"

{"artist": "Example", "album": "Test"}
--boundary--
```

**Response (200 OK):**
```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "key": "user-id/audio/a1b2c3d4-e5f6-7890-abcd-ef1234567890.mp3",
  "size_bytes": 5242880,
  "mime_type": "audio/mpeg",
  "category": "audio"
}
```

**Errors:**
- `400 Bad Request` - Invalid MIME type, file too large, no file provided
- `401 Unauthorized` - Missing or invalid session
- `403 Forbidden` - CSRF check failed

---

### POST /api/blobs/upload-url

Get a signed URL for direct browser upload (no backend proxy).

**Request:**
```http
POST /api/blobs/upload-url
Content-Type: application/json
Cookie: session=<token>
Origin: https://ignition.ecent.online

{
  "filename": "track.mp3",
  "mime_type": "audio/mpeg"
}
```

**Response (200 OK):**
```json
{
  "url": "https://bucket.r2.cloudflarestorage.com/...?X-Amz-Signature=...",
  "expires_at": "2026-01-06T13:05:00Z",
  "method": "PUT"
}
```

**Usage:**
```javascript
const { url, method } = await fetch('/api/blobs/upload-url', {
  method: 'POST',
  body: JSON.stringify({ filename: 'track.mp3', mime_type: 'audio/mpeg' })
}).then(r => r.json());

await fetch(url, {
  method: method,
  body: fileData,
  headers: { 'Content-Type': 'audio/mpeg' }
});
```

**Errors:**
- `400 Bad Request` - Invalid MIME type

---

### GET /api/blobs/:id

Download a blob by ID.

**Request:**
```http
GET /api/blobs/a1b2c3d4-e5f6-7890-abcd-ef1234567890
Cookie: session=<token>
```

**Response (200 OK):**
```http
HTTP/1.1 200 OK
Content-Type: audio/mpeg
Content-Length: 5242880

<binary data>
```

**Errors:**
- `404 Not Found` - Blob not found or not owned by user

---

### GET /api/blobs/:id/info

Get blob metadata without downloading content.

**Request:**
```http
GET /api/blobs/a1b2c3d4-e5f6-7890-abcd-ef1234567890/info
Cookie: session=<token>
```

**Response (200 OK):**
```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "key": "user-id/audio/a1b2c3d4-e5f6-7890-abcd-ef1234567890.mp3",
  "size_bytes": 5242880,
  "mime_type": "audio/mpeg",
  "category": "audio",
  "filename": "track.mp3",
  "uploaded_at": "2026-01-06T12:00:00Z",
  "etag": "\"abc123\""
}
```

---

### DELETE /api/blobs/:id

Delete a blob by ID.

**Request:**
```http
DELETE /api/blobs/a1b2c3d4-e5f6-7890-abcd-ef1234567890
Cookie: session=<token>
Origin: https://ignition.ecent.online
```

**Response (200 OK):**
```json
{
  "success": true
}
```

**Errors:**
- `404 Not Found` - Blob not found or not owned by user

---

### GET /api/blobs/:id/download-url

Get a signed URL for direct browser download.

**Request:**
```http
GET /api/blobs/a1b2c3d4-e5f6-7890-abcd-ef1234567890/download-url
Cookie: session=<token>
```

**Response (200 OK):**
```json
{
  "url": "https://bucket.r2.cloudflarestorage.com/...?X-Amz-Signature=...",
  "expires_at": "2026-01-06T13:00:00Z",
  "method": "GET"
}
```

---

### GET /api/blobs

List user's blobs.

**Request:**
```http
GET /api/blobs?category=audio
Cookie: session=<token>
```

**Query Parameters:**
| Parameter | Required | Description |
|-----------|----------|-------------|
| category | No | Filter by category (audio, images, exports, other) |

**Response (200 OK):**
```json
[
  {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "key": "user-id/audio/a1b2c3d4-e5f6-7890-abcd-ef1234567890.mp3",
    "size_bytes": 5242880,
    "mime_type": "unknown",
    "category": "audio",
    "filename": "unknown",
    "uploaded_at": "2026-01-06T12:00:00Z",
    "etag": "\"abc123\""
  }
]
```

---

### GET /api/blobs/usage

Get storage usage for user.

**Request:**
```http
GET /api/blobs/usage
Cookie: session=<token>
```

**Response (200 OK):**
```json
{
  "total_bytes": 52428800,
  "formatted": "50.00 MB"
}
```

---

## Allowed MIME Types

| Category | MIME Types |
|----------|------------|
| Audio | audio/mpeg, audio/mp3, audio/wav, audio/wave, audio/x-wav, audio/ogg, audio/flac, audio/aac, audio/m4a, audio/x-m4a |
| Images | image/jpeg, image/png, image/gif, image/webp, image/svg+xml |
| Documents | application/pdf, application/json, text/plain |
| Archives | application/zip, application/x-zip-compressed |

---

## File Size Limits

| Category | Max Size |
|----------|----------|
| Audio | 50 MB |
| Images | 10 MB |
| Other | 100 MB |

---

## Categories

| Category | Description |
|----------|-------------|
| audio | Reference tracks, uploaded audio |
| images | User avatars, content images |
| exports | User data exports (zip) |
| other | PDFs, JSON, text, misc |

---

## Error Responses

All errors follow a consistent format:

```json
{
  "error": {
    "type": "validation_error",
    "message": "MIME type application/x-executable not allowed"
  }
}
```

| Status | Type | Description |
|--------|------|-------------|
| 400 | bad_request | Invalid input |
| 400 | validation_error | Validation failed (MIME, size) |
| 401 | unauthorized | Missing or invalid session |
| 403 | forbidden | CSRF check failed |
| 403 | csrf_violation | Origin/Referer not allowed |
| 404 | not_found | Blob not found or not owned |
| 500 | internal_error | Server error |

---

## Implementation Files

| File | Purpose |
|------|---------|
| `storage/mod.rs` | Module exports |
| `storage/types.rs` | Types, constants, validation |
| `storage/client.rs` | S3/R2 client implementation |
| `routes/blobs.rs` | HTTP handlers |

---

## Configuration

Environment variables:

| Variable | Required | Description |
|----------|----------|-------------|
| STORAGE_ENDPOINT | Yes | R2/S3 endpoint URL |
| STORAGE_BUCKET | Yes | Bucket name |
| STORAGE_REGION | No | Region (default: auto) |
| STORAGE_ACCESS_KEY_ID | Yes | S3 access key |
| STORAGE_SECRET_ACCESS_KEY | Yes | S3 secret key |

---

## Testing

### Unit Tests

| Test | Purpose |
|------|---------|
| test_mime_type_validation | Verify MIME allowlist |
| test_file_size_validation | Verify size limits |
| test_blob_key_includes_user_prefix | Verify IDOR prevention |
| test_user_isolation_via_prefix | Verify user separation |
| test_blob_key_parsing | Verify key structure |

### Integration Tests (requires MinIO)

Run with MinIO container:

```bash
docker compose up postgres minio -d
cargo test --package ignition-api
```

---

## References

- [r2_usage_inventory.md](./r2_usage_inventory.md) - Original R2 usage
- [security_model.md](./security_model.md) - Security requirements
- [DECISIONS.md](./DECISIONS.md) - Migration decisions
- [docker-compose.yml](../../app/backend/docker-compose.yml) - MinIO config

