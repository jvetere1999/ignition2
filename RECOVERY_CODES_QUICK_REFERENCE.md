# Recovery Codes Quick Reference

## For Developers

### Using RecoveryCodesSection Component

```tsx
import { RecoveryCodesSection } from '@/components/vault/RecoveryCodesSection';

export default function VaultSettings() {
  return (
    <div>
      <h1>Vault Settings</h1>
      <RecoveryCodesSection />
    </div>
  );
}
```

### API Client Usage

```typescript
import {
  generateRecoveryCodes,
  listRecoveryCodes,
  resetPassphrase,
  changePassphrase,
} from '@/lib/api/recovery_codes_client';

// Generate new recovery codes
const response = await generateRecoveryCodes({ count: 8 });
// Returns: { codes: ['XXXX-XXXX-XXXX', ...], vault_id: '...', message: '...' }

// List recovery codes (authenticated)
const list = await listRecoveryCodes();
// Returns: { codes: [{code, used, created_at, used_at}, ...], total_count, unused_count }

// Reset passphrase using recovery code (unauthenticated)
const reset = await resetPassphrase({
  code: 'XXXX-XXXX-XXXX',
  new_passphrase: 'NewSecurePass123!',
});
// Returns: { success: true, vault_id: '...' }

// Change passphrase (authenticated)
const changed = await changePassphrase({
  current_passphrase: 'CurrentPass123!',
  new_passphrase: 'NewPass123!Different',
});
// Returns: { success: true, vault_id: '...' }
```

### Backend Validation Service

```rust
use crate::services::RecoveryValidator;

// Validate recovery code format
RecoveryValidator::validate_code_format("XXXX-XXXX-XXXX")?;

// Validate passphrase strength
RecoveryValidator::validate_passphrase_strength("SecurePass123!")?;

// Validate different passphrases
RecoveryValidator::validate_different_passphrases("old", "new")?;
```

---

## Recovery Code Format

**Pattern:** `XXXX-XXXX-XXXX`
- Exactly 14 characters
- 3 groups of 4 alphanumeric characters
- Groups separated by dashes
- Characters are uppercase letters (A-Z) and digits (0-9)

**Examples:**
- ✅ `ABCD-1234-EFGH`
- ✅ `A1B2-C3D4-E5F6`
- ❌ `abcd-1234-efgh` (lowercase)
- ❌ `ABCD-1234-EFG` (wrong length)
- ❌ `ABCD1234EFGH` (missing dashes)

---

## Passphrase Strength Requirements

