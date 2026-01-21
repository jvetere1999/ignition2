"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Alert,
  AlertDescription,
} from "@/components/ui";
import ProjectUpload from "@/components/daw/ProjectUpload";
import ProjectList from "@/components/daw/ProjectList";
import StorageUsage from "@/components/daw/StorageUsage";
import { AlertCircle, Music, Upload } from "lucide-react";
import { getApiBaseUrl } from "@/lib/config/environment";

const API_BASE_URL = getApiBaseUrl();

interface DawProject {
  id: string;
  project_name: string;
  content_type: string;
  file_size: number;
  version_count: number;
  created_at: string;
  updated_at: string;
  current_version_id: string;
}

interface StorageInfo {
  projects: DawProject[];
  total_count: number;
  total_storage_bytes: number;
}

export default function DawProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<DawProject[]>([]);
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("projects");

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE_URL}/api/daw/`, {
        method: "GET",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        if (response.status === 401) {
          router.push("/login");
          return;
        }
        throw new Error(`Failed to fetch projects: ${response.status}`);
      }

      const data = (await response.json()) as StorageInfo;
      setStorageInfo(data);
      setProjects(data.projects || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load projects"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleUploadComplete = () => {
    // Refresh projects list after successful upload
    fetchProjects();
    setActiveTab("projects");
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Music className="w-8 h-8 text-purple-400" />
            <h1 className="text-4xl font-bold text-white">DAW Projects</h1>
          </div>
          <p className="text-slate-400">
            Manage and version control your music production files securely
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert className="mb-6 border-red-500/50 bg-red-500/10">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <AlertDescription className="text-red-400">{error}</AlertDescription>
          </Alert>
        )}

        {/* Storage Information */}
        {storageInfo && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card className="border-slate-700 bg-slate-900/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-400">
                  Projects
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {storageInfo.total_count}
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-700 bg-slate-900/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-400">
                  Storage Used
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {formatBytes(storageInfo.total_storage_bytes)}
                </div>
                <p className="text-xs text-slate-500">of 100 GB available</p>
              </CardContent>
            </Card>

            <Card className="border-slate-700 bg-slate-900/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-400">
                  Available
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-400">
                  {formatBytes(100 * 1024 * 1024 * 1024 - storageInfo.total_storage_bytes)}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Storage Usage Bar */}
        {storageInfo && (
          <StorageUsage
            used={storageInfo.total_storage_bytes}
            total={100 * 1024 * 1024 * 1024}
          />
        )}

        {/* Main Content Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="mt-8"
        >
          <TabsList className="grid w-full max-w-md grid-cols-2 bg-slate-800 border border-slate-700">
            <TabsTrigger 
              value="projects"
              className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
            >
              Projects
            </TabsTrigger>
            <TabsTrigger 
              value="upload"
              className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload New
            </TabsTrigger>
          </TabsList>

          {/* Projects Tab */}
          <TabsContent value="projects" className="mt-6">
            {loading ? (
              <Card className="border-slate-700 bg-slate-900/50">
                <CardContent className="pt-8">
                  <div className="text-center text-slate-400">
                    Loading projects...
                  </div>
                </CardContent>
              </Card>
            ) : projects.length === 0 ? (
              <Card className="border-slate-700 bg-slate-900/50">
                <CardContent className="pt-8 text-center">
                  <Music className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">
                    No projects yet
                  </h3>
                  <p className="text-slate-400 mb-6">
                    Upload your first DAW project to get started
                  </p>
                  <Button
                    onClick={() => setActiveTab("upload")}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    Upload Project
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <ProjectList
                projects={projects}
                onRefresh={fetchProjects}
                formatBytes={formatBytes}
              />
            )}
          </TabsContent>

          {/* Upload Tab */}
          <TabsContent value="upload" className="mt-6">
            <ProjectUpload onUploadComplete={handleUploadComplete} />
          </TabsContent>
        </Tabs>

        {/* Information Section */}
        <Card className="mt-12 border-slate-700 bg-slate-900/50">
          <CardHeader>
            <CardTitle className="text-white">Supported Formats</CardTitle>
            <CardDescription className="text-slate-400">
              Upload projects in any of these DAW formats
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[".als", ".flp", ".logicx", ".serum"].map((format) => (
                <div
                  key={format}
                  className="p-4 bg-slate-800 border border-slate-700 rounded-lg text-center"
                >
                  <p className="font-mono text-purple-400 font-bold">{format}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {format === ".als"
                      ? "Ableton Live"
                      : format === ".flp"
                        ? "FL Studio"
                        : format === ".logicx"
                          ? "Logic Pro"
                          : "Serum Preset"}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-6 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
              <p className="text-sm text-blue-300">
                💡 <strong>Tip:</strong> All files are encrypted end-to-end and
                stored securely in the cloud. You can restore previous versions
                at any time.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
