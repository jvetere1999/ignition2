# Architecture: Stateless Backend/Frontend Sync

**Date:** 2026-01-10  
**Status:** IN PROGRESS - ISSUES IDENTIFIED  
**Source:** Consolidated from `agent/BACKEND_FRONTEND_SPLIT_AUDIT.md` and `agent/STATELESS_SYNC_VALIDATION.md`

## Executive Summary

The backend/frontend split follows a **distributed stateless paradigm**:
- ✅ Backend handles ALL business logic
- ✅ Frontend is rendering + user input only
- ⚠️ ISSUES FOUND: Several stateful/computational patterns still on frontend (see [Issues & TODOs](./ISSUES_AND_TODOS.md#issue-1-server-side-auth-checks-causing-redirect-loop))

---

## Correct Stateless Pattern

### The Ideal Flow
```
User Input
    ↓
Frontend (render only) → collect input
    ↓
Send input to backend API
    ↓
Backend (process all logic)
    → Calculate results
    → Store state in database
    → Apply business rules
    ↓
Send result to frontend
    ↓
Frontend (render result)
```

### Anti-Pattern (❌ Don't Do This)
```
Frontend:
  - Calculate, filter, sort
  - Cache results in state
  - Store state in localStorage
  - Make decisions based on computed data
```

---

## API Client Layer Audit

### ✅ Status: CORRECT

All API clients properly delegate to backend with no calculation/filtering:

| File | Status | Evidence |
|------|--------|----------|
| `app/frontend/src/lib/api/client.ts` | ✅ | Base client - minimal, delegation only |
| `app/frontend/src/lib/api/focus.ts` | ✅ | GET/POST/PUT, no filtering or calculation |
| `app/frontend/src/lib/api/quests.ts` | ✅ | Wrapper around `/api/quests`, returns raw data |
| `app/frontend/src/lib/api/today.ts` | ✅ | Delegates to `/api/today` endpoint |
| `app/frontend/src/lib/api/ideas.ts` | ✅ | CRUD operations, no business logic |
| `app/frontend/src/lib/api/wins.ts` | ✅ | Simple GET/POST, no filtering |

---

## Component Layer Audit

### ✅ Status: MOSTLY CORRECT

Component patterns generally follow stateless principles:

**Correct Pattern:**
```typescript
// ✅ CORRECT
function FocusCarousel({ focusId }: Props) {
  const { focus } = useFocus(focusId);
  
  if (!focus) return <Loading />;
  return <FocusDisplay focus={focus} />;
}
```

**Anti-Pattern (Found & Needs Fixing):**
```typescript
// ❌ WRONG - frontend calculating business logic
function QuestList() {
  const [quests, setQuests] = useState([]);
  
  useEffect(() => {
    // ❌ Frontend filtering
    const completed = quests.filter(q => q.completed);
    const filtered = completed.sort((a, b) => b.dueDate - a.dueDate);
    setQuests(filtered);
  }, [quests]);
  
  return <ul>{filtered.map(...)}</ul>;
}
```

**Correct Version:**
```typescript
// ✅ CORRECT
function QuestList() {
  // Backend handles filtering, sorting, ordering
  const { quests } = useQuests({ sortBy: 'dueDate', filter: 'completed' });
  return <ul>{quests.map(...)}</ul>;
}
```

---

## State Management Audit

### ✅ localStorage Usage: CORRECT

**Where localStorage IS appropriate:**
- User preferences (theme, language)
- UI state (sidebar collapsed, modal open)
- Temporary form state (before submission)

**Files audited:**
```
✅ app/frontend/src/lib/hooks/useLocalStorage.ts - Only UI state
✅ app/frontend/src/lib/hooks/useTheme.ts - Theme preference only
✅ All form components - Local state only, submitted to backend
```

### ❌ ANTI-PATTERN: Business Data in localStorage

**Never cache:**
- User profile data (fetch from backend)
- Quest/idea/win data (fetch from backend)
- Computed results (backend returns pre-computed)
- Permission/role data (verify on backend)

---

## Database Access Audit

### ✅ Backend Code: CLEAN

All direct database access is in backend:
```
app/backend/crates/api/src/db/
    ├── models.rs (types)
    ├── repos.rs (database operations)
    └── migrations/ (schema)
```

### ⚠️ Frontend Code: ISSUES FOUND

See [Issues & TODOs: Frontend Database Code](./ISSUES_AND_TODOS.md#issue-2-frontend-database-code-in-deprecated-location) for details and action items.

---

## Middleware & Route Protection

### ✅ Middleware: IMPLEMENTED CORRECTLY

**Location:** `app/frontend/src/middleware.ts`

**What it does:**
1. Validates session with backend before rendering
2. Checks if user is authenticated
3. Redirects unauthenticated requests to signin
4. Works for all protected routes

**Pattern:**
```typescript
// ✅ CORRECT
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  if (isProtectedRoute(pathname)) {
    const session = await validateSession();
    if (!session) {
      return redirect('/auth/signin');
    }
  }
  
  return NextResponse.next();
}
```

### ⚠️ Page Components: INCORRECT AUTH CHECKS

See [Issues & TODOs: Server-Side Auth Checks](./ISSUES_AND_TODOS.md#issue-1-server-side-auth-checks-causing-redirect-loop) for details.

---

## Client Component Data Fetching

### ✅ Pattern: CORRECT

**Hooks for data:**
```typescript
// ✅ CORRECT
function MyComponent() {
  const { data, loading, error } = useFocus(focusId);
  
  if (loading) return <Loading />;
  if (error) return <Error />;
  
  return <Display data={data} />;
}
```

**Never:**
- Fetch in useEffect with manual state management
- Store fetched data in localStorage
- Compute business logic from fetched data
- Filter/sort fetched data (backend does this)

---

## API Endpoint Alignment

### Backend Routes
```
GET    /api/today              → Today view data
GET    /api/focus/:id          → Focus detail
GET    /api/quests             → Quest list
POST   /api/quests             → Create quest
PUT    /api/quests/:id         → Update quest
DELETE /api/quests/:id         → Delete quest
GET    /api/ideas              → Ideas list
GET    /api/wins               → Wins list
POST   /api/admin/status       → Admin check
POST   /api/admin/claim        → Claim admin
```

### Frontend API Clients
```
✅ app/frontend/src/lib/api/client.ts     → Base HTTP client
✅ app/frontend/src/lib/api/focus.ts      → Focus endpoints
✅ app/frontend/src/lib/api/quests.ts     → Quest endpoints
✅ app/frontend/src/lib/api/today.ts      → Today endpoint
✅ app/frontend/src/lib/api/ideas.ts      → Ideas endpoints
✅ app/frontend/src/lib/api/wins.ts       → Wins endpoints
✅ app/frontend/src/lib/api/admin.ts      → Admin endpoints
```

**Verification:** Each client wraps backend endpoint with same URL path and parameters.

---

## Data Flow Examples

### Example 1: Create New Quest (Correct)
```
User fills out quest form
    ↓
Frontend collects: { title, description, dueDate }
    ↓
Frontend: POST /api/quests { title, description, dueDate }
    ↓
Backend:
    - Validates input
    - Stores in database
    - Creates audit log entry
    - Returns created quest with ID
    ↓
Frontend: Adds quest to list UI
```

### Example 2: View Completed Quests (Correct)
```
User clicks "Show completed"
    ↓
Frontend: GET /api/quests?completed=true&sort=dueDate
    ↓
Backend:
    - Queries database
    - Filters for completed=true
    - Sorts by dueDate
    - Returns pre-sorted array
    ↓
Frontend: Renders returned array (no additional filtering)
```

### Example 3: User Profile (Correct)
```
User navigates to profile
    ↓
Frontend: GET /api/auth/session (via middleware/useAuth hook)
    ↓
Backend:
    - Validates session token
    - Queries user record
    - Returns user data
    ↓
Frontend: Renders user data from response
    ↓
Never stored in localStorage (fetched fresh each load)
```

---

## Testing Checklist

### Stateless Validation Tests
- [ ] No business logic calculations in components
- [ ] No filtering/sorting in frontend (all in backend)
- [ ] All data queries go through API clients
- [ ] No localStorage usage for business data
- [ ] Middleware validates auth before page renders
- [ ] Page components don't check auth (middleware does)
- [ ] No hardcoded data processing in components

### Integration Tests
- [ ] Quest creation: backend stores, frontend shows
- [ ] Quest update: backend validates, frontend updates
- [ ] Quest deletion: backend removes, frontend syncs
- [ ] Filter quests: backend filters, frontend renders
- [ ] Sort quests: backend sorts, frontend displays
- [ ] User profile: backend returns, frontend displays
- [ ] Admin status: backend verifies, frontend renders

---

## Performance Implications

### ✅ Advantages of Stateless Approach
- Single source of truth (backend database)
- Consistent business rules across all clients
- Easy to add new clients (web, mobile, CLI)
- Backend can optimize queries
- No stale data conflicts

### ⚠️ Disadvantages to Manage
- More API calls (mitigate with caching/pagination)
- Slight latency for every interaction
- Bandwidth usage for data transfer
- Backend must handle load efficiently

### Optimization Strategies
- Backend caching for read-heavy endpoints
- Pagination for large datasets
- GraphQL for precise data fetching (future)
- Session refetch on demand (not on every action)
- Optimistic UI updates (with backend sync)

---

## Related Documentation
- [Authentication & Cross-Domain Session](./authentication.md)
- [Outstanding Issues & TODOs](./ISSUES_AND_TODOS.md)
- [Admin System Implementation](./admin-system.md)
