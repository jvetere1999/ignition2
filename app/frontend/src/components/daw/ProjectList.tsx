"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Alert,
  AlertDescription,
} from "@/components/ui";
import { MoreVertical, Download, History, Trash2, Music, AlertCircle } from "lucide-react";
import { getApiBaseUrl } from "@/lib/config/environment";

const API_BASE_URL = getApiBaseUrl();

interface Project {
  id: string;
  project_name: string;
  content_type: string;
  file_size: number;
  version_count: number;
  created_at: string;
  updated_at: string;
  current_version_id: string;
}

interface ProjectListProps {
  projects: Project[];
  onRefresh: () => void;
  formatBytes: (bytes: number) => string;
}

export default function ProjectList({
  projects,
  onRefresh,
  formatBytes,
}: ProjectListProps) {
  const [deleting, setDeleting] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getFormatIcon = (contentType: string): string => {
    switch (contentType) {
      case ".als":
        return "🎵";
      case ".flp":
        return "🎹";
      case ".logicx":
        return "🎼";
      case ".serum":
        return "🌊";
      default:
        return "📁";
    }
  };

  const getFormatLabel = (contentType: string): string => {
    switch (contentType) {
      case ".als":
        return "Ableton Live";
      case ".flp":
        return "FL Studio";
      case ".logicx":
        return "Logic Pro";
      case ".serum":
        return "Serum Preset";
      default:
        return contentType;
    }
  };

  const handleDelete = async (projectId: string) => {
    if (!window.confirm("Are you sure you want to delete this project? This action cannot be undone.")) {
      return;
    }

    try {
      setDeleting(projectId);
      setError(null);

      const response = await fetch(
        `${API_BASE_URL}/api/daw/${projectId}`,
        {
          method: "DELETE",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete project");
      }

      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete project");
    } finally {
      setDeleting(null);
    }
  };

  const handleDownload = async (projectId: string, versionId: string) => {
    try {
      setDownloading(projectId);
      setError(null);

      const response = await fetch(
        `${API_BASE_URL}/api/daw/${projectId}/download/${versionId}`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to generate download link");
      }

      const data = (await response.json()) as { download_url: string };

      // Redirect to presigned URL
      window.location.href = data.download_url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to download project");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <Alert className="border-red-500/50 bg-red-500/10">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <AlertDescription className="text-red-400">{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((project) => (
          <Card
            key={project.id}
            className="border-slate-700 bg-slate-900/50 hover:border-purple-500/50 transition-colors"
          >
            <CardContent className="pt-6">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl">
                        {getFormatIcon(project.content_type)}
                      </span>
                      <h3 className="text-lg font-semibold text-white truncate">
                        {project.project_name}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500">
                      {getFormatLabel(project.content_type)}
                    </p>
                  </div>

                  {/* Menu */}
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
                        onClick={() => handleDownload(project.id, project.current_version_id)}
                        disabled={downloading === project.id}
                        className="text-slate-400 hover:text-white"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        asChild
                        className="text-slate-400 hover:text-white"
                      >
                        <Link href={`/daw-projects/${project.id}/versions`}>
                          <History className="w-4 h-4 mr-2" />
                          History
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(project.id)}
                        disabled={deleting === project.id}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                  <div>
                    <p className="text-xs text-slate-500">File Size</p>
                    <p className="text-sm font-medium text-white">
                      {formatBytes(project.file_size)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Versions</p>
                    <p className="text-sm font-medium text-white">
                      {project.version_count}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-slate-500">Last Modified</p>
                    <p className="text-xs text-slate-400">
                      {formatDate(project.updated_at)}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2 border-t border-slate-800 flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-800"
                    onClick={() => handleDownload(project.id, project.current_version_id)}
                    disabled={downloading === project.id}
                  >
                    {downloading === project.id ? "Downloading..." : "Download"}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-800"
                    asChild
                  >
                    <Link href={`/daw-projects/${project.id}/versions`}>
                      Versions
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
