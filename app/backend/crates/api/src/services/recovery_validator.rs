//! Recovery Code Validation Service
//!
//! Provides validation for recovery codes including:
//! - Format validation (correct length and character set)
//! - Passphrase strength validation
//! - Rate limiting for recovery attempts

use crate::error::AppError;

/// Recovery code validation service
pub struct RecoveryValidator;

impl RecoveryValidator {
    /// Validate recovery code format
    ///
    /// Valid format: XXXX-XXXX-XXXX (12 alphanumeric characters with dashes)
    ///
    /// # Errors
    /// Returns `AppError::BadRequest` if format is invalid
    pub fn validate_code_format(code: &str) -> Result<(), AppError> {
        // Code should be in format: XXXX-XXXX-XXXX
        if code.len() != 14 {
            return Err(AppError::BadRequest(
                "Recovery code must be 14 characters (XXXX-XXXX-XXXX format)".to_string(),
            ));
        }

        // Check format manually: groups of 4 alphanumeric separated by dashes
        let parts: Vec<&str> = code.split('-').collect();
        if parts.len() != 3 {
            return Err(AppError::BadRequest(
                "Recovery code must have 3 groups separated by dashes".to_string(),
            ));
        }

        for part in parts {
            if part.len() != 4 {
                return Err(AppError::BadRequest(
                    "Each code group must be exactly 4 characters".to_string(),
                ));
            }

            if !part
                .chars()
                .all(|c| c.is_ascii_alphanumeric() && c.is_ascii_uppercase())
            {
                return Err(AppError::BadRequest(
                    "Code must contain only uppercase letters and numbers: XXXX-XXXX-XXXX"
                        .to_string(),
                ));
            }
        }

        Ok(())
    }

    /// Validate passphrase strength for vault recovery
    ///
    /// Requirements:
    /// - Minimum 8 characters
    /// - Should have mixed case OR numbers/symbols (basic entropy check)
    ///
    /// # Errors
    /// Returns `AppError::BadRequest` if passphrase is too weak
    pub fn validate_passphrase_strength(passphrase: &str) -> Result<(), AppError> {
        if passphrase.is_empty() {
            return Err(AppError::BadRequest(
                "Passphrase cannot be empty".to_string(),
            ));
        }

        if passphrase.len() < 8 {
            return Err(AppError::BadRequest(
                "Passphrase must be at least 8 characters".to_string(),
            ));
        }

        // Check for basic entropy: mixed case or presence of numbers/symbols
        let has_lowercase = passphrase.chars().any(|c| c.is_lowercase());
        let has_uppercase = passphrase.chars().any(|c| c.is_uppercase());
        let has_non_alpha = passphrase.chars().any(|c| !c.is_alphabetic());

        let entropy_good = (has_lowercase && has_uppercase) || has_non_alpha;

        if !entropy_good {
            return Err(AppError::BadRequest(
                "Passphrase should use mixed case OR include numbers/symbols for better security"
                    .to_string(),
            ));
        }

        Ok(())
    }

    /// Validate that old and new passphrases are different
    ///
    /// # Errors
    /// Returns `AppError::BadRequest` if passphrases are identical
    pub fn validate_different_passphrases(old: &str, new: &str) -> Result<(), AppError> {
        if old == new {
            return Err(AppError::BadRequest(
                "New passphrase must be different from current passphrase".to_string(),
            ));
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_recovery_code_format() {
        assert!(RecoveryValidator::validate_code_format("ABCD-1234-WXYZ").is_ok());
    }

    #[test]
    fn test_invalid_recovery_code_too_short() {
        assert!(RecoveryValidator::validate_code_format("ABC-123-XYZ").is_err());
    }

    #[test]
    fn test_invalid_recovery_code_lowercase() {
        assert!(RecoveryValidator::validate_code_format("abcd-1234-wxyz").is_err());
    }

    #[test]
    fn test_valid_passphrase_mixed_case() {
        assert!(RecoveryValidator::validate_passphrase_strength("MyPassphrase").is_ok());
    }

    #[test]
    fn test_valid_passphrase_with_numbers() {
        assert!(RecoveryValidator::validate_passphrase_strength("password123").is_ok());
    }

    #[test]
    fn test_invalid_passphrase_too_short() {
        assert!(RecoveryValidator::validate_passphrase_strength("pass123").is_err());
    }

    #[test]
    fn test_invalid_passphrase_low_entropy() {
        assert!(RecoveryValidator::validate_passphrase_strength("allalphabet").is_err());
    }

    #[test]
    fn test_different_passphrases_valid() {
        assert!(RecoveryValidator::validate_different_passphrases("old123", "new456").is_ok());
    }

    #[test]
    fn test_different_passphrases_invalid() {
        assert!(RecoveryValidator::validate_different_passphrases("same123", "same123").is_err());
    }
}
