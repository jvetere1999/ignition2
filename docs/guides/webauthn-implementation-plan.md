# WebAuthn Implementation - Complete Action Plan

## Phase 1: Backend Routes & Handlers (Week 1)

### Step 1.1: Add WebAuthn Routes to `app/backend/crates/api/src/routes/auth.rs`

Add these routes to the router after existing auth routes:

```rust
.route("/webauthn/register-options", get(webauthn_register_options))
.route("/webauthn/register-verify", post(webauthn_register_verify))
.route("/webauthn/signin-options", get(webauthn_signin_options))
.route("/webauthn/signin-verify", post(webauthn_signin_verify))
```

### Step 1.2: Create WebAuthn Types & Requests

File: `app/backend/crates/api/src/routes/webauthn_types.rs`

```rust
use serde::{Deserialize, Serialize};
use webauthn_rs::prelude::*;

#[derive(Serialize, Deserialize)]
pub struct RegisterOptionsRequest {
    pub user_id: String,
}

#[derive(Serialize, Deserialize)]
pub struct RegisterOptionsResponse {
    pub options: CreationChallengeResponse,
}

#[derive(Serialize, Deserialize)]
pub struct RegisterVerifyRequest {
    pub credential: RegisterPublicKeyCredential,
}

#[derive(Serialize, Deserialize)]
pub struct RegisterVerifyResponse {
    pub success: bool,
    pub credential_id: String,
}

#[derive(Serialize, Deserialize)]
pub struct SigninOptionsResponse {
    pub options: RequestChallengeResponse,
}

#[derive(Serialize, Deserialize)]
pub struct SigninVerifyRequest {
    pub credential: PublicKeyCredential,
}

#[derive(Serialize, Deserialize)]
pub struct SigninVerifyResponse {
    pub user_id: String,
    pub session_token: String,
}
```

### Step 1.3: Create WebAuthn Service Layer

File: `app/backend/crates/api/src/services/webauthn.rs`

```rust
use webauthn_rs::prelude::*;
use uuid::Uuid;
use crate::error::AppResult;
use crate::db::authenticator_repos::AuthenticatorRepo;

pub struct WebAuthnService {
    webauthn: Webauthn,
}

impl WebAuthnService {
    pub fn new(rp_id: &str, origin: &str) -> AppResult<Self> {
        let webauthn = Webauthn::new(
            rp_id,
            &Url::parse(origin)?,
        );
        Ok(Self { webauthn })
    }

    pub fn start_register(&self, user_id: Uuid, user_name: &str) -> AppResult<CreationChallengeResponse> {
        let user_unique_id = user_id.as_bytes().to_vec();
        
        let (ccr, reg_state) = self.webauthn.start_passkey_registration(
            &user_unique_id,
            user_name,
            user_name,
            None,
        )?;

        // Store reg_state in Redis with TTL (10 minutes)
        // Key: webauthn:register:{user_id}:{challenge_hash}
        
        Ok(ccr)
    }

    pub fn finish_register(
        &self,
        user_id: Uuid,
        credential: RegisterPublicKeyCredential,
        repo: &AuthenticatorRepo,
    ) -> AppResult<String> {
        // Retrieve reg_state from Redis
        // Verify credential
        let passkey = self.webauthn.finish_passkey_registration(&credential, &reg_state)?;
        
        // Store in database
        let credential_id = repo.create_authenticator(
            user_id,
            &passkey.cred_public_key.cred_public_key,
            &passkey.cred_public_key.cred_id,
            0, // counter
        )?;

        Ok(credential_id)
    }

    pub fn start_signin(&self) -> AppResult<RequestChallengeResponse> {
        let (rcr, auth_state) = self.webauthn.start_passkey_authentication(
            &[], // Empty list - user will select credential
        )?;

        // Store auth_state in Redis with TTL (10 minutes)
        // Key: webauthn:signin:{challenge_hash}
        
        Ok(rcr)
    }

    pub fn finish_signin(
        &self,
        credential: PublicKeyCredential,
        credential_id: &str,
        repo: &AuthenticatorRepo,
    ) -> AppResult<(Uuid, u32)> {
        // Retrieve auth_state from Redis
        // Get stored credential from database
        // Verify assertion
        let auth_result = self.webauthn.finish_passkey_authentication(&credential, &auth_state)?;
        
        // Update counter in database
        let user_id = repo.update_authenticator_counter(
            credential_id,
            auth_result.counter,
        )?;

        Ok((user_id, auth_result.counter))
    }
}
```

### Step 1.4: Create Authenticator Repository

File: `app/backend/crates/api/src/db/authenticator_repos.rs`

