"use client";

import { useState, useRef } from "react";
import { Cloud, Music, AlertCircle, CheckCircle2, Upload, Loader } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Alert,
  AlertDescription,
  Input,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Textarea,
  Progress,
} from "@/components/ui";
import { getApiBaseUrl } from "@/lib/config/environment";

const API_BASE_URL = getApiBaseUrl();

const SUPPORTED_FORMATS = [".als", ".flp", ".logicx", ".serum"];
const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024; // 5GB
const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB

interface ProjectUploadProps {
  onUploadComplete?: () => void;
}

export default function ProjectUpload({ onUploadComplete }: ProjectUploadProps) {
  const [projectName, setProjectName] = useState("");
  const [contentType, setContentType] = useState<string>("");
  const [description, setDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // Validate file type
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!SUPPORTED_FORMATS.includes(ext)) {
      setError(
        `Invalid file format. Supported formats: ${SUPPORTED_FORMATS.join(", ")}`
      );
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setError(
        `File too large. Maximum size is 5GB. Your file is ${(file.size / (1024 * 1024 * 1024)).toFixed(2)}GB`
      );
      return;
    }

    setSelectedFile(file);
    setContentType(ext);

    // Auto-fill project name from filename
    if (!projectName) {
      setProjectName(file.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const calculateFileHash = async (file: File): Promise<string> => {
    const buffer = await file.slice(0, 1024 * 1024).arrayBuffer(); // Hash first 1MB for speed
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  };

  const initiateUpload = async (): Promise<string | null> => {
    if (!selectedFile || !projectName.trim() || !contentType) {
      setError("Please fill in all required fields");
      return null;
    }

    try {
      const fileHash = await calculateFileHash(selectedFile);

      const response = await fetch(`${API_BASE_URL}/api/daw/`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_name: projectName.trim(),
          content_type: contentType,
          total_size: selectedFile.size,
          file_hash: fileHash,
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || "Failed to initiate upload");
      }

      const data = (await response.json()) as { session_id: string };
      return data.session_id;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to initiate upload");
      return null;
    }
  };

  const uploadChunks = async (sessionId: string): Promise<boolean> => {
    if (!selectedFile) return false;

    try {
      const totalChunks = Math.ceil(selectedFile.size / CHUNK_SIZE);

      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, selectedFile.size);
        const chunk = selectedFile.slice(start, end);

        const formData = new FormData();
        formData.append("chunk", chunk);
        formData.append("chunk_number", i.toString());
        formData.append("total_chunks", totalChunks.toString());

        const response = await fetch(
          `${API_BASE_URL}/api/daw/upload/${sessionId}/chunk`,
          {
            method: "POST",
            credentials: "include",
            body: formData,
          }
        );

        if (!response.ok) {
          throw new Error(
            `Failed to upload chunk ${i + 1}/${totalChunks}`
          );
        }

        const progress = Math.round(((i + 1) / totalChunks) * 90); // 90% for chunks
        setUploadProgress(progress);
      }

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload chunks");
      return false;
    }
  };

  const completeUpload = async (sessionId: string): Promise<boolean> => {
    if (!selectedFile) return false;

    try {
      const fileHash = await calculateFileHash(selectedFile);

      const response = await fetch(
        `${API_BASE_URL}/api/daw/upload/${sessionId}/complete`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            file_hash: fileHash,
            change_description: description.trim() || "Initial upload",
          }),
        }
      );

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || "Failed to complete upload");
      }

      setUploadProgress(100);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to complete upload");
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setUploadProgress(0);
    setUploading(true);

    try {
      // Step 1: Initiate upload
      const sessionId = await initiateUpload();
      if (!sessionId) {
        setUploading(false);
        return;
      }

      setUploadProgress(10);

      // Step 2: Upload chunks
      const chunksSuccess = await uploadChunks(sessionId);
      if (!chunksSuccess) {
        setUploading(false);
        return;
      }

      // Step 3: Complete upload
      const completeSuccess = await completeUpload(sessionId);
      if (!completeSuccess) {
        setUploading(false);
        return;
      }

      setSuccess(true);
      setProjectName("");
      setContentType("");
      setDescription("");
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      // Callback after successful upload
      setTimeout(() => {
        onUploadComplete?.();
      }, 1500);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="border-slate-700 bg-slate-900/50">
      <CardHeader>
        <CardTitle className="text-white">Upload New Project</CardTitle>
        <CardDescription className="text-slate-400">
          Upload a DAW project file with automatic versioning and encryption
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert className="mb-6 border-red-500/50 bg-red-500/10">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <AlertDescription className="text-red-400">{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-6 border-green-500/50 bg-green-500/10">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-green-400">
              Project uploaded successfully!
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File Input */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Project File *
            </label>
            <div className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center hover:border-purple-500 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm text-slate-400">
                {selectedFile ? selectedFile.name : "Click to select or drag file here"}
              </p>
              <p className="text-xs text-slate-500 mt-1">Max 5GB</p>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                accept={SUPPORTED_FORMATS.join(",")}
                className="hidden"
                disabled={uploading}
              />
            </div>
          </div>

          {/* Project Name */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Project Name *
            </label>
            <Input
              value={projectName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProjectName(e.target.value)}
              placeholder="My Awesome Track"
              disabled={uploading}
              className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
            />
          </div>

          {/* Content Type */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              File Format *
            </label>
            <Select value={contentType} onValueChange={setContentType} disabled={uploading}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {SUPPORTED_FORMATS.map((format) => (
                  <SelectItem key={format} value={format} className="text-white">
                    {format === ".als"
                      ? "Ableton Live (.als)"
                      : format === ".flp"
                        ? "FL Studio (.flp)"
                        : format === ".logicx"
                          ? "Logic Pro (.logicx)"
                          : "Serum Preset (.serum)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Change Description
            </label>
            <Textarea
              value={description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
              placeholder="Describe what changed in this version..."
              disabled={uploading}
              className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 resize-none"
              rows={4}
            />
            <p className="text-xs text-slate-500 mt-1">Optional</p>
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2 bg-slate-700" />
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={!selectedFile || uploading || !projectName.trim() || !contentType}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
          >
            {uploading ? (
              <>
                <Loader className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload Project
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
