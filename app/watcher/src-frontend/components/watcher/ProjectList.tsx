"use client";

import React, { useState } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import WatcherWindow from "./WatcherWindow";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  MoreVertical,
  Plus,
  Trash2,
  Folder,
  Music,
  AlertCircle,
} from "lucide-react";

interface Project {
  id: string;
  name: string;
  path: string;
  daw_type: string;
  last_sync: string | null;
  sync_status: string;
  created_at: string;
}

interface ProjectListProps {
  projects: Project[];
  onProjectsChange: () => void;
}

const DAW_TYPES = [
  { value: "ableton", label: "Ableton Live", icon: "🎵" },
  { value: "flstudio", label: "FL Studio", icon: "🎹" },
  { value: "logic", label: "Logic Pro", icon: "🎼" },
  { value: "cubase", label: "Cubase", icon: "🎚️" },
  { value: "protools", label: "Pro Tools", icon: "🎛️" },
];

export default function ProjectList({
  projects,
  onProjectsChange,
}: ProjectListProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedPath, setSelectedPath] = useState("");
  const [selectedDaw, setSelectedDaw] = useState("ableton");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleSelectFolder = async () => {
    // TODO: Implement folder picker using tauri dialog
    // For now, just accept manual input
  };

  const handleAddProject = async () => {
    if (!selectedPath.trim() || !selectedDaw) {
      setError("Please select a directory and DAW type");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await invoke("add_watch_directory", {
        path: selectedPath,
        daw_type: selectedDaw,
      });
      setSelectedPath("");
      setSelectedDaw("ableton");
      setShowAddDialog(false);
      onProjectsChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add project");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveProject = async (projectId: string) => {
    if (!window.confirm("Remove this watched project?")) return;

    try {
      setDeleting(projectId);
      await invoke("remove_watch_directory", { project_id: projectId });
      onProjectsChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove project");
    } finally {
      setDeleting(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "text-green-400";
      case "error":
        return "text-red-400";
      case "syncing":
        return "text-yellow-400";
      default:
        return "text-slate-400";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return "✓";
      case "error":
        return "✕";
      case "syncing":
        return "⟳";
      default:
        return "—";
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString();
  };

  const getDawIcon = (dawType: string) => {
    return DAW_TYPES.find((d) => d.value === dawType)?.icon || "📁";
  };

  const getDawLabel = (dawType: string) => {
    return DAW_TYPES.find((d) => d.value === dawType)?.label || dawType;
  };

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {error && (
        <Alert className="border-red-500/50 bg-red-500/10">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <AlertDescription className="text-red-400">{error}</AlertDescription>
        </Alert>
      )}

      {/* Add Project Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <Button className="bg-purple-600 hover:bg-purple-700 gap-2">
          <Plus className="w-4 h-4" />
          Watch Project
        </Button>

        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Add Watched Project</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* DAW Type */}
            <div>
              <label className="text-sm font-medium text-white block mb-2">
                DAW Type
              </label>
              <Select value={selectedDaw} onValueChange={setSelectedDaw}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {DAW_TYPES.map((daw) => (
                    <SelectItem key={daw.value} value={daw.value} className="text-white">
                      {daw.icon} {daw.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Path Input */}
            <div>
              <label className="text-sm font-medium text-white block mb-2">
                Project Directory
              </label>
              <div className="flex gap-2">
                <Input
                  value={selectedPath}
                  onChange={(e) => setSelectedPath(e.target.value)}
                  placeholder="/Users/username/Music/Project"
                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="border-slate-600"
                  onClick={handleSelectFolder}
                >
                  <Folder className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 justify-end pt-4">
              <Button
                variant="outline"
                onClick={() => setShowAddDialog(false)}
                className="border-slate-600"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddProject}
                disabled={loading}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {loading ? "Adding..." : "Add Project"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Projects List */}
      <WatcherWindow
        title="Watched Projects"
        subtitle={`${projects.length} project${projects.length !== 1 ? "s" : ""} being monitored`}
      >
        {projects.length === 0 ? (
          <div className="text-center py-12">
            <Music className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 mb-4">No projects being watched</p>
            <Button className="bg-purple-600 hover:bg-purple-700">
              <Plus className="w-4 h-4 mr-2" />
              Add First Project
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {projects.map((project) => (
              <div
                key={project.id}
                className="flex items-center justify-between p-4 bg-slate-800 rounded-lg hover:bg-slate-750 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{getDawIcon(project.daw_type)}</span>
                    <h3 className="font-medium text-white truncate">
                      {project.name}
                    </h3>
                    <span className={`text-lg ${getStatusColor(project.sync_status)}`}>
                      {getStatusIcon(project.sync_status)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate">
                    {project.path}
                  </p>
                  <p className="text-xs text-slate-600 mt-1">
                    {getDawLabel(project.daw_type)} • Last sync:{" "}
                    {formatDate(project.last_sync)}
                  </p>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                    <DropdownMenuItem
                      onClick={() => handleRemoveProject(project.id)}
                      disabled={deleting === project.id}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remove Watch
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )}
      </WatcherWindow>
    </div>
  );
}
