# Accessibility Tests

## Test 1: Keyboard Navigation

```
On [URL], put away your mouse and use only keyboard.

1. Press Tab to navigate through the page
2. Check if focus indicators are visible
3. Try to reach all interactive elements via Tab
4. Press Enter to activate buttons/links
5. Press Escape to close any modals
6. Try using arrow keys in menus/lists

Report:
- Is there a visible focus indicator?
- Can all interactive elements be reached?
- Does Enter/Space activate buttons?
- Does Escape close modals?
- Any keyboard traps?
```

## Test 2: Screen Reader Simulation

```
On [URL], check for screen reader compatibility:

1. Look for aria-labels on icons and buttons
2. Check if images have alt text (inspect or hover)
3. Look for proper heading hierarchy (h1, h2, h3...)
4. Check form inputs have associated labels
5. Look for skip links at the top of the page

Report:
- Do buttons have descriptive labels?
- Do images have alt text?
- Is heading hierarchy logical?
- Are form labels present?
- Is there a skip-to-content link?
```

## Test 3: Color Contrast

```
On [URL], evaluate color contrast:

1. Look for light gray text on white backgrounds
2. Check button text against button backgrounds
3. Look at link colors - are they distinguishable?
4. Check error messages - are they clearly visible?
5. Look at any disabled states

Report:
- Any low-contrast text?
- Are links visually distinct?
- Are error states clear?
- Any issues with disabled element visibility?
```

## Test 4: Zoom & Text Scaling

```
On [URL]:

1. Zoom the browser to 200%
2. Check if layout remains usable
3. Verify no text is cut off
4. Check horizontal scrolling (should be minimal)
5. Verify buttons are still clickable

Report:
- Does the layout adapt to 200% zoom?
- Any text truncation?
- Is horizontal scroll excessive?
- Are touch targets still accessible?
```

## Test 5: Motion & Animation

```
On [URL], look for animations and motion:

1. Note any animations on page load
2. Check for animated transitions
3. Look for a reduced motion preference option
4. Check if animations are subtle and not distracting

Report:
- What animations are present?
- Are they subtle or overwhelming?
- Is there a reduced motion option?
- Any animations that could cause issues for vestibular disorders?
```
