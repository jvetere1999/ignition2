# Backend Testing Guide

**Last Updated**: January 17, 2026  
**Framework**: Rust + Tokio + SQLx  
**Database**: PostgreSQL with transaction isolation  

---

## Overview

The backend test suite includes:
- **Unit tests**: Fast, isolated component tests (no database)
- **Integration tests**: Database + endpoint interaction tests
- **System tests**: Multi-endpoint workflow tests (coming soon)
- **Golden tests**: Deterministic behavior and reproducibility tests

Test files are organized by type:
```
src/tests/
├── common/              # Shared fixtures, assertions, constants
├── unit/               # Unit tests (no database)
├── integration/        # Integration tests (with database)
├── system/            # System workflow tests
└── golden/            # Deterministic behavior tests
```

---

## Test Database Isolation

All integration tests use the `#[sqlx::test]` macro which provides:

1. **Automatic transaction wrapping**: Each test runs in its own transaction
2. **Automatic rollback**: Transaction is rolled back after test completes
3. **Database isolation**: Test data doesn't persist between tests
4. **Parallel execution**: Tests can run in parallel safely

```rust
#[sqlx::test]
async fn test_create_habit(pool: PgPool) {
    // Database transaction starts here
    
    let user = create_test_user(&pool).await;
    let habit = create_test_habit(&pool, user).await;
    
    assert!(habit.id is_some());
    
    // Transaction rolls back here - habit and user are deleted
}
```

**Key Point**: Test data does NOT persist between tests.

---

## Running Tests

### All Tests
```bash
cd app/backend
cargo test --lib
```

### Specific Test File
```bash
cargo test --lib habits_tests
```

### Specific Test
```bash
cargo test --lib test_create_habit
```

### With Output
```bash
cargo test --lib -- --nocapture
```

### Only Unit Tests (no database)
```bash
cargo test --lib unit::
```

### Only Integration Tests
```bash
cargo test --lib integration::
```

---

## Test Fixtures

### Overview
Fixtures are shared functions that create test data. Located in `tests/common/fixtures.rs`.

### Available Fixtures

#### `create_test_user(pool) -> Uuid`
Creates a test user with unique email.

```rust
#[sqlx::test]
async fn test_something(pool: PgPool) {
    let user_id = create_test_user(&pool).await;
    // user_id is ready to use
}
```

#### `create_test_habit(pool, user_id) -> Uuid`
Creates a test habit for a user.

```rust
#[sqlx::test]
async fn test_habit(pool: PgPool) {
    let user = create_test_user(&pool).await;
    let habit_id = create_test_habit(&pool, user).await;
    // habit_id is ready to use
}
```

#### `create_test_quest(pool, user_id) -> Uuid`
Creates a test quest for a user.

```rust
#[sqlx::test]
async fn test_quest(pool: PgPool) {
    let user = create_test_user(&pool).await;
    let quest_id = create_test_quest(&pool, user).await;
    // quest_id is ready to use
}
```

#### `create_test_goal(pool, user_id) -> Uuid`
Creates a test goal for a user.

#### `award_test_points(pool, user_id, xp, coins)`
Awards points to a user for gamification testing.

```rust
#[sqlx::test]
async fn test_gamification(pool: PgPool) {
    let user = create_test_user(&pool).await;
    award_test_points(&pool, user, 100, 50).await;
    // User now has 100 XP and 50 coins
}
```

### Using Fixtures

```rust
use crate::tests::common::fixtures::*;

#[sqlx::test]
async fn test_habit_creation(pool: PgPool) {
    // Import fixtures at top of test
    let user = create_test_user(&pool).await;
    let habit_id = create_test_habit(&pool, user).await;
    
    // Test code here
}
```

---

## Test Constants

### Overview
Common test constants are in `tests/common/constants.rs`.

### Available Constants

```rust
use crate::tests::common::constants::*;

TEST_EMAIL_DOMAIN           // "test.local"
TEST_PASSWORD_HASH          // "test_hash_value"
TEST_HABIT_FREQUENCY        // "daily"
TEST_HABIT_TARGET           // 1
TEST_QUEST_DIFFICULTY       // "easy"
TEST_QUEST_XP              // 10
TEST_QUEST_COIN            // 5
TEST_GOAL_TARGET           // 100
TEST_GOAL_INITIAL          // 0
TEST_TIMEOUT_SECS          // 30
```

### Using Constants

```rust
#[sqlx::test]
async fn test_with_constants(pool: PgPool) {
    use crate::tests::common::constants::*;
    
    let email = test_email("scenario1");
    assert_eq!(email, "test-user-scenario1@test.local");
    
    // Avoid magic numbers in tests
    assert_eq!(habit.target_count, TEST_HABIT_TARGET);
}
```

---

## Custom Assertions

### Overview
Domain-specific assertions in `tests/common/assertions.rs`.

### Available Assertions

#### `assert_app_error(result, error_type)`
Assert that a result contains a specific error type.