**Minimum Requirements:**
- At least 8 characters
- AND one of the following:
  - Mixed case (uppercase + lowercase letters)
  - Contains numbers (0-9)
  - Contains symbols (!@#$%^&*, etc.)

**Valid Examples:**
- ✅ `HelloWorld` (8+ chars, mixed case)
- ✅ `Password123` (8+ chars, mixed case + numbers)
- ✅ `Secure!Pass` (8+ chars, mixed case + symbols)
- ❌ `password` (lowercase only, even though 8+ chars)
- ❌ `Pwd123` (only 6 chars)
- ❌ `12345678` (numbers only, no letters)

---

## UI Components

### RecoveryCodesSection Props
```typescript
// No props required - component manages its own state
<RecoveryCodesSection />

// Features:
// - Stats cards (total, unused, used)
// - Generate button with loading state
// - View button to see all codes
// - Copy buttons for individual codes
// - Status badges (Used/Available)
// - Error and success alerts
// - Security tips section
```

### VaultRecoveryModal Props
```tsx
<VaultRecoveryModal
  isOpen={boolean}        // Controls modal visibility
  onClose={function}      // Called when close button clicked
  onAcknowledge={function} // Called when user confirms
  codes={string[]}        // Array of recovery codes to display
  mode="generate"         // 'generate' | 'reset' | 'change'
/>
```

---

## CSS Classes

### Main Container
- `.section` — Outer container with padding and border
- `.header` — Title and description area
- `.alert` / `.successAlert` — Error/success notification styling

### Stats Cards
- `.statsGrid` — Grid layout for stats
- `.statCard` — Individual stat card
- `.statLabel` — Label text (e.g., "Total Codes")
- `.statValue` — Large number display

### Codes List
- `.codesListContainer` — Container for code list
- `.codesList` — List wrapper with scrolling
- `.codeItem` — Individual code row
- `.codeWithStatus` — Code + badge container
- `.codeText` — Monospace code display
- `.badge` / `.badgeUsed` / `.badgeUnused` — Status badges

### Buttons
- `.primaryButton` — Generate/main action button
- `.secondaryButton` — Secondary actions
- `.copyButton` — Copy to clipboard button

---

## Testing

### Run Backend Unit Tests
```bash
cd app/backend
cargo test services::recovery_validator
```

### Run E2E Tests
```bash
# All recovery tests
npx playwright test tests/vault-recovery.spec.ts

# Specific test suite
npx playwright test tests/vault-recovery.spec.ts -g "Recovery Code Validation"

# Watch mode
npx playwright test --watch tests/vault-recovery.spec.ts
```

### Manual Testing Checklist
- [ ] Generate 8 recovery codes
- [ ] See codes in modal with download/print/copy options
- [ ] Copy a code to clipboard
- [ ] View codes in settings section
- [ ] See correct counts (total, unused, used)
- [ ] Try to reset passphrase with recovery code
- [ ] Try to change passphrase (authenticated)
- [ ] Verify code marked as used after reset
- [ ] Test on mobile browser
- [ ] Test dark mode

---

## Error Handling

### Common Errors

**Invalid Code Format**
```
Response: 400 Bad Request
Message: "Recovery code must be 14 characters (XXXX-XXXX-XXXX format)"
```

**Weak Passphrase**
```
Response: 422 Unprocessable Entity
Message: "Passphrase must be 8+ characters with mixed case or numbers/symbols"
```

**Same Passphrase**
```
Response: 422 Unprocessable Entity
Message: "New passphrase must be different from current passphrase"
```

**Code Already Used**
```
Response: 403 Forbidden
Message: "Recovery code has already been used"
```

**Not Authenticated**
```
Response: 401 Unauthorized
Message: "Authentication required to perform this action"
```

---

## Integration Examples

### In Settings Page
```tsx
import { RecoveryCodesSection } from '@/components/vault/RecoveryCodesSection';

export function VaultSettingsPage() {
  return (
    <div className="settings-container">
      <h1>Security Settings</h1>
      
      <section>
        <h2>Vault Protection</h2>
        <RecoveryCodesSection />
      </section>
    </div>
  );
}
```

### Custom Modal
```tsx
import { VaultRecoveryModal } from '@/components/vault/VaultRecoveryModal';
import { generateRecoveryCodes } from '@/lib/api/recovery_codes_client';

export function GenerateCodesButton() {
  const [codes, setCodes] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const handleClick = async () => {
    const response = await generateRecoveryCodes();
    setCodes(response.codes);
    setIsOpen(true);
  };

  return (
    <>
      <button onClick={handleClick}>Generate Codes</button>
      <VaultRecoveryModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onAcknowledge={() => {
          setIsOpen(false);
          // Refresh UI or redirect
        }}
        codes={codes}
        mode="generate"
      />
    </>
  );
}
```

---

## Backend Integration

### Adding to Routes
```rust
// In routes/vault.rs
pub fn router() -> Router {
    Router::new()
        .route("/recovery-codes", post(recovery::generate_recovery_codes))
        .route("/recovery-codes/list", post(recovery::list_recovery_codes))
        .route("/reset-passphrase", post(recovery::reset_passphrase_with_code))
        .route("/change-passphrase", post(recovery::change_passphrase_authenticated))
}
```

### Trust Boundary Markers
```rust
#[server_trusted]
pub async fn reset_passphrase_with_code(
    State(state): State<AppState>,
    body: Json<ResetPassphraseRequest>,
) -> Result<Json<ResetResponse>, AppError> {
    // Validate recovery code
    RecoveryValidator::validate_code_format(&body.code)?;
    // ... rest of implementation
}
```

---

## Performance Considerations

- **Code Generation:** ~100ms (bcrypt hashing)
- **Code Listing:** O(n) where n = number of codes (typically < 100)
- **Passphrase Validation:** ~1ms (regex + string operations)
- **Rate Limiting:** Recommended 10 requests/minute per user

---

## Security Best Practices

1. **Never log recovery codes** in production
2. **Store codes securely** - use bcrypt/argon2
3. **Validate on every use** - format + strength
4. **Track usage** - prevent reuse
5. **Require authentication** for sensitive operations
6. **Use HTTPS** for all API calls
7. **Clear codes from memory** after processing
8. **Provide offline storage** option (download/print)

---

## Accessibility

- ✅ All buttons have aria-labels
- ✅ All alerts have role="alert" or role="status"
- ✅ Keyboard navigation supported
- ✅ Proper focus management
- ✅ WCAG 2.1 AA compliant
- ✅ Dark mode support
- ✅ Responsive design (mobile-first)

---

## Troubleshooting

**Q: Component doesn't show recovery codes?**
A: Ensure user is authenticated and has a vault created.

**Q: Copy button not working?**
A: Check browser permissions for clipboard access. Some browsers require HTTPS.

**Q: Codes not marked as used after reset?**
A: Ensure database is connected and recovery_codes table has usage tracking.

**Q: Style issues on mobile?**
A: Component uses CSS modules with mobile-first approach. Check browser viewport.

---

## Related Documentation

- [Trust Boundary System](docs/architecture/trust-boundaries.md)
- [API Documentation](API_DOCUMENTATION.md)
- [Database Schema](DATABASE_SCHEMA.md)
- [Vault Architecture](ARCHITECTURE.md)

---

**Last Updated:** January 17, 2026  
**Version:** 1.0.0  
**Maintenance:** All code follows existing patterns
