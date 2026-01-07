"Routing, domains, and URL structure for the split architecture."

# Routing and Domains

**Date:** January 6, 2026  
**Branch:** `refactor/stack-split`  
**Phase:** 07 - Structure Plan  
**Source:** api_endpoint_inventory.md, auth_inventory.md, copilot-instructions.md

---

## Domain Configuration

### Production Domains

| Service | Domain | Purpose |
|---------|--------|---------|
| Frontend | `ignition.ecent.online` | Main user-facing application |
| Admin Console | `admin.ignition.ecent.online` | Admin-only dashboard |
| Backend API | `api.ecent.online` | All business logic, auth, data |

### Local Development

| Service | URL | Notes |
|---------|-----|-------|
| Frontend | `http://localhost:3000` | Next.js dev server |
| Admin Console | `http://localhost:3001` | Separate port |
| Backend API | `http://localhost:8080` | Rust/Axum server |
| PostgreSQL | `localhost:5432` | Local DB |

---

## CORS Configuration (Backend)

Per DEC-002 (Origin verification), the backend must configure CORS:

```rust
// Allowed origins for CORS
const ALLOWED_ORIGINS: &[&str] = &[
    // Production
    "https://ignition.ecent.online",
    "https://admin.ignition.ecent.online",
    // Local development (only when NODE_ENV=development)
    "http://localhost:3000",
    "http://localhost:3001",
];
```

### CORS Headers

| Header | Value |
|--------|-------|
| `Access-Control-Allow-Origin` | From allowlist (not `*`) |
| `Access-Control-Allow-Credentials` | `true` |
| `Access-Control-Allow-Methods` | `GET, POST, PUT, PATCH, DELETE, OPTIONS` |
| `Access-Control-Allow-Headers` | `Content-Type, Authorization, X-Request-ID` |
| `Access-Control-Max-Age` | `86400` (1 day) |

---

## Backend API Routes

### Route Prefix Mapping

| Current (Next.js) | Target (Rust) | Notes |
|-------------------|---------------|-------|
| `/api/auth/*` | `/auth/*` | OAuth callbacks, session management |
| `/api/admin/*` | `/admin/*` | Admin-only operations |
| `/api/blobs/*` | `/blobs/*` | R2 blob storage |
| `/api/focus/*` | `/focus/*` | Focus sessions |
| `/api/habits/*` | `/habits/*` | Habits CRUD |
| `/api/goals/*` | `/goals/*` | Goals CRUD |
| `/api/quests/*` | `/quests/*` | Quests and progress |
| `/api/calendar/*` | `/calendar/*` | Calendar events |
| `/api/daily-plan/*` | `/daily-plan/*` | Daily planning |
| `/api/exercise/*` | `/exercise/*` | Exercise/fitness |
| `/api/programs/*` | `/programs/*` | Training programs |
| `/api/books/*` | `/books/*` | Book tracking |
| `/api/learn/*` | `/learn/*` | Learning content |
| `/api/market/*` | `/market/*` | Market items |
| `/api/gamification/*` | `/gamification/*` | Gamification data |
| `/api/onboarding/*` | `/onboarding/*` | Onboarding flow |
| `/api/infobase/*` | `/infobase/*` | Knowledge base |
| `/api/ideas/*` | `/ideas/*` | Ideas capture |
| `/api/analysis/*` | `/analysis/*` | Track analysis |
| `/api/feedback/*` | `/feedback/*` | User feedback |
| `/api/reference/*` | `/reference/*` | Reference tracks |
| `/api/user/*` | `/user/*` | User data management |

---

## Auth Routes (Detailed)

### OAuth Flow

| Route | Method | Purpose |
|-------|--------|---------|
| `/auth/login` | GET | Redirect to OAuth provider |
| `/auth/login/google` | GET | Initiate Google OAuth |
| `/auth/login/azure` | GET | Initiate Azure OAuth |
| `/auth/callback/google` | GET | Google OAuth callback |
| `/auth/callback/azure` | GET | Azure OAuth callback |
| `/auth/logout` | POST | End session |
| `/auth/session` | GET | Get current session |
| `/auth/accept-tos` | POST | Accept terms of service |
| `/auth/verify-age` | POST | Age verification |

