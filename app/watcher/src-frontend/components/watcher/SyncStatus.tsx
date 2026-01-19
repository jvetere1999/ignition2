"use client";

import React from "react";
import WatcherWindow from "./WatcherWindow";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, AlertCircle, Clock } from "lucide-react";

interface SyncStatusProps {
  status: {
    syncing: boolean;
    total_files_synced: number;
    total_storage_bytes: number;
    last_sync_time: string | null;
  };
}

export default function SyncStatus({ status }: SyncStatusProps) {
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const formatTime = (dateString: string | null): string => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <WatcherWindow 
        title="Sync Status"
        subtitle="Real-time synchronization activity"
      >
        <div className="space-y-4">
          {/* Status Indicator */}
          <div className="flex items-center gap-3 p-4 bg-slate-800 rounded-lg">
            {status.syncing ? (
              <>
                <div className="animate-spin">
                  <Clock className="w-6 h-6 text-yellow-400" />
                </div>
                <div>
                  <p className="font-medium text-white">Currently Syncing</p>
                  <p className="text-sm text-slate-400">
                    Uploading projects to cloud
                  </p>
                </div>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-6 h-6 text-green-400" />
                <div>
                  <p className="font-medium text-white">Idle</p>
                  <p className="text-sm text-slate-400">
                    Monitoring for changes
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-800 rounded-lg">
              <p className="text-xs text-slate-400 uppercase tracking-wider">
                Files Synced
              </p>
              <p className="text-2xl font-bold text-white mt-2">
                {status.total_files_synced}
              </p>
            </div>
            <div className="p-4 bg-slate-800 rounded-lg">
              <p className="text-xs text-slate-400 uppercase tracking-wider">
                Storage Used
              </p>
              <p className="text-2xl font-bold text-white mt-2">
                {formatBytes(status.total_storage_bytes)}
              </p>
            </div>
          </div>

          {/* Last Sync */}
          <div className="p-4 bg-slate-800 rounded-lg">
            <p className="text-xs text-slate-400 uppercase tracking-wider">
              Last Sync
            </p>
            <p className="text-white mt-2">
              {formatTime(status.last_sync_time)}
            </p>
          </div>
        </div>
      </WatcherWindow>

      {/* Auto-Sync Info */}
      <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
        <p className="text-sm text-blue-300">
          💡 <strong>Auto-sync enabled:</strong> Changes to DAW projects are
          automatically detected and uploaded every 5 minutes.
        </p>
      </div>

      {/* Encryption Notice */}
      <div className="p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
        <p className="text-sm text-green-300">
          🔒 <strong>All files are encrypted:</strong> AES-256-GCM encryption
          protects your projects during transfer and storage.
        </p>
      </div>
    </div>
  );
}
