'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useErrorStore } from '@/lib/hooks/useErrorNotification';

// Recovery code API responses
export interface RecoveryCodeResponse {
  codes: string[];
  vault_id: string;
  message: string;
}

export interface ChangePassphraseResponse {
  message: string;
  vault_id: string;
}

export interface ResetPassphraseResponse {
  message: string;
  vault_id: string;
}

// API client types
interface VaultRecoveryContextType {
  // State
  codes: string[];
  isLoading: boolean;
  error: string | null;
  isModalOpen: boolean;
  modalMode: 'generate' | 'reset' | 'change';

  // Actions
  generateRecoveryCodes: () => Promise<void>;
  resetPassphrase: (code: string, newPassphrase: string) => Promise<void>;
  changePassphrase: (currentPassphrase: string, newPassphrase: string) => Promise<void>;
  openModal: (mode?: 'generate' | 'reset' | 'change') => void;
  closeModal: () => void;
  clearCodes: () => void;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.ecent.online';

// Create context
const VaultRecoveryContext = createContext<VaultRecoveryContextType | undefined>(undefined);

// Provider component
export const VaultRecoveryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [codes, setCodes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'generate' | 'reset' | 'change'>('generate');
  const { addError } = useErrorStore();

  // Helper function to make API requests
  const apiRequest = async <T,>(
    path: string,
    method: 'GET' | 'POST' = 'GET',
    body?: Record<string, unknown>
  ): Promise<T> => {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as Record<string, unknown>;
      const errorMessage = (errorData.error as string) || `API error: ${response.status}`;
      throw new Error(errorMessage);
    }

    const data = await response.json() as Record<string, unknown>;
    return (data.data as T) || (data as T);
  };

  // Generate recovery codes
  const generateRecoveryCodes = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiRequest<RecoveryCodeResponse>(
        '/api/vault/recovery-codes',
        'POST'
      );
      setCodes(result.codes);
      addError({
        id: `recovery-success-${Date.now()}`,
        timestamp: new Date(),
        type: 'info',
        message: 'Recovery codes generated. Please save them in a secure location.',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate recovery codes';
      setError(message);
      addError({
        id: `recovery-error-${Date.now()}`,
        timestamp: new Date(),
        type: 'error',
        message,
        endpoint: '/api/vault/recovery-codes',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Reset passphrase using recovery code
  const resetPassphrase = async (code: string, newPassphrase: string) => {
    setIsLoading(true);
    setError(null);
    try {
      if (newPassphrase.length < 8) {
        throw new Error('Passphrase must be at least 8 characters');
      }

      const result = await apiRequest<ResetPassphraseResponse>(
        '/api/vault/reset-passphrase',
        'POST',
        {
          code,
          new_passphrase: newPassphrase,
        }
      );

      addError({
        id: `reset-success-${Date.now()}`,
        timestamp: new Date(),
        type: 'info',
        message: result.message || 'Passphrase reset successfully',
      });

      // Close modal and clear codes
      closeModal();
      clearCodes();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to reset passphrase';
      setError(message);
      addError({
        id: `reset-error-${Date.now()}`,
        timestamp: new Date(),
        type: 'error',
        message,
        endpoint: '/api/vault/reset-passphrase',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Change passphrase (authenticated)
  const changePassphrase = async (currentPassphrase: string, newPassphrase: string) => {
    setIsLoading(true);
    setError(null);
    try {
      if (!currentPassphrase || !newPassphrase) {
        throw new Error('Current and new passphrases are required');
      }

      if (newPassphrase.length < 8) {
        throw new Error('New passphrase must be at least 8 characters');
      }

      if (currentPassphrase === newPassphrase) {
        throw new Error('New passphrase must be different from current passphrase');
      }

      const result = await apiRequest<ChangePassphraseResponse>(
        '/api/vault/change-passphrase',
        'POST',
        {
          current_passphrase: currentPassphrase,
          new_passphrase: newPassphrase,
        }
      );

      addError({
        id: `change-success-${Date.now()}`,
        timestamp: new Date(),
        type: 'info',
        message: result.message || 'Passphrase changed successfully. All recovery codes have been revoked.',
      });

      // Close modal and clear codes
      closeModal();
      clearCodes();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to change passphrase';
      setError(message);
      addError({
        id: `change-error-${Date.now()}`,
        timestamp: new Date(),
        type: 'error',
        message,
        endpoint: '/api/vault/change-passphrase',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Modal controls
  const openModal = (mode: 'generate' | 'reset' | 'change' = 'generate') => {
    setModalMode(mode);
    setIsModalOpen(true);
    setError(null);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const clearCodes = () => {
    setCodes([]);
  };

  const value: VaultRecoveryContextType = {
    codes,
    isLoading,
    error,
    isModalOpen,
    modalMode,
    generateRecoveryCodes,
    resetPassphrase,
    changePassphrase,
    openModal,
    closeModal,
    clearCodes,
  };

  return (
    <VaultRecoveryContext.Provider value={value}>
      {children}
    </VaultRecoveryContext.Provider>
  );
};

// Custom hook
export const useVaultRecovery = (): VaultRecoveryContextType => {
  const context = useContext(VaultRecoveryContext);
  if (!context) {
    throw new Error('useVaultRecovery must be used within VaultRecoveryProvider');
  }
  return context;
};

export default VaultRecoveryContext;
