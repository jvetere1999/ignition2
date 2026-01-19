'use client';

import React, { useState, useEffect } from 'react';
import {
  generateRecoveryCodes,
  listRecoveryCodes,
  ListRecoveryCodesResponse,
  RecoveryCodeMetadata,
  getErrorMessage,
} from '@/lib/api/recovery_codes_client';
import { VaultRecoveryModal } from './VaultRecoveryModal';
import styles from './RecoveryCodesSection.module.css';

/**
 * Recovery Codes Management Section
 * 
 * Provides UI for:
 * - Generating recovery codes
 * - Viewing code status (used/unused)
 * - Copying individual codes
 * - Visual tracking of code usage
 */
export const RecoveryCodesSection: React.FC = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showListModal, setShowListModal] = useState(false);
  
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);
  const [recoveryCodesList, setRecoveryCodesList] = useState<RecoveryCodeMetadata[]>([]);
  const [stats, setStats] = useState({ total: 0, unused: 0, used: 0 });
  
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<string>('');

  // Load recovery codes list on component mount
  useEffect(() => {
    loadRecoveryCodesList();
  }, []);

  const loadRecoveryCodesList = async () => {
    setIsLoadingList(true);
    setError('');
    try {
      const response: ListRecoveryCodesResponse = await listRecoveryCodes();
      setRecoveryCodesList(response.codes);
      setStats({
        total: response.total_count,
        unused: response.unused_count,
        used: response.total_count - response.unused_count,
      });
    } catch (err) {
      setError(`Failed to load recovery codes: ${getErrorMessage(err)}`);
    } finally {
      setIsLoadingList(false);
    }
  };

  const handleGenerateClick = async () => {
    setIsGenerating(true);
    setError('');
    setSuccessMessage('');
    try {
      const response = await generateRecoveryCodes({ count: 8 });
      setGeneratedCodes(response.codes);
      setShowGenerateModal(true);
    } catch (err) {
      setError(`Failed to generate recovery codes: ${getErrorMessage(err)}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleViewCodes = () => {
    setShowListModal(true);
  };

  const handleGenerateClose = () => {
    setShowGenerateModal(false);
    setGeneratedCodes([]);
  };

  const handleGenerateAcknowledge = () => {
    setShowGenerateModal(false);
    setGeneratedCodes([]);
    setSuccessMessage('Recovery codes generated successfully');
    // Refresh the list
    loadRecoveryCodesList();
    // Clear success message after 5 seconds
    setTimeout(() => setSuccessMessage(''), 5000);
  };

  const handleListClose = () => {
    setShowListModal(false);
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(''), 2000);
    } catch (err) {
      setError('Failed to copy code');
    }
  };

  const formatDate = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className={styles.section}>
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>Recovery Codes</h3>
          <p className={styles.description}>
            Recovery codes allow you to regain access to your vault if you forget your passphrase.
          </p>
        </div>
      </div>

      {error && (
        <div className={styles.alert} role="alert">
          <span className={styles.alertIcon}>⚠️</span>
          <span>{error}</span>
          <button
            className={styles.alertClose}
            onClick={() => setError('')}
            aria-label="Close alert"
          >
            ×
          </button>
        </div>
      )}

      {successMessage && (
        <div className={styles.successAlert} role="status">
          <span className={styles.alertIcon}>✓</span>
          <span>{successMessage}</span>
          <button
            className={styles.alertClose}
            onClick={() => setSuccessMessage('')}
            aria-label="Close alert"
          >
            ×
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Total Codes</div>
          <div className={styles.statValue}>{stats.total}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Unused</div>
          <div className={styles.statValue} style={{ color: stats.unused > 0 ? '#22c55e' : '#999' }}>
            {stats.unused}
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Used</div>
          <div className={styles.statValue} style={{ color: stats.used > 0 ? '#ef4444' : '#999' }}>
            {stats.used}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className={styles.actions}>
        <button
          className={styles.primaryButton}
          onClick={handleGenerateClick}
          disabled={isGenerating}
          title="Generate 8 new recovery codes"
        >
          {isGenerating ? 'Generating...' : '+ Generate New Codes'}
        </button>
        <button
          className={styles.secondaryButton}
          onClick={handleViewCodes}
          disabled={isLoadingList || stats.total === 0}
          title="View all recovery codes"
        >
          {isLoadingList ? 'Loading...' : `View ${stats.total} Codes`}
        </button>
      </div>

      {/* Recovery Codes List */}
      {stats.total > 0 && (
        <div className={styles.codesListContainer}>
          <h4 className={styles.listTitle}>Your Recovery Codes</h4>
          
          {isLoadingList ? (
            <div className={styles.loadingState}>
              <div className={styles.spinner}></div>
              <p>Loading recovery codes...</p>
            </div>
          ) : recoveryCodesList.length > 0 ? (
            <div className={styles.codesList}>
              {recoveryCodesList.map((codeEntry, index) => (
                <div key={index} className={`${styles.codeItem} ${codeEntry.used ? styles.codeItemUsed : ''}`}>
                  <div className={styles.codeContent}>
                    <div className={styles.codeWithStatus}>
                      <code className={styles.codeText}>{codeEntry.code}</code>
                      <span className={`${styles.badge} ${codeEntry.used ? styles.badgeUsed : styles.badgeUnused}`}>
                        {codeEntry.used ? 'Used' : 'Available'}
                      </span>
                    </div>
                    <div className={styles.codeTimestamp}>
                      Created: {formatDate(codeEntry.created_at)}
                      {codeEntry.used_at && (
                        <>
                          <br />
                          Used: {formatDate(codeEntry.used_at)}
                        </>
                      )}
                    </div>
                  </div>
                  <button
                    className={styles.copyButton}
                    onClick={() => handleCopyCode(codeEntry.code)}
                    title="Copy to clipboard"
                    disabled={codeEntry.used}
                  >
                    {copiedCode === codeEntry.code ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <p>No recovery codes found</p>
            </div>
          )}
        </div>
      )}

      {/* Warning Box */}
      <div className={styles.warningBox}>
        <h4 className={styles.warningTitle}>🔒 Security Tips</h4>
        <ul className={styles.warningList}>
          <li>Store recovery codes in a secure location (password manager, safe, etc.)</li>
          <li>Never share your recovery codes with anyone</li>
          <li>Each code can only be used once to reset your passphrase</li>
          <li>Generate new codes periodically after using existing ones</li>
          <li>If you lose all codes and forget your passphrase, you cannot recover your vault</li>
        </ul>
      </div>

      {/* Modals */}
      <VaultRecoveryModal
        isOpen={showGenerateModal}
        onClose={handleGenerateClose}
        onAcknowledge={handleGenerateAcknowledge}
        codes={generatedCodes}
        mode="generate"
      />
    </div>
  );
};

export default RecoveryCodesSection;
