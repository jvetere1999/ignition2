'use client';

import React, { useState } from 'react';
import styles from './VaultRecoveryModal.module.css';

export interface RecoveryCode {
  code: string;
  createdAt: string;
}

interface VaultRecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAcknowledge: () => void;
  codes?: string[];
  mode?: 'generate' | 'reset' | 'change';
}

/**
 * Modal for displaying and managing recovery codes
 * 
 * Modes:
 * - generate: Show newly generated codes with download/print/copy options
 * - reset: Password reset flow using recovery code
 * - change: Authenticated password change
 */
export const VaultRecoveryModal: React.FC<VaultRecoveryModalProps> = ({
  isOpen,
  onClose,
  onAcknowledge,
  codes = [],
  mode = 'generate',
}) => {
  const [copied, setCopied] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  if (!isOpen) return null;

  const handleCopyToClipboard = async () => {
    const codesText = codes.join('\n');
    try {
      await navigator.clipboard.writeText(codesText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy codes:', error);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const printContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Passion OS Recovery Codes</title>
            <style>
              body { font-family: monospace; padding: 20px; }
              h1 { font-size: 24px; margin-bottom: 20px; }
              .code { font-size: 18px; margin: 10px 0; letter-spacing: 2px; }
              .warning { margin-top: 30px; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <h1>Recovery Codes - Passion OS</h1>
            <p>Save these codes in a secure location. Each code can be used once.</p>
            <div>
              ${codes.map(code => `<div class="code">${code}</div>`).join('')}
            </div>
            <div class="warning">
              <p>⚠️ IMPORTANT:</p>
              <ul>
                <li>Store these codes somewhere safe (password manager, printed copy, etc.)</li>
                <li>Do NOT share these codes with anyone</li>
                <li>Each code can only be used once to reset your passphrase</li>
                <li>If you lose these codes and forget your passphrase, you will lose access to your vault</li>
              </ul>
            </div>
          </body>
        </html>
      `;
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleDownload = () => {
    const codesText = `Recovery Codes - Passion OS
Generated: ${new Date().toLocaleString()}

Save these codes in a secure location. Each code can be used once.

${codes.join('\n')}

IMPORTANT:
- Store these codes somewhere safe (password manager, printed copy, etc.)
- Do NOT share these codes with anyone
- Each code can only be used once to reset your passphrase
- If you lose these codes and forget your passphrase, you will lose access to your vault

Learn more at: https://passion-os.com/security/recovery-codes`;

    const blob = new Blob([codesText], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `passion-recovery-codes-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handleAcknowledge = () => {
    setAcknowledged(true);
    onAcknowledge();
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        {mode === 'generate' && (
          <>
            <div className={styles.header}>
              <h2>Recovery Codes Generated</h2>
              <button
                className={styles.closeButton}
                onClick={onClose}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className={styles.content}>
              <div className={styles.warningBox}>
                <h3>⚠️ Save These Codes Now</h3>
                <p>
                  These recovery codes are your only way to access your vault if you forget your passphrase.
                  Save them in a safe, secure location such as a password manager or printed copy.
                </p>
              </div>

              <div className={styles.codesContainer}>
                <div className={styles.codesBox}>
                  {codes.map((code, index) => (
                    <div key={index} className={styles.code}>
                      {code}
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.actionButtons}>
                <button
                  className={styles.actionButton}
                  onClick={handleCopyToClipboard}
                >
                  {copied ? '✓ Copied!' : 'Copy All'}
                </button>
                <button
                  className={styles.actionButton}
                  onClick={handleDownload}
                >
                  Download
                </button>
                <button
                  className={styles.actionButton}
                  onClick={handlePrint}
                >
                  🖨️ Print
                </button>
              </div>

              <div className={styles.disclaimer}>
                <p><strong>Important Reminders:</strong></p>
                <ul>
                  <li>Never share these codes with anyone</li>
                  <li>Each code can only be used once</li>
                  <li>Store them offline if possible</li>
                  <li>We cannot help you recover your vault without these codes</li>
                </ul>
              </div>

              <div className={styles.checkboxGroup}>
                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={acknowledged}
                    onChange={(e) => setAcknowledged(e.target.checked)}
                  />
                  <span>I have saved my recovery codes in a safe location</span>
                </label>
              </div>
            </div>

            <div className={styles.footer}>
              <button
                className={styles.primaryButton}
                onClick={handleAcknowledge}
                disabled={!acknowledged}
              >
                Continue
              </button>
            </div>
          </>
        )}

        {mode === 'reset' && (
          <>
            <div className={styles.header}>
              <h2>Reset Passphrase</h2>
              <button
                className={styles.closeButton}
                onClick={onClose}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className={styles.content}>
              <p>Enter one of your recovery codes to reset your vault passphrase.</p>
              <p className={styles.note}>Recovery codes are found in your saved recovery codes file.</p>
            </div>
          </>
        )}

        {mode === 'change' && (
          <>
            <div className={styles.header}>
              <h2>Change Passphrase</h2>
              <button
                className={styles.closeButton}
                onClick={onClose}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className={styles.content}>
              <p>Change your vault passphrase and generate new recovery codes.</p>
              <p className={styles.note}>You&apos;ll be asked to verify your current passphrase.</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