```rust
#[sqlx::test]
async fn test_error_handling(pool: PgPool) {
    use crate::tests::common::assertions::*;
    
    let result = create_invalid_habit(&pool).await;
    assert_app_error(&result, "ValidationError");
}
```

#### `assert_not_nil_uuid(id)`
Assert that a UUID is not nil.

```rust
let user_id = create_test_user(&pool).await;
assert_not_nil_uuid(user_id);
```

#### `assert_matches_pattern(text, pattern)`
Assert that text matches a regex pattern.

```rust
use crate::tests::common::assertions::*;

assert_matches_pattern(&email, r"^[a-z0-9\.]+@[a-z0-9\.]+$");
```

---

## Writing New Tests

### 1. Choose Test Type
- **Unit test**: No database, tests single component → `tests/unit/`
- **Integration test**: Uses database, tests handler + db → `tests/integration/`
- **System test**: Tests multi-step workflows → `tests/system/`

### 2. Create or Find Test File
```
tests/integration/habits_tests.rs  (if testing habits)
tests/integration/quests_tests.rs  (if testing quests)
etc.
```

### 3. Import Fixtures
```rust
use crate::tests::common::fixtures::*;
use crate::tests::common::constants::*;
use crate::tests::common::assertions::*;
```

### 4. Write Test

```rust
#[sqlx::test]
async fn test_create_habit_with_valid_data_succeeds(pool: PgPool) {
    // Arrange: Set up test data
    let user = create_test_user(&pool).await;
    
    // Act: Perform action
    let habit = create_test_habit(&pool, user).await;
    
    // Assert: Verify result
    assert!(habit.id != uuid::Uuid::nil());
    assert_eq!(habit.frequency, TEST_HABIT_FREQUENCY);
}
```

### 5. Test Naming Convention
```
test_<feature>_<scenario>_<outcome>

Examples:
- test_create_habit_with_valid_data_succeeds
- test_delete_habit_nonexistent_returns_error
- test_list_habits_returns_all_for_user
```

### 6. Assertion Patterns
```rust
// Check success
assert!(result.is_ok());

// Check specific value
assert_eq!(habit.name, expected_name);

// Check error
assert_app_error(&result, "NotFound");

// Check collection
assert_eq!(habits.len(), 3);
assert!(habits.iter().any(|h| h.name == "Test"));

// Check boolean
assert!(user.is_active);
```

---

## Test Structure Template

```rust
//! Test module for [feature]

use crate::tests::common::fixtures::*;
use crate::tests::common::constants::*;
use crate::tests::common::assertions::*;
use sqlx::PgPool;

#[sqlx::test]
async fn test_operation_succeeds(pool: PgPool) {
    // ARRANGE: Set up test data
    let user = create_test_user(&pool).await;
    let input = TestInput {
        // ... setup ...
    };
    
    // ACT: Perform the operation
    let result = perform_operation(&pool, user, input).await;
    
    // ASSERT: Verify the result
    assert!(result.is_ok());
    let output = result.unwrap();
    assert_eq!(output.name, "expected_name");
}

#[sqlx::test]
async fn test_operation_with_invalid_input_fails(pool: PgPool) {
    // ARRANGE
    let user = create_test_user(&pool).await;
    let invalid_input = TestInput::invalid();
    
    // ACT
    let result = perform_operation(&pool, user, invalid_input).await;
    
    // ASSERT
    assert_app_error(&result, "ValidationError");
}
```

---

## Continuous Integration

Tests run automatically on:
- Pull requests to `main`
- Commits to `main`
- Manual trigger via GitHub Actions

See `.github/workflows/test.yml` for configuration.

### Local Testing Before Push
```bash
# Run all tests
cargo test --lib

# Check formatting
rustfmt --check crates/api/src/**/*.rs

# Run clippy
cargo clippy --bin ignition-api

# All three
cargo test --lib && rustfmt --check crates/api/src/**/*.rs && cargo clippy --bin ignition-api
```

---

## FAQ

**Q: Do I need to clean up test data?**  
A: No. The `#[sqlx::test]` macro handles transaction rollback automatically.

**Q: Can tests run in parallel?**  
A: Yes. Each test gets its own transaction, so parallel execution is safe.

**Q: How do I add a new fixture?**  
A: Add a function to `tests/common/fixtures.rs` following the existing patterns.

**Q: How do I test error conditions?**  
A: Use `assert_app_error()` or check `result.is_err()` and examine the error.

**Q: How long can tests take?**  
A: Aim for < 1 second per test. Use `TEST_TIMEOUT_SECS` for special cases.

**Q: What if a test is flaky?**  
A: Ensure no external dependencies (clock, randomness, etc.). Use fixtures instead.

**Q: Can I test HTTP endpoints directly?**  
A: Use `axum-test` for HTTP handler testing. See existing integration tests for examples.

---

## References

- [SQLx testing docs](https://github.com/launchbadge/sqlx/blob/main/docs/testing.md)
- [Tokio testing guide](https://tokio.rs/tokio/topics/testing)
- [Rust testing best practices](https://doc.rust-lang.org/1.30.0/book/2018-edition/ch11-00-testing.html)

