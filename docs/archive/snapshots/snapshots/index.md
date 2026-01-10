# Snapshots Documentation

## Overview

This directory contains visual regression snapshots for the Ignition cleanup/optimization task.

## Structure

```
docs/snapshots/
  index.md              # This file
  pre/                  # Pre-change baseline screenshots
    20260106-1200/      # Timestamped snapshot set
  post/                 # Post-change comparison screenshots
    20260106-HHMM/      # Timestamped snapshot set
```

## How Screenshots Were Produced

Screenshots are captured using Playwright's screenshot API.

### Environment
- URL: http://localhost:3000 (local dev server)
- Browser: Chromium (headless)
- Viewport: 1280x720 (desktop)

### Authentication
- Screenshots require authentication
- Use test account or authenticated session

### Routes Captured

| Route | Description | Pre Status | Post Status |
|-------|-------------|------------|-------------|
| `/today` | Today dashboard | Pending | - |
| `/quests` | Quests page | Pending | - |
| `/focus` | Focus timer | Pending | - |
| `/habits` | Habit tracking | Pending | - |
| `/exercise` | Fitness tracking | Pending | - |
| `/books` | Reading tracker | Pending | - |
| `/market` | Rewards shop | Pending | - |
| `/ideas` | Idea capture | Pending | - |
| `/infobase` | Knowledge base | Pending | - |

### Routes That Failed to Load

*To be documented if any routes fail during capture.*

## Comparison Process

1. Capture pre-change screenshots
2. Complete cleanup/optimization work
3. Capture post-change screenshots
4. Visual diff comparison (manual or automated)
5. Document any differences

## Notes

- Screenshots are for visual regression testing only
- Some dynamic content (timestamps, random IDs) may differ
- Focus on layout, functionality indicators, not exact pixel match