```rust
use uuid::Uuid;
use sqlx::PgPool;
use crate::error::{AppError, AppResult};

pub struct AuthenticatorRepo;

impl AuthenticatorRepo {
    pub async fn create_authenticator(
        pool: &PgPool,
        user_id: Uuid,
        public_key: &[u8],
        credential_id: &str,
        counter: u32,
    ) -> AppResult<String> {
        let cred_id = uuid::Uuid::new_v4().to_string();
        
        sqlx::query(
            "INSERT INTO authenticators (id, user_id, credential_id, credential_public_key, counter)
             VALUES ($1, $2, $3, $4, $5)"
        )
        .bind(&cred_id)
        .bind(user_id)
        .bind(credential_id)
        .bind(public_key)
        .bind(counter as i64)
        .execute(pool)
        .await?;

        Ok(cred_id)
    }

    pub async fn get_by_credential_id(
        pool: &PgPool,
        credential_id: &str,
    ) -> AppResult<Option<(Uuid, Vec<u8>, i64)>> {
        let row = sqlx::query_as::<_, (uuid::Uuid, Vec<u8>, i64)>(
            "SELECT user_id, credential_public_key, counter FROM authenticators WHERE credential_id = $1"
        )
        .bind(credential_id)
        .fetch_optional(pool)
        .await?;

        Ok(row)
    }

    pub async fn update_counter(
        pool: &PgPool,
        credential_id: &str,
        new_counter: u32,
    ) -> AppResult<()> {
        sqlx::query(
            "UPDATE authenticators SET counter = $1 WHERE credential_id = $2"
        )
        .bind(new_counter as i64)
        .bind(credential_id)
        .execute(pool)
        .await?;

        Ok(())
    }
}
```

### Step 1.5: Implement Handler Functions

Add to `app/backend/crates/api/src/routes/auth.rs`:

```rust
async fn webauthn_register_options(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthContext>,
    Json(payload): Json<RegisterOptionsRequest>,
) -> AppResult<Json<RegisterOptionsResponse>> {
    let service = WebAuthnService::new("ignition.ecent.online", &state.config.server.frontend_url)?;
    let options = service.start_register(auth.user_id, &auth.user.email)?;
    Ok(Json(RegisterOptionsResponse { options }))
}

async fn webauthn_register_verify(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthContext>,
    Json(payload): Json<RegisterVerifyRequest>,
) -> AppResult<Json<RegisterVerifyResponse>> {
    let service = WebAuthnService::new("ignition.ecent.online", &state.config.server.frontend_url)?;
    let repo = AuthenticatorRepo;
    let credential_id = service.finish_register(auth.user_id, payload.credential, &repo).await?;
    Ok(Json(RegisterVerifyResponse {
        success: true,
        credential_id,
    }))
}

async fn webauthn_signin_options(
    State(state): State<Arc<AppState>>,
) -> AppResult<Json<SigninOptionsResponse>> {
    let service = WebAuthnService::new("ignition.ecent.online", &state.config.server.frontend_url)?;
    let options = service.start_signin()?;
    Ok(Json(SigninOptionsResponse { options }))
}

async fn webauthn_signin_verify(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<SigninVerifyRequest>,
) -> AppResult<Json<SigninVerifyResponse>> {
    let service = WebAuthnService::new("ignition.ecent.online", &state.config.server.frontend_url)?;
    let repo = AuthenticatorRepo;
    let (user_id, _counter) = service.finish_signin(
        payload.credential,
        &payload.credential.id,
        &repo,
    ).await?;
    
    // Create session
    let session_token = create_session_cookie(&user_id)?;
    
    Ok(Json(SigninVerifyResponse {
        user_id: user_id.to_string(),
        session_token,
    }))
}
```

---

## Phase 2: Frontend Integration (Week 1)

### Step 2.1: Update Sign-In Flow

File: `app/frontend/src/app/auth/signin/PasskeySignIn.tsx` - Already correct, no changes needed

### Step 2.2: Update Onboarding Modal

File: `app/frontend/src/components/onboarding/OnboardingModal.tsx` - Already correct, no changes needed

### Step 2.3: Wire Session to Auth Context

File: `app/frontend/src/lib/auth/AuthContext.tsx`

After WebAuthn signin succeeds, extract session from response and store it:

```typescript
const response = await safeFetch(`${API_BASE_URL}/api/auth/webauthn/signin-verify`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ credential })
});

const data = await response.json();
setUser(data.user);
setAccessToken(data.session_token);
persistAuthState(data.user, data.session_token, null, null);
```

---

## Phase 3: Testing (Week 2)

### Step 3.1: E2E Test - Registration Flow

