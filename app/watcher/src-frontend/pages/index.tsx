"use client";

import React, { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import WatcherWindow from "@/components/watcher/WatcherWindow";
import SyncStatus from "@/components/watcher/SyncStatus";
import ProjectList from "@/components/watcher/ProjectList";
import Settings from "@/components/watcher/Settings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Clock } from "lucide-react";

interface WatchedProject {
  id: string;
  name: string;
  path: string;
  daw_type: string;
  last_sync: string | null;
  sync_status: string;
  created_at: string;
}

interface SyncStatusInfo {
  syncing: boolean;
  total_files_synced: number;
  total_storage_bytes: number;
  last_sync_time: string | null;
}

export default function WatcherApp() {
  const [projects, setProjects] = useState<WatchedProject[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatusInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("status");

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000); // Refresh every 5s
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      setError(null);
      const [projectsData, statusData] = await Promise.all([
        invoke<WatchedProject[]>("get_watched_projects"),
        invoke<SyncStatusInfo>("get_sync_status"),
      ]);
      setProjects(projectsData);
      setSyncStatus(statusData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                <Clock className="w-8 h-8 text-purple-400" />
                DAW Watcher
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                Automatic DAW file syncing and backup
              </p>
            </div>
            <div className="text-right">
              <div className={`text-sm font-medium ${
                syncStatus?.syncing 
                  ? "text-yellow-400" 
                  : "text-green-400"
              }`}>
                {syncStatus?.syncing ? "🔄 Syncing..." : "✓ Idle"}
              </div>
              {syncStatus?.last_sync_time && (
                <p className="text-xs text-slate-500">
                  Last sync: {new Date(syncStatus.last_sync_time).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert className="mb-6 border-red-500/50 bg-red-500/10">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <AlertDescription className="text-red-400">{error}</AlertDescription>
          </Alert>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-2xl grid-cols-3 bg-slate-800 border border-slate-700">
            <TabsTrigger 
              value="status"
              className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
            >
              Status
            </TabsTrigger>
            <TabsTrigger 
              value="projects"
              className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
            >
              Projects ({projects.length})
            </TabsTrigger>
            <TabsTrigger 
              value="settings"
              className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
            >
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Status Tab */}
          <TabsContent value="status" className="mt-6">
            {syncStatus && <SyncStatus status={syncStatus} />}
          </TabsContent>

          {/* Projects Tab */}
          <TabsContent value="projects" className="mt-6">
            {loading ? (
              <div className="text-center py-12 text-slate-400">
                Loading projects...
              </div>
            ) : (
              <ProjectList 
                projects={projects} 
                onProjectsChange={loadData}
              />
            )}
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="mt-6">
            <Settings onSettingsSaved={loadData} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
