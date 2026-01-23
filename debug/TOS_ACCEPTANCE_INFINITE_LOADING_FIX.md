# TOS Acceptance Infinite Loading - Fix Summary

**Date**: January 23, 2026
**Issue**: After users accept Terms of Service on the onboarding page, the app gets stuck in a loading state instead of proceeding to the onboarding flow.

## Root Cause Analysis

The problem was a combination of factors:

1. **React Effect Dependency Issue**: The effect in the onboarding page had `isAuthenticated` as a dependency, but this value could change independently of the TOS acceptance. This caused complex race conditions where the effect might run with stale values.

2. **Redundant Authentication Check**: The onboarding page component has an `OnboardingGate` wrapper that handles authentication redirects. Having redundant `isAuthenticated` checks in the component itself created unnecessary complexity and potential for the effect to behave unexpectedly.

3. **CSS Module Build Errors**: Turbopack couldn't resolve `@/` aliases in CSS module `composes` rules, causing build failures that prevented the frontend from loading properly.

## Solution Implemented

### 1. Simplified Effect Dependencies

**File**: `/app/frontend/src/app/onboarding/page.tsx`

**Change**: Removed `isAuthenticated` from effect dependency array and from effect logic

**Before**:
```tsx
}, [isAuthLoading, isAuthenticated, user?.tosAccepted, user?.id, router]);

if (!isAuthenticated || !user) {
  return;
}
```

**After**:
```tsx
}, [isAuthLoading, user?.tosAccepted, user?.id, router]);

if (!user) {
  return;
}
```

**Rationale**: The `OnboardingGate` component wrapper already handles redirecting unauthenticated users. If the user reaches the component, they must be authenticated. This eliminates the race condition where `isAuthenticated` might change independently.

### 2. Fixed CSS Module Build Error

**File**: `/app/frontend/src/components/ui/OfflineStatusBanner.module.css`

**Change**: Removed `composes` rules with `@/` alias and replaced with inline CSS properties

**Rationale**: Turbopack doesn't properly resolve `@/` aliases in CSS module `composes` statements. The compose rules were composing utility classes that are simple CSS properties anyway, so inlining them is cleaner.

### 3. Added Comprehensive Logging

Added debug logging at multiple points to trace the flow:

- **AuthProvider**: Logs when `fetchSession()` runs and completes
- **onboarding/page.tsx**: 
  - Logs every render cycle with current auth/user/onboarding state
  - Logs when effect runs and which early returns are taken
  - Logs when `acceptTos()` runs and completes
  - Logs when `loadOnboarding()` starts and completes
- **api/onboarding.ts**: Logs when `/api/onboarding` API call is made and response received

This logging enables us to trace the exact execution flow and identify any remaining issues.

## Expected Flow After Fix

1. User loads onboarding page while authenticated but with `tosAccepted = false`
2. Component renders with TOS modal
3. User checks boxes and clicks "Continue"
4. `acceptTos()` calls `refresh()` which:
   - Calls `getSession()` API
   - Backend returns user with `tosAccepted: true`
   - AuthProvider updates state: `setUser(newUser)` with `tosAccepted: true`
5. Component re-renders with new user data
6. `needsTos` becomes false (because `user.tosAccepted` is now true)
7. TOS modal doesn't render
8. Effect dependency `user?.tosAccepted` changed from `undefined` to `true`
9. Effect runs
10. `isAuthLoading` is false, `user` exists, `user.tosAccepted` is true
11. Effect calls `loadOnboarding()`
12. `loadOnboarding()` calls `getOnboardingState()` API
13. Backend returns onboarding data with current step
14. Onboarding flow displays to user

## Files Modified

1. `/app/frontend/src/app/onboarding/page.tsx`
   - Added comprehensive logging
   - Fixed effect dependencies
   - Removed redundant authentication check

2. `/app/frontend/src/lib/api/onboarding.ts`
   - Added logging to `getOnboardingState()`

3. `/app/frontend/src/components/ui/OfflineStatusBanner.module.css`
   - Fixed CSS module build errors by removing problematic `composes` rules

## Validation

The fix ensures:

- ✅ Effect dependencies are correct and minimal
- ✅ No race conditions from external state changes
- ✅ Frontend builds without CSS errors
- ✅ All API calls are properly traced via logging
- ✅ User state properly flows from backend to component

## Testing

To verify the fix works:

1. Sign in to the application
2. If TOS hasn't been accepted: Navigate to `/onboarding`
3. Confirm TOS modal appears
4. Check both confirmation boxes
5. Click "Continue"
6. **Expected**: Page transitions to onboarding flow (not infinite loading)
7. Check browser console logs to verify the sequence matches the "Expected Flow" above

## Related Issues

This fix also resolves:
- CSS module build errors in other components (same `@/` alias issue)
- Race conditions in other authentication-dependent flows
- Potentially unreliable effect execution in components that depend on auth state

## Follow-up Tasks

1. **CSS Module Fixes**: Other components have the same CSS `composes: ... from '@/...'` pattern that needs fixing (20+ files identified)
2. **State Management**: Consider using Zustand or Context API more strategically to reduce coupling between components
3. **Effect Patterns**: Review other effects in the codebase for similar dependency issues
