'use client';

import React, { useEffect, useState } from 'react';
import { Lock, Globe } from 'lucide-react';

export type PrivacyMode = 'standard' | 'private';

interface PrivacyToggleProps {
  value: PrivacyMode;
  onChange?: (mode: PrivacyMode) => void;
  disabled?: boolean;
  showLabel?: boolean;
}

/**
 * Privacy Mode Toggle Component
 * Allows users to classify content as Private (not logged) or Standard (normal logging)
 */
export const PrivacyToggle: React.FC<PrivacyToggleProps> = ({
  value,
  onChange,
  disabled = false,
  showLabel = true,
}) => {
  const isPrivate = value === 'private';

  return (
    <div className="flex items-center gap-2">
      {showLabel && (
        <span className="text-sm font-medium text-gray-700">
          {isPrivate ? 'Private' : 'Standard'}
        </span>
      )}
      <button
        onClick={() => onChange?.(isPrivate ? 'standard' : 'private')}
        disabled={disabled}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg border transition-all
          ${
            isPrivate
              ? 'bg-red-50 border-red-300 text-red-700'
              : 'bg-gray-50 border-gray-300 text-gray-700'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-400'}
        `}
        title={
          isPrivate
            ? 'Private: Not logged or analyzed'
            : 'Standard: Normal logging and analytics'
        }
      >
        {isPrivate ? (
          <>
            <Lock size={16} />
            <span>Private</span>
          </>
        ) : (
          <>
            <Globe size={16} />
            <span>Standard</span>
          </>
        )}
      </button>
    </div>
  );
};

interface PrivacyPreferencesData {
  default_mode: PrivacyMode;
  show_privacy_toggle: boolean;
  exclude_private_from_search: boolean;
  private_content_retention_days: number;
  standard_content_retention_days: number;
}

interface PrivacyPreferencesFormProps {
  onSave?: (prefs: PrivacyPreferencesData) => void;
}

/**
 * Privacy Preferences Settings Form
 * Allows users to configure privacy defaults and retention policies
 */
export const PrivacyPreferencesForm: React.FC<PrivacyPreferencesFormProps> = ({
  onSave,
}) => {
  const [prefs, setPrefs] = useState<PrivacyPreferencesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const response = await fetch('/api/privacy/preferences', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setPrefs(data);
      }
    } catch (error) {
      console.error('Failed to fetch privacy preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!prefs) return;

    setSaving(true);
    try {
      const response = await fetch('/api/privacy/preferences', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs),
      });

      if (response.ok) {
        onSave?.(prefs);
      }
    } catch (error) {
      console.error('Failed to save privacy preferences:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-gray-500">Loading preferences...</div>;
  }

  if (!prefs) {
    return <div className="text-red-500">Failed to load preferences</div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">Privacy Mode Settings</h3>

        {/* Default Mode */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Default Privacy Mode for New Content
          </label>
          <div className="flex gap-4">
            <button
              onClick={() =>
                setPrefs({ ...prefs, default_mode: 'standard' })
              }
              className={`px-4 py-2 rounded-lg border ${
                prefs.default_mode === 'standard'
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'border-gray-300 text-gray-700'
              }`}
            >
              <Globe className="inline mr-2" size={16} />
              Standard
            </button>
            <button
              onClick={() => setPrefs({ ...prefs, default_mode: 'private' })}
              className={`px-4 py-2 rounded-lg border ${
                prefs.default_mode === 'private'
                  ? 'bg-red-50 border-red-300 text-red-700'
                  : 'border-gray-300 text-gray-700'
              }`}
            >
              <Lock className="inline mr-2" size={16} />
              Private
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            New content will default to this privacy mode
          </p>
        </div>

        {/* Toggle Visibility */}
        <div className="mb-6">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={prefs.show_privacy_toggle}
              onChange={(e) =>
                setPrefs({ ...prefs, show_privacy_toggle: e.target.checked })
              }
              className="w-4 h-4"
            />
            <span className="text-sm font-medium">
              Show privacy toggle in content editors
            </span>
          </label>
          <p className="text-sm text-gray-500 mt-1">
            When enabled, you can change privacy mode when creating content
          </p>
        </div>

        {/* Exclude Private from Search */}
        <div className="mb-6">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={prefs.exclude_private_from_search}
              onChange={(e) =>
                setPrefs({
                  ...prefs,
                  exclude_private_from_search: e.target.checked,
                })
              }
              className="w-4 h-4"
            />
            <span className="text-sm font-medium">
              Exclude private content from search
            </span>
          </label>
          <p className="text-sm text-gray-500 mt-1">
            Private content will not appear in search results
          </p>
        </div>

        {/* Retention Policies */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-3">Data Retention</h4>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Private Content Retention (days)
              </label>
              <input
                type="number"
                min="0"
                max="365"
                value={prefs.private_content_retention_days}
                onChange={(e) =>
                  setPrefs({
                    ...prefs,
                    private_content_retention_days: parseInt(e.target.value) || 0,
                  })
                }
                className="w-32 px-3 py-2 border border-gray-300 rounded mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                0 = Keep indefinitely
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">
                Standard Content Retention (days)
              </label>
              <input
                type="number"
                min="0"
                max="365"
                value={prefs.standard_content_retention_days}
                onChange={(e) =>
                  setPrefs({
                    ...prefs,
                    standard_content_retention_days:
                      parseInt(e.target.value) || 365,
                  })
                }
                className="w-32 px-3 py-2 border border-gray-300 rounded mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                0 = Keep indefinitely
              </p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </div>

      {/* Info Box */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">Privacy Modes</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>
            <strong>Standard:</strong> Normal logging, analytics, and full
            retention
          </li>
          <li>
            <strong>Private:</strong> Minimal logging, excluded from analytics,
            shorter retention
          </li>
        </ul>
      </div>
    </div>
  );
};
