# Code Style Guide

**Version**: 1.0  
**Last Updated**: January 18, 2026  
**Status**: Complete

---

## Formatting Standards

### TypeScript/JavaScript

```typescript
// ✅ CORRECT - Consistent spacing and naming
export interface User {
  id: string;
  email: string;
  createdAt: Date;
}

export function createUser(email: string): Promise<User> {
  return api.post("/users", { email });
}

// ❌ WRONG - Inconsistent spacing
export interface User {
id:string
email:string
}
```

### Rust

```rust
// ✅ CORRECT - Idiomatic Rust
pub struct User {
    pub id: String,
    pub email: String,
}

impl User {
    pub fn new(id: String, email: String) -> Self {
        Self { id, email }
    }
}

// ❌ WRONG - Non-idiomatic
pub struct User {
    pub id: String,
    pub email: String,
}
pub fn new_user(id: String, email: String) -> User {
    User { id: id, email: email }
}
```

---

## Naming Conventions

### Variables & Functions

- **camelCase** for variables and functions: `getUserById`, `handleSubmit`
- **UPPER_SNAKE_CASE** for constants: `MAX_RETRIES`, `DEFAULT_TIMEOUT`
- **PascalCase** for classes and interfaces: `UserManager`, `ApiResponse`

### Files

- **kebab-case** for files: `user-service.ts`, `form-validator.ts`
- **index.ts** for module entry points
- Group related files in folders: `src/lib/api/`, `src/components/forms/`

### Database

- **snake_case** for table and column names: `user_profiles`, `created_at`
- **Plural names** for tables: `users`, `habits`, `quests`

---

## Comments & Documentation

### Function Documentation

```typescript
/**
 * Fetch user by ID with error handling
 * 
 * @param userId - Unique user identifier
 * @param options - Optional fetch configuration
 * @returns Promise resolving to User object
 * @throws ApiError if user not found
 * 
 * @example
 * const user = await getUserById("user123");
 */
export async function getUserById(userId: string): Promise<User> {
  // Implementation
}
```

### Inline Comments

```typescript
// Use inline comments for non-obvious logic
const adjustedValue = value * 1.1; // Apply 10% variance

// Avoid obvious comments
const name = "John"; // Set name to John ❌

// Group related comments
// Calculate total with tax
const subtotal = items.reduce((sum, item) => sum + item.price, 0);
const tax = subtotal * TAX_RATE;
const total = subtotal + tax;
```

---

## Error Handling

### Always use typed errors

```typescript
// ✅ CORRECT
try {
  const user = await fetchUser(id);
  return user;
} catch (error) {
  if (error instanceof ApiError) {
    console.error("API error:", error.message);
  } else {
    console.error("Unexpected error:", error);
  }
}

// ❌ WRONG - Ignoring errors silently
const user = await fetchUser(id).catch(() => null);
```

### Use exhaustive error handling

```rust
// ✅ CORRECT - All cases handled
match result {
    Ok(value) => println!("{}", value),
    Err(e) => eprintln!("Error: {}", e),
}

// ❌ WRONG - Unwrap without context
let value = result.unwrap();
```

---

## Performance Best Practices

### Memoization

```typescript
// ✅ CORRECT - Memoize expensive computations
const MemoizedComponent = React.memo(function Component({ data }) {
  return <div>{data}</div>;
});

// ❌ WRONG - Creates new components on render
function ParentComponent() {
  return <Component data={data} />;
}
```

### Lazy Loading

```typescript
// ✅ CORRECT - Dynamic imports for large components
const HeavyComponent = lazy(() => import("./HeavyComponent"));

// ❌ WRONG - Imports all at once
import HeavyComponent from "./HeavyComponent";
```

---

## Testing Standards

### Unit Tests

```typescript
// ✅ CORRECT - Clear test descriptions
describe("UserValidator", () => {
  it("should validate email format", () => {
    const result = isValidEmail("user@example.com");
    expect(result).toBe(true);
  });

  it("should reject invalid email", () => {
    const result = isValidEmail("invalid-email");
    expect(result).toBe(false);
  });
});

// ❌ WRONG - Unclear test names
describe("test", () => {
  it("test 1", () => {
    // Unclear what is being tested
  });
});
```

---

## Git Commit Messages

### Format

```
[TAG] Brief description (50 chars max)

Optional detailed explanation with:
- What changed
- Why it changed
- How to test

Closes #123
```

### Examples

```
✅ [FEAT] Add user authentication endpoint
✅ [FIX] Resolve race condition in cache invalidation
✅ [PERF] Optimize database query batching
❌ [WIP] half done work
❌ fixed stuff
```

---

## Dependencies

### Version Pinning

- **Production**: Pin exact versions (`1.2.3`)
- **Development**: Allow patch updates (`^1.2.3`)
- **Review**: Always review dependency updates for security

### Minimize Dependencies

- Prefer built-ins when possible
- Combine related utilities into single package
- Remove unused dependencies regularly

---

## Security Best Practices

### Input Validation

```typescript
// ✅ CORRECT - Always validate
export function processUserInput(input: string): void {
  if (!input || input.length > 1000) {
    throw new Error("Invalid input");
  }
  // Process validated input
}

// ❌ WRONG - No validation
export function processUserInput(input: string): void {
  eval(input); // NEVER DO THIS
}
```

### Secrets Management

```typescript
// ✅ CORRECT - Use environment variables
const apiKey = process.env.API_KEY;

// ❌ WRONG - Hardcoded secrets
const apiKey = "sk-1234567890";
```

---

## Code Review Checklist

- [ ] Code follows naming conventions
- [ ] Functions have JSDoc/Rust doc comments
- [ ] Error handling is comprehensive
- [ ] No hardcoded secrets or sensitive data
- [ ] Tests cover happy path and edge cases
- [ ] Performance optimizations applied
- [ ] Accessibility considerations (if UI)
- [ ] Security best practices followed
- [ ] No console.log() in production code
- [ ] No TODO comments without issue links

---

## Linting Configuration

### ESLint Rules (TypeScript)

```json
{
  "extends": ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  "rules": {
    "@typescript-eslint/explicit-function-return-types": "warn",
    "@typescript-eslint/no-unused-vars": "error",
    "no-console": ["warn", { "allow": ["warn", "error"] }]
  }
}
```

### Rust Clippy Lints

```toml
[lints.clippy]
all = "warn"
pedantic = "warn"
```

---

**This guide is enforced in all pull requests. Questions? See CONTRIBUTING.md**
