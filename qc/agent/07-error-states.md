# Error State Tests

## Test 1: Network Offline

```
On [URL]:

1. Log in and load the dashboard
2. Go offline (Network tab → Offline, or airplane mode)
3. Try to navigate or perform actions
4. Check for offline indicators or messaging
5. Go back online and check recovery

Report:
- Is there an offline indicator?
- What happens when you try actions while offline?
- Does the app recover gracefully when back online?
```

## Test 2: Form Validation

```
On [URL], find any form (profile, settings, create form):

1. Try submitting an empty required field
2. Enter invalid data (wrong email format, too short password)
3. Check for inline validation vs submit-time validation
4. Look at error message clarity
5. Check if errors clear when corrected

Report:
- Are required fields marked?
- Are validation messages clear and specific?
- Does inline validation exist?
- Do errors clear when fixed?
```

## Test 3: API Errors

```
On [URL], try to trigger server errors:

1. If there's a search, search for very long or special character strings
2. Try rapid clicking on submit buttons
3. Look for any loading states that never complete
4. Check browser console for API errors

Report:
- How does the app handle API failures?
- Are error messages user-friendly (not technical)?
- Is there retry functionality?
- Any infinite loading states?
```

## Test 4: Empty States

```
On [URL] with a new/empty account:

1. Navigate to list views (tasks, projects, history)
2. Check how empty lists are displayed
3. Look for helpful empty state messaging
4. Check for call-to-action to create first item

Report:
- Are empty states designed or just blank?
- Is there helpful messaging?
- Is there a clear CTA to get started?
```

## Test 5: Concurrent Session Handling

```
On [URL]:

1. Log in on two different browsers/devices
2. Make changes in one session
3. Check if changes reflect in the other session
4. Try logging out from one session
5. Check the state of the other session

Report:
- Do changes sync between sessions?
- Does logging out one session affect others?
- Any conflict handling visible?
```