File: `tests/e2e/webauthn.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('WebAuthn Registration', () => {
  test('Complete passkey registration in onboarding', async ({ page, context }) => {
    // 1. Sign up with OAuth
    await page.goto('http://localhost:3000/auth/signup');
    await page.click('button:has-text("Google")');
    // ... OAuth flow ...
    
    // 2. Should see onboarding with passkey step
    await expect(page.locator('text=Create Passkey')).toBeVisible();
    
    // 3. Click Create Passkey (simulated credential)
    const cdpSession = await context.newCDPSession(page);
    await cdpSession.send('WebAuthn.enable');
    await cdpSession.send('WebAuthn.addCredential', {
      credentialId: Buffer.from('test-id').toString('base64'),
      isResidentCredential: true,
      privateKey: Buffer.from('test-key').toString('base64'),
      signCount: 0,
      rpId: 'localhost',
    });
    
    await page.click('button:has-text("Create Passkey")');
    await expect(page.locator('text=Passkey registered')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('WebAuthn Sign In', () => {
  test('Sign in with registered passkey', async ({ page, context }) => {
    // 1. Navigate to signin
    await page.goto('http://localhost:3000/auth/signin');
    
    // 2. Setup virtual authenticator
    const cdpSession = await context.newCDPSession(page);
    await cdpSession.send('WebAuthn.enable');
    
    // 3. Click Sign In with Passkey
    await page.click('button:has-text("Sign In with Passkey")');
    
    // 4. Should redirect to dashboard
    await expect(page).toHaveURL(/.*\/today/);
  });
});
```

### Step 3.2: Unit Tests - WebAuthn Service

File: `app/backend/crates/api/tests/webauthn_tests.rs`

```rust
#[tokio::test]
async fn test_register_flow() {
    let service = WebAuthnService::new("localhost", "http://localhost:3000").unwrap();
    let user_id = Uuid::new_v4();
    
    let options = service.start_register(user_id, "test@example.com").unwrap();
    assert!(!options.public_key.challenge.is_empty());
}

#[tokio::test]
async fn test_signin_flow() {
    let service = WebAuthnService::new("localhost", "http://localhost:3000").unwrap();
    let options = service.start_signin().unwrap();
    assert!(!options.public_key.challenge.is_empty());
}
```

---

## Phase 4: Deployment & Cutover (Week 3)

### Step 4.1: Environment Configuration

Add to backend config:

```toml
[webauthn]
rp_id = "ignition.ecent.online"
origin = "https://ignition.ecent.online"
timeout_ms = 60000
```

### Step 4.2: Add Dependencies

File: `app/backend/Cargo.toml`

```toml
webauthn-rs = "0.4"
webauthn-rs-proto = "0.4"
base64 = "0.21"
redis = "0.23" # For storing challenges
```

### Step 4.3: Database Migration

File: `app/database/migrations/0XXX_add_webauthn_session_tracking.sql`

```sql
-- Track WebAuthn challenges temporarily
CREATE TABLE webauthn_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    challenge TEXT NOT NULL UNIQUE,
    challenge_type TEXT NOT NULL, -- 'registration' or 'authentication'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '10 minutes'
);

CREATE INDEX idx_webauthn_challenges_user_id ON webauthn_challenges(user_id);
CREATE INDEX idx_webauthn_challenges_expires_at ON webauthn_challenges(expires_at);
```

---

## Implementation Checklist

### Backend
- [ ] Add WebAuthn routes to auth.rs
- [ ] Create webauthn_types.rs with request/response types
- [ ] Create services/webauthn.rs with WebAuthnService
- [ ] Create db/authenticator_repos.rs with CRUD operations
- [ ] Implement 4 handler functions
- [ ] Add Cargo dependencies
- [ ] Create database migration
- [ ] Add environment config

### Frontend
- [ ] Verify PasskeySignIn.tsx is correct (should be)
- [ ] Verify OnboardingModal.tsx is correct (should be)
- [ ] Update AuthContext to handle WebAuthn session
- [ ] Test signin flow end-to-end

### Testing
- [ ] E2E tests for registration flow
- [ ] E2E tests for signin flow
- [ ] Counter/cloning detection tests
- [ ] Error handling tests

### Deployment
- [ ] Review security (attestation validation, CSRF)
- [ ] Load testing
- [ ] Production rollout (feature flag optional)

---

## Security Checklist

- [ ] Verify RP ID matches production domain
- [ ] Verify origin URL is correct
- [ ] Implement attestation validation
- [ ] Implement counter checking for cloning detection
- [ ] Store challenges with TTL (expire after 10 min)
- [ ] Rate limiting on signin/register attempts
- [ ] HTTPS only in production
- [ ] Secure cookie flags for session

---

## Timeline

- **Day 1-2:** Backend route setup + types
- **Day 3-4:** WebAuthn service layer
- **Day 5:** Handler functions + database ops
- **Day 6:** Frontend integration + testing
- **Day 7:** E2E tests + deployment prep

**Total: 1 week for complete implementation**

