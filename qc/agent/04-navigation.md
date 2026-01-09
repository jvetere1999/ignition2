# Navigation Tests

## Test 1: Primary Navigation

```
Log into [URL] and explore the navigation structure.

1. Identify the primary navigation (top nav, sidebar, bottom nav)
2. Click through each main navigation item
3. Note the URL changes
4. Check for active/selected state styling

Report:
- Where is the main navigation located?
- List all main navigation items
- Do URLs update correctly?
- Is the active state clear?
```

## Test 2: Breadcrumbs & Back Navigation

```
On [URL], navigate deep into the app (3+ levels if possible).

1. Look for breadcrumb navigation
2. Use the browser back button
3. Check if app state is preserved on back
4. Try forward button after going back

Report:
- Are breadcrumbs present?
- Does browser back/forward work correctly?
- Is state preserved (scroll position, form data)?
```

## Test 3: Mobile Navigation

```
On [URL], resize the browser to mobile width (375px) or use mobile emulation.

1. Look for a hamburger menu or bottom navigation
2. Open the mobile menu
3. Navigate to different sections
4. Check if the menu closes after selection

Report:
- How does navigation adapt to mobile?
- Is the hamburger menu easy to use?
- Does navigation close after tapping an item?
- Any touch/tap issues?
```

## Test 4: Deep Linking

```
Test direct URL access on [URL]:

1. Navigate to a specific page and copy the URL
2. Open a new incognito window (logged out)
3. Paste the URL and navigate to it
4. Log in when prompted
5. Verify you are redirected to the original destination

Report:
- Does deep linking work?
- After login, did it redirect to the intended page?
- Any loss of context?
```

## Test 5: 404 & Error Pages

```
On [URL]:

1. Try navigating to a non-existent route (e.g., /this-page-does-not-exist)
2. Check if there's a custom 404 page
3. Look for navigation help on the error page
4. Try the home link or suggested actions

Report:
- Is there a custom 404 page?
- Does it provide helpful navigation options?
- Is the design consistent with the rest of the app?
```
