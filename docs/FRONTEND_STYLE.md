# Frontend Code Style Guide

**Version**: 1.0  
**Last Updated**: January 18, 2026  
**Framework**: Next.js 15.5, React 19, TypeScript  

---

## Table of Contents

- [Naming Conventions](#naming-conventions)
- [File Organization](#file-organization)
- [Component Structure](#component-structure)
- [Hooks & Utilities](#hooks--utilities)
- [Imports & Exports](#imports--exports)
- [Formatting & Linting](#formatting--linting)
- [Best Practices](#best-practices)

---

## Naming Conventions

### Components (PascalCase)

All React components use PascalCase file names and export names.

```typescript
// ✅ CORRECT
export const HomePage: React.FC = () => { ... };

// ❌ WRONG
export const homePage: React.FC = () => { ... };
export const home_page: React.FC = () => { ... };
```

**File Naming**:
```
src/components/HomePage.tsx          # React component
src/components/Button.tsx            # Reusable UI component
src/components/GoalCard.tsx          # Feature component
src/components/ProgressBar.tsx       # Complex component
```

### Hooks (use prefix + Camel Case)

All React hooks follow the `use` prefix pattern.

```typescript
// ✅ CORRECT
export function useFocusSession() { ... }
export function useProgressCalculation() { ... }
export function useAppState() { ... }

// ❌ WRONG
export function FocusSessionHook() { ... }
export function getProgressCalculation() { ... }
export function appStateStore() { ... }
```

**File Naming**:
```
src/lib/hooks/useFocusSession.ts
src/lib/hooks/useProgressCalculation.ts
src/lib/hooks/useAppState.ts
```

### Utilities & Services (camelCase)

Non-React functions use camelCase.

```typescript
// ✅ CORRECT
export function formatDate(date: Date): string { ... }
export function calculateStreak(days: number): number { ... }
export const syncClient = { ... };
export const habitClient = { ... };

// ❌ WRONG
export function FormatDate(date: Date): string { ... }
export function CalculateStreak(days: number): number { ... }
export const SyncClient = { ... };
```

**File Naming**:
```
src/lib/utils/formatDate.ts
src/lib/api/syncClient.ts
src/lib/api/habitClient.ts
```

### Constants (SCREAMING_SNAKE_CASE)

All constants use SCREAMING_SNAKE_CASE.

```typescript
// ✅ CORRECT
const MAX_FOCUS_DURATION = 120;
const SYNC_INTERVAL_MS = 30000;
const DEFAULT_TIMEZONE = 'UTC';
const API_BASE_URL = 'https://api.example.com';

// ❌ WRONG
const maxFocusDuration = 120;
const max_focus_duration = 120;
const MaxFocusDuration = 120;
```

### Types & Interfaces (PascalCase)

All TypeScript types use PascalCase.

```typescript
// ✅ CORRECT
interface UserSettings {
  theme: 'light' | 'dark';
  notifications: boolean;
}

type HabitStatus = 'active' | 'completed' | 'archived';

// ❌ WRONG
interface user_settings { ... }
interface userSettings { ... }
type habit_status = '...';
```

### Variables & Parameters (camelCase)

Regular variables and parameters use camelCase.

```typescript
// ✅ CORRECT
const userName = 'John Doe';
const habitsList: Habit[] = [];
const { userId, userName } = user;

// ❌ WRONG
const user_name = 'John Doe';
const UserName = 'John Doe';
const habits_list: Habit[] = [];
```

---

## File Organization

### Component Directory Structure

```
src/components/
├── ui/                          # Reusable base components
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Modal.tsx
│   └── Toast.tsx
├── Gamification/                # Feature: Gamification
│   ├── ProgressBar.tsx
│   ├── AchievementCard.tsx
│   └── index.ts
├── Content/                     # Feature: Goals, Habits, Quests
│   ├── GoalCard.tsx
│   ├── HabitList.tsx
│   ├── QuestTracker.tsx
│   └── index.ts
├── Focus/                       # Feature: Focus Sessions
│   ├── FocusTimer.tsx
│   ├── SessionStats.tsx
│   └── index.ts
├── Admin/                       # Admin dashboard
│   ├── UserTable.tsx
│   ├── AdminPanel.tsx
│   └── index.ts
└── Layout/                      # Page layouts
    ├── MainLayout.tsx
    ├── AuthLayout.tsx
    └── index.ts
```

### Utilities Directory Structure

```
src/lib/
├── api/                         # API clients
│   ├── client.ts               # Base HTTP client
│   ├── habitClient.ts
│   ├── goalClient.ts
│   └── ...
├── hooks/                       # React hooks
│   ├── useFocusSession.ts
│   ├── useSync.ts
│   └── ...
├── utils/                       # Helper functions
│   ├── formatDate.ts
│   ├── calculateStreak.ts
│   └── ...
├── stores/                      # Zustand stores
│   ├── errorStore.ts
│   ├── uiStore.ts
│   └── ...
├── sync/                        # Real-time sync
│   ├── SyncStateContext.tsx
│   ├── useSyncContext.ts
│   └── ...
└── forms/                       # Form schemas & validation
    ├── schemas.ts              # Zod schemas
    └── validators.ts
```

---

## Component Structure

### Functional Component Pattern

```typescript
// src/components/Content/GoalCard.tsx

import React from 'react';
import { Goal } from '@/types/Goal';
import styles from './GoalCard.module.css';

interface GoalCardProps {
  goal: Goal;
  onUpdate?: (goal: Goal) => void;
}

export const GoalCard: React.FC<GoalCardProps> = ({
  goal,
  onUpdate,
}) => {
  return (
    <div className={styles.card}>
      <h3>{goal.title}</h3>
      <p>{goal.description}</p>
    </div>
  );
};

export default GoalCard;
```

### Key Points

1. **Props Interface**: Always define props with TypeScript interface
2. **Type Annotation**: Explicitly type components with `React.FC<Props>`
3. **Destructuring**: Destructure props for clarity
4. **Default Exports**: Export as both named and default for flexibility
5. **CSS Modules**: Import styles with `.module.css` extension

---

## Hooks & Utilities

### Custom Hook Pattern

```typescript
// src/lib/hooks/useFocusSession.ts

import { useState, useCallback } from 'react';
import { focusClient } from '@/lib/api/focusClient';
import { FocusSession } from '@/types/Focus';

interface UseFocusSessionReturn {
  session: FocusSession | null;
  isLoading: boolean;
  error: string | null;
  startSession: (durationMinutes: number) => Promise<void>;
  endSession: () => Promise<void>;
}

export function useFocusSession(): UseFocusSessionReturn {
  const [session, setSession] = useState<FocusSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startSession = useCallback(async (durationMinutes: number) => {
    try {
      setIsLoading(true);
      setError(null);
      const newSession = await focusClient.start({ duration_minutes: durationMinutes });
      setSession(newSession);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const endSession = useCallback(async () => {
    if (!session) return;
    try {
      setIsLoading(true);
      await focusClient.end(session.id);
      setSession(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  return { session, isLoading, error, startSession, endSession };
}
```

### Utility Function Pattern

```typescript
// src/lib/utils/formatDate.ts

/**
 * Format a date to YYYY-MM-DD string
 * @param date - Date to format
 * @returns Formatted date string
 */
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Calculate streak days from completion dates
 * @param dates - Array of completion dates
 * @returns Number of consecutive days
 */
export function calculateStreak(dates: Date[]): number {
  if (dates.length === 0) return 0;
  
  const sorted = [...dates].sort((a, b) => b.getTime() - a.getTime());
  let streak = 1;
  
  for (let i = 0; i < sorted.length - 1; i++) {
    const daysDiff = Math.floor((sorted[i].getTime() - sorted[i + 1].getTime()) / (24 * 60 * 60 * 1000));
    if (daysDiff === 1) {
      streak++;
    } else {
      break;
    }
  }
  
  return streak;
}
```

---

## Imports & Exports

### Import Grouping

Imports should be organized in this order:

1. React & Next.js imports
2. Third-party library imports
3. Internal absolute imports (`@/`)
4. Relative imports (`./`, `../`)

```typescript
// ✅ CORRECT
import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@ui/Button';
import { useSync } from '@/lib/hooks/useSync';
import { Goal } from '@/types/Goal';

import { GoalCard } from './GoalCard';
import styles from './Goals.module.css';

// ❌ WRONG
import { GoalCard } from './GoalCard';
import { useSync } from '@/lib/hooks/useSync';
import React from 'react';
import { Button } from '@ui/Button';
```

### Export Patterns

```typescript
// ✅ CORRECT: Named export with default
export const Button: React.FC<ButtonProps> = ({ ... }) => { ... };
export default Button;

// ✅ ALSO CORRECT: Only named export
export const Button: React.FC<ButtonProps> = ({ ... }) => { ... };

// ✅ Index re-exports for convenience
// src/components/ui/index.ts
export { Button } from './Button';
export { Input } from './Input';
export { Modal } from './Modal';
```

---

## Formatting & Linting

### ESLint Configuration

**File**: `app/frontend/eslint.config.mjs`

```typescript
extends: ["next/core-web-vitals", "next/typescript"]

Rules:
- No emojis in code (use Unicode or SVG)
- No dangerouslySetInnerHTML with user input
- Standard TypeScript rules (no any without reason)
- No unused variables
- Proper async/await patterns
```

### Prettier Configuration

Code is formatted via ESLint. To format all files:

```bash
npm run lint --fix
```

This command:
- Organizes imports alphabetically
- Fixes formatting issues
- Removes unused variables
- Applies consistent spacing

### Running Lint Checks

```bash
# Check for issues without fixing
npm run lint

# Fix issues automatically
npm run lint --fix

# Check TypeScript
npm run typecheck

# Both lint and typecheck
npm run check
```

---

## Best Practices

### 1. Type Safety

Always use TypeScript types, avoid `any`:

```typescript
// ✅ CORRECT
interface Props {
  id: string;
  title: string;
  count: number;
}

function Component({ id, title, count }: Props) {
  return <div>{title} - {count}</div>;
}

// ❌ WRONG
function Component(props: any) {
  return <div>{props.title} - {props.count}</div>;
}
```

### 2. Component Size

Keep components < 400 lines. Break into smaller components:

```typescript
// ❌ BAD - Too large
export const GoalCard: React.FC<GoalCardProps> = ({ goal }) => {
  // 300 lines of code here
};

// ✅ GOOD - Broken down
export const GoalCard: React.FC<GoalCardProps> = ({ goal }) => {
  return (
    <div>
      <GoalHeader goal={goal} />
      <GoalProgress goal={goal} />
      <GoalActions goal={goal} />
    </div>
  );
};
```

### 3. Memoization

Use `useMemo` and `useCallback` for expensive operations:

```typescript
// ✅ GOOD
const filteredGoals = useMemo(
  () => goals.filter(g => g.status === 'active'),
  [goals]
);

const handleClick = useCallback(() => {
  doSomething();
}, []);
```

### 4. Error Handling

Always handle errors and show user feedback:

```typescript
// ✅ GOOD
try {
  const result = await apiCall();
  setData(result);
} catch (error) {
  showNotification(`Error: ${error.message}`);
}
```

### 5. CSS Modules

Use CSS Modules for component styling:

```typescript
// src/components/Button.module.css
.button {
  padding: 0.75rem 1.5rem;
  background-color: var(--color-primary);
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
}

.button:hover {
  background-color: var(--color-primary-dark);
}

// src/components/Button.tsx
import styles from './Button.module.css';

export const Button = () => {
  return <button className={styles.button}>Click me</button>;
};
```

### 6. No Hardcoded Values

Extract constants and configuration:

```typescript
// ❌ WRONG
const SYNC_INTERVAL = 30000; // What does this number mean?
const TAX_RATE = 0.07; // Where does this come from?

// ✅ CORRECT
const SYNC_INTERVAL_MS = 30000; // Clear intent
const DEFAULT_TAX_RATE = 0.07; // Obvious it's a default value
```

### 7. Component Props

Make props clear and optional where appropriate:

```typescript
// ✅ GOOD
interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

// ❌ WRONG
interface ButtonProps {
  children: any;
  onClick: Function;
  variant: string;
}
```

---

## Pre-Commit Checklist

Before committing frontend code:

- [ ] **Naming**: All components PascalCase, hooks use `use` prefix, utils camelCase
- [ ] **Imports**: Grouped correctly (React → 3rd party → internal → relative)
- [ ] **Types**: No `any` types without justification
- [ ] **Linting**: `npm run lint --fix` passes
- [ ] **Types**: `npm run typecheck` passes
- [ ] **Build**: `npm run build` succeeds
- [ ] **Size**: Components < 400 lines (or broken down)
- [ ] **Errors**: Error handling in all async operations
- [ ] **Accessibility**: aria-labels where needed, semantic HTML
- [ ] **Tests**: Unit tests for complex logic, E2E for user flows

---

## Questions?

See:
- [COMPONENT_GUIDE.md](../../COMPONENT_GUIDE.md) - Detailed component patterns
- [ARCHITECTURE.md](../../ARCHITECTURE.md) - System design and structure
- [API_DOCUMENTATION.md](../../API_DOCUMENTATION.md) - API integration guide

---

**Last Updated**: January 18, 2026  
**Maintained By**: Frontend Team  
**Version**: 1.0
