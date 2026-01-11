# Error Notification System - Quick Reference

## The System Is Now Active ✅

Every REST API error from the website now displays as a notification in the bottom-right corner with:
- Error message
- Endpoint path (e.g., `GET /api/sync/notifications`)
- HTTP status code
- Expandable details and stack trace
- Timestamp for sequencing

## UI Display

```
╔═══════════════════════════════════════╗
║ ❌ GET /api/endpoint (500): Failed   ║
║    to fetch data                      ║
║    10:30:45 AM                        ║
║ [Details] [Stack Trace]         [✕]  ║
╚═══════════════════════════════════════╝
```

## What's Tracked

| Error Type | Source | What We Log |
|------------|--------|-------------|
| API Errors | Network requests | Endpoint, method, status, response |
| Database | Backend operations | Table, operation type, query |
| Validation | Form inputs | Field names, error messages |
| Unhandled | Exceptions | Stack trace, error message |

## For Users

**Your errors are now visible:**
1. Look for notifications in bottom-right corner
2. Click "View Log" to see all errors in sequence
3. Click on error details to see what failed
4. Screenshot the log to share with support

## For Developers

### See All Errors
```typescript
import { useErrorNotification } from '@/lib/hooks/useErrorNotification';

// In any component
const { getErrorLog, errors } = useErrorNotification();

console.log(getErrorLog()); // Full log as text
console.log(errors);        // Array of error objects
```

### Log API Errors Manually
```typescript
import { logApiError } from '@/lib/logger/errorLogger';

try {
  await apiGet('/api/endpoint');
} catch (error) {
  logApiError(error, {
    endpoint: '/api/endpoint',
    method: 'GET',
    userId: user.id,
    params: { filter: 'active' }
  });
}
```

### Log Database Errors
```typescript
import { logDbError } from '@/lib/logger/errorLogger';

try {
  await db.query('SELECT * FROM users WHERE id = $1', [userId]);
} catch (error) {
  logDbError(error, {
    operation: 'SELECT',
    table: 'users',
    query: 'SELECT * FROM users WHERE id = $1',
    values: [userId]
  });
}
```

### Log Validation Errors
```typescript
import { logValidationError } from '@/lib/logger/errorLogger';

const errors = {
  email: ['Invalid email'],
  password: ['Too short']
};

logValidationError(errors, { formName: 'login' });
```

### Safe API Wrapper
```typescript
import { useSafeApiCall } from '@/lib/hooks/useSafeApiCall';

const { callApi } = useSafeApiCall();

const data = await callApi(
  () => apiGet('/api/endpoint'),
  { endpoint: '/api/endpoint', method: 'GET' }
);

if (!data) {
  // Error was already displayed and logged
}
```

## Error Log Format

Each line shows:
```
[TIMESTAMP] TYPE METHOD ENDPOINT (STATUS): Message
```

Example:
```
[2025-01-11T10:30:45.123Z] ERROR GET /api/sync/notifications (500): column "is_read" does not exist
[2025-01-11T10:30:46.456Z] ERROR POST /api/daily-plan (500): relation "daily_plan_items" does not exist
[2025-01-11T10:30:47.789Z] WARNING GET /api/user (401): Unauthorized
```

## Debugging Workflow

1. **User reports issue**: "The app isn't working"
2. **Ask for error log**: "Can you screenshot the errors?"
3. **Copy log text**: Click "View Log" in notification panel
4. **Analyze**: Look for pattern (same endpoint failing repeatedly)
5. **Find backend code**: Use endpoint path to locate handler
6. **Fix**: Resolve the issue in backend or frontend
7. **Verify**: Test that error no longer appears

## What Changed in Your Code

### No Breaking Changes ✅
- All existing API calls work exactly the same
- All existing error handling still works
- Zero configuration needed

### New Files Added
```
app/frontend/src/
  ├── lib/
  │   ├── hooks/
  │   │   ├── useErrorNotification.ts    (Zustand store)
  │   │   └── useSafeApiCall.ts          (Safe wrappers)
  │   └── logger/
  │       └── errorLogger.ts             (Logging utilities)
  ├── components/ui/
  │   ├── ErrorNotifications.tsx         (UI display)
  │   └── ErrorNotificationInitializer.tsx (Setup)
  └── docs/
      ├── ERROR_NOTIFICATIONS.md         (Full guide)
      └── ERROR_NOTIFICATIONS_IMPLEMENTATION.md (Technical)
```

### Modified Files
- `app/frontend/src/lib/api/client.ts` - Auto-error capture added
- `app/frontend/src/app/layout.tsx` - Components mounted

## Testing the System

### Test 1: Trigger API Error
Go offline or hit a non-existent endpoint:
```typescript
// Browser console
fetch('https://api.ecent.online/api/fake-endpoint');
```
✅ Should see error in bottom-right corner

### Test 2: View Error Log
1. Trigger an error
2. Click "View Log" button
3. ✅ Should see formatted log with timestamp

### Test 3: Clear Errors
1. Click "Clear All" button
2. ✅ All errors should disappear

### Test 4: Auto-Dismiss
1. Trigger an error
2. Wait 8 seconds
3. ✅ Error should auto-dismiss

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No errors showing | Check browser console (F12) for JS errors |
| Errors disappeared | They auto-dismiss after 8s - click "View Log" to see all |
| Too many errors | Click "Clear All" to reset |
| Can't see details | Click "[Details]" or "[Stack Trace]" to expand |
| Error log is empty | No errors have been caught yet - try triggering one |

## Key Endpoints to Monitor

Based on current issues, watch these for errors:

```
GET /api/sync/notifications      - Sync system
POST /api/daily-plan              - Daily planning
GET /api/user                     - User profile
POST /api/tos/accept              - Terms of service
GET /api/health                   - Backend health
```

## Performance Impact

- **Bundle**: +5KB gzipped
- **Runtime**: Minimal (Zustand is lightweight)
- **Memory**: Cleared automatically
- **Network**: Zero additional calls

## Next: Schema Fixes

Once errors are visible and working, we can tackle the database schema issues:

```
Current Issues:
- column "is_read" does not exist in notifications
- relation "daily_plan_items" does not exist
- operator does not exist: date = text

This error system will help us:
1. See exactly which endpoints fail
2. Understand the sequence of failures
3. Debug faster with detailed logs
4. Verify fixes by checking error disappears
```

## Resources

- Full Documentation: [ERROR_NOTIFICATIONS.md](ERROR_NOTIFICATIONS.md)
- Implementation Details: [ERROR_NOTIFICATIONS_IMPLEMENTATION.md](ERROR_NOTIFICATIONS_IMPLEMENTATION.md)
- Hook Code: [useErrorNotification.ts](../lib/hooks/useErrorNotification.ts)
- Component Code: [ErrorNotifications.tsx](../components/ui/ErrorNotifications.tsx)