### OAuth Redirect URIs (Production)

| Provider | Redirect URI |
|----------|--------------|
| Google | `https://api.ecent.online/auth/callback/google` |
| Azure | `https://api.ecent.online/auth/callback/azure` |

### OAuth Redirect URIs (Development)

| Provider | Redirect URI |
|----------|--------------|
| Google | `http://localhost:8080/auth/callback/google` |
| Azure | `http://localhost:8080/auth/callback/azure` |

---

## Admin Routes (Detailed)

All admin routes require `role = admin` (DEC-004=B: DB-backed roles).

| Route | Method | Purpose |
|-------|--------|---------|
| `/admin/backup` | GET | Export all data |
| `/admin/restore` | POST | Import data backup |
| `/admin/users` | GET | List all users |
| `/admin/users` | DELETE | Delete user |
| `/admin/cleanup-users` | GET | List cleanup candidates |
| `/admin/cleanup-users` | DELETE | Delete inactive users |
| `/admin/stats` | GET | Usage statistics |
| `/admin/quests` | GET, PATCH | Manage universal quests |
| `/admin/skills` | GET, PATCH, DELETE | Manage skill definitions |
| `/admin/content` | GET, POST, DELETE | Manage content |
| `/admin/feedback` | GET, PATCH | Review user feedback |
| `/admin/db-health` | GET, DELETE | Database health check |

---

## Frontend Routing

### Main Frontend (`app/frontend/`)

| Route Pattern | Page | Auth Required |
|---------------|------|---------------|
| `/` | Landing/home | No |
| `/auth/signin` | Sign in | No |
| `/auth/error` | Auth error | No |
| `/today` | Today page | Yes |
| `/focus` | Focus timer | Yes |
| `/quests` | Quest list | Yes |
| `/progress` | Progress view | Yes |
| `/habits` | Habits | Yes |
| `/goals` | Goals | Yes |
| `/exercise` | Exercise | Yes |
| `/stats` | Statistics | Yes |
| `/market` | Market | Yes |
| `/settings` | Settings | Yes |
| `/about`, `/contact`, `/help`, `/privacy`, `/terms` | Static pages | No |

### Admin Console (`app/admin/`)

| Route Pattern | Page | Auth Required |
|---------------|------|---------------|
| `/` | Dashboard | Admin |
| `/users` | User management | Admin |
| `/stats` | Statistics | Admin |
| `/quests` | Quest management | Admin |
| `/skills` | Skill management | Admin |
| `/content` | Content management | Admin |
| `/feedback` | Feedback review | Admin |
| `/backup` | Backup/restore | Admin |

---

## API Client Configuration (Frontend)

```typescript
// app/frontend/src/lib/api/client.ts

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.ecent.online';

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include', // Always include cookies
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new ApiError(response);
  }

  return response.json();
}
```

---

## Cookie Domain Strategy

Per copilot-instructions (Security Model):

| Cookie | Domain | Attributes |
|--------|--------|------------|
| Session | `ecent.online` | `SameSite=None; Secure; HttpOnly` |

This allows cookies to be sent from:
- `ignition.ecent.online` → `api.ecent.online`
- `admin.ignition.ecent.online` → `api.ecent.online`

---

## Health Check Endpoints

| Route | Method | Purpose |
|-------|--------|---------|
| `/health` | GET | Liveness probe |
| `/health/ready` | GET | Readiness probe |
| `/health/db` | GET | Database connectivity |

---

## References

- [target_structure.md](./target_structure.md) - Overall structure
- [security_model.md](./security_model.md) - Security implementation
- [api_endpoint_inventory.md](./api_endpoint_inventory.md) - Current API routes
- [auth_inventory.md](./auth_inventory.md) - Current auth implementation

