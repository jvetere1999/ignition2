"use client";

import React, { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import WatcherWindow from "./WatcherWindow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2 } from "lucide-react";

interface Settings {
  auto_sync_enabled: boolean;
  sync_interval_secs: number;
  max_file_size_mb: number;
  upload_chunk_size_mb: number;
  encrypt_files: boolean;
  api_base_url: string;
  auth_token: string | null;
}

interface SettingsProps {
  onSettingsSaved: () => void;
}

export default function Settings({ onSettingsSaved }: SettingsProps) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await invoke<Settings>("get_settings");
      setSettings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(false);
      await invoke("update_settings", { settings });
      setSuccess(true);
      onSettingsSaved();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <WatcherWindow title="Settings" subtitle="Loading...">
        <div className="text-center py-8 text-slate-400">Loading settings...</div>
      </WatcherWindow>
    );
  }

  if (!settings) return null;

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {error && (
        <Alert className="border-red-500/50 bg-red-500/10">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <AlertDescription className="text-red-400">{error}</AlertDescription>
        </Alert>
      )}

      {/* Success Alert */}
      {success && (
        <Alert className="border-green-500/50 bg-green-500/10">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <AlertDescription className="text-green-400">
            Settings saved successfully
          </AlertDescription>
        </Alert>
      )}

      {/* Sync Settings */}
      <WatcherWindow
        title="Sync Settings"
        subtitle="Configure automatic synchronization"
      >
        <div className="space-y-6">
          {/* Auto Sync Toggle */}
          <div className="flex items-center justify-between p-4 bg-slate-800 rounded-lg">
            <div>
              <p className="font-medium text-white">Auto-Sync Enabled</p>
              <p className="text-sm text-slate-400">
                Automatically upload changes to cloud
              </p>
            </div>
            <Switch
              checked={settings.auto_sync_enabled}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, auto_sync_enabled: checked })
              }
            />
          </div>

          {/* Sync Interval */}
          <div>
            <label className="text-sm font-medium text-white block mb-2">
              Sync Interval (seconds)
            </label>
            <Input
              type="number"
              min="60"
              max="3600"
              value={settings.sync_interval_secs}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  sync_interval_secs: parseInt(e.target.value),
                })
              }
              className="bg-slate-700 border-slate-600 text-white"
            />
            <p className="text-xs text-slate-500 mt-1">
              How often to check for changes (60-3600 seconds)
            </p>
          </div>

          {/* Encryption Toggle */}
          <div className="flex items-center justify-between p-4 bg-slate-800 rounded-lg">
            <div>
              <p className="font-medium text-white">File Encryption</p>
              <p className="text-sm text-slate-400">
                Encrypt files before upload (AES-256-GCM)
              </p>
            </div>
            <Switch
              checked={settings.encrypt_files}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, encrypt_files: checked })
              }
            />
          </div>
        </div>
      </WatcherWindow>

      {/* File Settings */}
      <WatcherWindow
        title="File Settings"
        subtitle="Configure file handling"
      >
        <div className="space-y-6">
          {/* Max File Size */}
          <div>
            <label className="text-sm font-medium text-white block mb-2">
              Max File Size (MB)
            </label>
            <Input
              type="number"
              min="100"
              max="5000"
              value={settings.max_file_size_mb}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  max_file_size_mb: parseInt(e.target.value),
                })
              }
              className="bg-slate-700 border-slate-600 text-white"
            />
            <p className="text-xs text-slate-500 mt-1">
              Files larger than this will not be uploaded (100-5000 MB)
            </p>
          </div>

          {/* Upload Chunk Size */}
          <div>
            <label className="text-sm font-medium text-white block mb-2">
              Upload Chunk Size (MB)
            </label>
            <Input
              type="number"
              min="1"
              max="50"
              value={settings.upload_chunk_size_mb}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  upload_chunk_size_mb: parseInt(e.target.value),
                })
              }
              className="bg-slate-700 border-slate-600 text-white"
            />
            <p className="text-xs text-slate-500 mt-1">
              Smaller chunks for slower connections (1-50 MB)
            </p>
          </div>
        </div>
      </WatcherWindow>

      {/* API Settings */}
      <WatcherWindow
        title="API Settings"
        subtitle="Configure backend connection"
      >
        <div className="space-y-6">
          {/* API Base URL */}
          <div>
            <label className="text-sm font-medium text-white block mb-2">
              API Base URL
            </label>
            <Input
              type="text"
              value={settings.api_base_url}
              onChange={(e) =>
                setSettings({ ...settings, api_base_url: e.target.value })
              }
              className="bg-slate-700 border-slate-600 text-white font-mono text-xs"
            />
            <p className="text-xs text-slate-500 mt-1">
              Backend server address for uploads
            </p>
          </div>

          {/* Auth Token */}
          <div>
            <label className="text-sm font-medium text-white block mb-2">
              Authentication Token
            </label>
            <Input
              type="password"
              placeholder="Enter your auth token"
              value={settings.auth_token || ""}
              onChange={(e) =>
                setSettings({ ...settings, auth_token: e.target.value })
              }
              className="bg-slate-700 border-slate-600 text-white font-mono text-xs"
            />
            <p className="text-xs text-slate-500 mt-1">
              Bearer token for API authentication
            </p>
          </div>
        </div>
      </WatcherWindow>

      {/* Save Button */}
      <div className="flex gap-2 justify-end">
        <Button
          variant="outline"
          onClick={loadSettings}
          className="border-slate-600"
        >
          Reset
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-purple-600 hover:bg-purple-700"
        >
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}
