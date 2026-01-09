# Auth Flow Tests

## Test 1: Google OAuth Login

```
Go to [URL]. You are testing the authentication flow.

1. Look for a "Sign in" or "Login" button and click it
2. You should see options for Google and/or Microsoft login
3. Click "Sign in with Google"
4. Verify you are redirected to Google's OAuth consent screen
5. After auth, verify you are redirected back to the app
6. Confirm the UI shows you are logged in (avatar, username, or dashboard access)

Report:
- Did the login button appear? Where was it located?
- Did OAuth redirect work correctly?
- What does the logged-in state look like?
- Any errors or unexpected behavior?
```

## Test 2: Microsoft OAuth Login

```
Go to [URL]. Test Microsoft authentication.

1. Click "Sign in" or "Login"
2. Select "Sign in with Microsoft"
3. Verify redirect to Microsoft login
4. Complete authentication
5. Confirm successful return to app in logged-in state

Report:
- Did Microsoft OAuth initiate correctly?
- Any differences from Google flow?
- Is the logged-in state consistent?
```

## Test 3: Session Persistence

```
Go to [URL] and log in.

1. After logging in, note your username/avatar
2. Refresh the page (F5 or Cmd+R)
3. Verify you remain logged in
4. Open a new tab and go to [URL]
5. Verify you are still logged in on the new tab
6. Close all tabs, wait 30 seconds, reopen [URL]
7. Verify session persisted

Report:
- Did session survive page refresh?
- Did session work across tabs?
- Did session persist after closing browser?
```

## Test 4: Logout Flow

```
Go to [URL] and ensure you are logged in.

1. Find the logout option (usually in profile menu or settings)
2. Click logout
3. Verify you are redirected to a logged-out state
4. Try to access a protected page (dashboard, settings)
5. Verify you are redirected to login or shown access denied

Report:
- Where was logout located?
- Did logout clear the session?
- Are protected routes properly guarded?
```

## Test 5: Unauthenticated Access

```
Open [URL] in an incognito/private window (no existing session).

1. Try to access the main dashboard directly via URL
2. Try to access /settings or /profile if those routes exist
3. Verify unauthenticated users are redirected to login or see appropriate messaging

Report:
- What happens when accessing protected routes without auth?
- Is the redirect smooth or jarring?
- Is there a clear call-to-action to log in?
```
