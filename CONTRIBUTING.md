# Contributing to Passion OS

Thank you for your interest in contributing to Passion OS! This document provides guidelines and instructions for developers.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Git Workflow](#git-workflow)
- [Code Standards](#code-standards)
- [Testing](#testing)
- [Debugging](#debugging)
- [Submitting Changes](#submitting-changes)

---

## Getting Started

### Prerequisites

- **Node.js**: v18+ (for frontend and admin)
- **Rust**: Latest stable (for backend)
- **PostgreSQL**: v14+ (for database)
- **Docker**: For local development environment (optional)
- **Git**: For version control

### System Requirements

- macOS / Linux / Windows (WSL2)
- 4GB+ RAM
- 5GB+ disk space for dependencies

---

## Development Setup

### 1. Clone Repository

```bash
git clone https://github.com/passion-os/passion-os-next.git
cd passion-os-next
```

### 2. Setup Frontend

```bash
cd app/frontend
npm install
npm run dev
# Frontend runs on http://localhost:3000
```

### 3. Setup Backend

```bash
cd app/backend
cargo build
cargo run --bin ignition-api
# Backend runs on http://localhost:8000
```

### 4. Setup Admin Dashboard

```bash
cd app/admin
npm install
npm run dev
# Admin runs on http://localhost:3001
```

### 5. Setup Database

```bash
# Using Docker Compose (recommended)
docker-compose up -d postgres

# Or use Neon (cloud PostgreSQL)
# Set DATABASE_URL in .env.local
```

### 6. Environment Configuration

Create `.env.local` with:

```env
# Backend
RUST_LOG=debug
DATABASE_URL=postgresql://user:password@localhost:5432/passion_os

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000

# OAuth (for authentication)
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_secret
AZURE_CLIENT_ID=your_client_id
AZURE_CLIENT_SECRET=your_secret
```

---

## Git Workflow

### Branch Naming

```
main              - Production-ready code
production        - Current production branch (sync with main)
develop           - Integration branch
feature/...       - New features
fix/...           - Bug fixes
docs/...          - Documentation
chore/...         - Maintenance
```

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

<body>

<footer>
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style (no logic change)
- `refactor`: Code refactoring
- `perf`: Performance improvement
- `test`: Test changes
- `chore`: Maintenance

**Example**:

```
feat(auth): implement session rotation on privilege escalation

- Added session_rotation_required column to sessions table
- Implemented AuthService::rotate_session method
- Updated all privilege escalation endpoints to rotate sessions

Closes #123
```

### Creating a Pull Request

1. Create feature branch: `git checkout -b feature/my-feature`
2. Make changes and commit with meaningful messages
3. Push branch: `git push origin feature/my-feature`
4. Create PR with:
   - Clear description of changes
   - Link to related issues
   - Screenshots for UI changes
   - Test results

---

## Code Standards

### Rust Backend

**Style Guide**: See [docs/BACKEND_IMPORT_STYLE.md](docs/BACKEND_IMPORT_STYLE.md) for complete naming and import conventions.

**Standards**:
- Follow `rustfmt` (run `cargo fmt`)
- Use `clippy` linter (run `cargo clippy`)
- Use SQLx for database queries (runtime binding, not compile-time)
- Prefer error handling with Result types
- Document public APIs with doc comments

**Naming Conventions**:
- Modules: `snake_case` (e.g., `habit_repos.rs`)
- Functions: `snake_case` (e.g., `fetch_all_habits()`)
- Structs/Types: `PascalCase` (e.g., `struct HabitModel {}`)
- Constants: `SCREAMING_SNAKE_CASE` (e.g., `const MAX_RETRIES: u32 = 3;`)

**Import Organization** (Automatically enforced):
```rust
use std::collections::HashMap;          // 1. Standard library

use axum::Router;                       // 2. External crates
use sqlx::PgPool;
use tokio::spawn;

use crate::db::user_repos;              // 3. Crate modules
use crate::routes::auth;

use super::models::User;                // 4. Relative modules
```

**Structure**:
```
crates/api/src/
├── db/
│   ├── models.rs          - Database models
│   ├── repos/             - Repository pattern
│   ├── generated.rs       - Generated from schema (auto-generated)
│   └── core.rs
├── routes/                - HTTP route handlers
├── services/              - Business logic
├── middleware/            - HTTP middleware
├── error.rs               - Error types
└── main.rs
```

**Example**:

```rust
// ✅ Correct error handling
async fn get_user(pool: &PgPool, id: Uuid) -> AppResult<User> {
    sqlx::query_as::<_, User>("SELECT * FROM users WHERE id = $1")
        .bind(id)
        .fetch_optional(pool)
        .await?
        .ok_or(AppError::NotFound("User not found".to_string()))
}

// ❌ Wrong - compile-time macro without DATABASE_URL
sqlx::query_as!(User, "SELECT * FROM users WHERE id = $1", id)
```

### TypeScript/React Frontend

**Style Guide**: See [docs/FRONTEND_STYLE.md](docs/FRONTEND_STYLE.md) for complete naming and organization conventions.

**Standards**:
- Follow ESLint configuration (`npm run lint`)
- Use TypeScript strict mode
- Prefer functional components with hooks
- Use suspense for async operations

**Naming Conventions**:
- Components: `PascalCase` (e.g., `GoalCard.tsx`)
- Hooks: `useXxx` (e.g., `useFocusSession.ts`)
- Utilities: `camelCase` (e.g., `formatDate.ts`)
- Types: `PascalCase` (e.g., `interface UserSettings {}`)
- Constants: `SCREAMING_SNAKE_CASE` (e.g., `const API_BASE_URL = '...'`)

**Import Organization**:
```typescript
import React, { useState } from 'react';              // 1. React & Next.js
import { useRouter } from 'next/navigation';

import { Button } from '@ui/Button';                 // 2. Third-party + internal
import { useSync } from '@/lib/hooks/useSync';
import { Goal } from '@/types/Goal';

import { GoalCard } from './GoalCard';               // 3. Relative imports
import styles from './Goals.module.css';
```

**Structure**:
```
app/frontend/src/
├── app/                   - Next.js pages
├── components/            - React components
├── lib/
│   ├── api/              - API clients
│   ├── hooks/            - Custom hooks
│   └── utils/            - Utilities
├── styles/               - Global styles
└── types.ts              - TypeScript types
```

**Example**:

```typescript
// ✅ Correct component pattern
interface UserProps {
  id: string;
}

export function User({ id }: UserProps) {
  const { data, error, isLoading } = useFetch(`/api/users/${id}`);

  if (isLoading) return <Loading />;
  if (error) return <ErrorBoundary error={error} />;
  
  return <UserCard user={data} />;
}

// ❌ Wrong - no error handling
export function User({ id }: UserProps) {
  const data = fetch(`/api/users/${id}`).then(r => r.json());
  return <UserCard user={data} />;
}
```

---

## Testing

### Unit Tests (Backend)

```bash
cd app/backend
cargo test --lib
```

**Example**:
```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_user_creation() {
        let user = User::new("test@example.com");
        assert_eq!(user.email, "test@example.com");
    }
}
```

### E2E Tests

```bash
# Install dependencies
npm install -D @playwright/test

# Run tests
npm run test:e2e

# Run specific test file
npx playwright test tests/api-auth.spec.ts

# Run in headed mode (see browser)
npx playwright test --headed
```

**Example**:
```typescript
import { test, expect } from '@playwright/test';

test('user can login', async ({ request }) => {
  const response = await request.post('/api/auth/signin', {
    data: {
      email: 'test@example.com',
      password: 'password123',
    },
  });
  
  expect(response.status()).toBe(200);
  const data = await response.json();
  expect(data.user.email).toBe('test@example.com');
});
```

### Integration Tests

```bash
cd app/backend
cargo test --test '*'
```

---

## Debugging

### Backend Debugging

**Using RUST_LOG**:
```bash
RUST_LOG=debug cargo run --bin ignition-api
RUST_LOG=ignition_api=debug cargo run --bin ignition-api
```

**Using VS Code**:
1. Install Rust Analyzer extension
2. Set breakpoints and press F5 to debug

### Frontend Debugging

**Using Browser DevTools**:
- Open http://localhost:3000 and press F12
- Use React DevTools extension
- Use Network tab to inspect API calls

**Using VS Code**:
1. Install Debugger for Chrome
2. Press F5 to start debugging

### Database Debugging

```bash
# Connect to local PostgreSQL
psql postgresql://user:password@localhost:5432/passion_os

# View schema
\dt          # List tables
\d users     # Describe users table
\l           # List databases
```

---

## Debugging Instructions

For detailed debugging process, see [DEBUGGING.instructions.md](.github/instructions/DEBUGGING.instructions.md).

**Quick checklist for bug fixes**:
1. Document the issue with exact error message and location
2. Search codebase for related issues
3. Determine root cause (schema mismatch, implementation bug, etc.)
4. Document solution options if multiple paths exist
5. Get approval before implementing fix
6. Run validation: cargo check + npm lint
7. Update DEBUGGING.md with results
8. Wait for user approval before pushing

---

## Submitting Changes

### Pre-Commit Checklist

- [ ] Code follows style guide (cargo fmt, npm lint)
- [ ] No console.log or debug statements left
- [ ] All tests pass (cargo test, npm run test:e2e)
- [ ] No new compiler warnings
- [ ] Updated CHANGELOG.md if relevant
- [ ] Commit messages follow Conventional Commits
- [ ] No secrets committed (.env.local is in .gitignore)

### Validation Commands

```bash
# Backend
cd app/backend
cargo fmt
cargo clippy
cargo test
cargo check --bin ignition-api

# Frontend
cd app/frontend
npm run lint
npm run typecheck
npm run test:e2e

# Admin
cd app/admin
npm run lint
npm run typecheck
```

### PR Review Process

1. Code review by maintainers
2. All CI checks must pass
3. At least 1 approval required
4. Merge to develop branch
5. Staging deployment
6. Merge to main for production

---

## Development Tips

### Helpful Commands

```bash
# Reset database to clean state
npm run db:reset

# Generate code from schema
python3 tools/schema-generator/generate_all.py

# Deploy locally
docker-compose up -d

# Run full test suite
npm run test:full

# Check for outdated dependencies
npm outdated
cargo outdated
```

### Common Issues

**Issue**: "DATABASE_URL not found"
**Solution**: Set DATABASE_URL in .env.local or use Docker Compose

**Issue**: Port 3000 already in use
**Solution**: Kill process: `lsof -ti:3000 | xargs kill -9`

**Issue**: cargo check fails with SQLx errors
**Solution**: Use runtime queries, not compile-time macros (no DATABASE_URL at build time)

---

## Code Review Checklist

When reviewing code, ensure:

- [ ] Code follows project style guide
- [ ] No duplicated functionality
- [ ] Error handling is comprehensive
- [ ] API changes documented
- [ ] Tests added for new features
- [ ] Database schema updates included
- [ ] No hardcoded values or secrets
- [ ] Performance impact considered
- [ ] Security implications reviewed

---

## Questions?

- Check [docs/](docs/) for detailed documentation
- Review [DEBUGGING.instructions.md](.github/instructions/DEBUGGING.instructions.md) for debugging process
- Ask in GitHub Discussions or Issues

---

**Last Updated**: 2026-01-13  
**Maintained By**: Passion OS Core Team
