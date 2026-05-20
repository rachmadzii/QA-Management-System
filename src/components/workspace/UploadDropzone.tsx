"use client";

import React, { useState, useCallback } from "react";
import { uploadScreenshot } from "@/lib/storage";
import { UploadCloud, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface UploadDropzoneProps {
  projectId: string;
  onUploadSuccess: (url: string) => void;
  onUploadStart?: () => void;
}

export function UploadDropzone({ projectId, onUploadSuccess, onUploadStart }: UploadDropzoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);

  const processFile = useCallback(
    async (file: File) => {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast.error("Only image files (PNG, JPG, WEBP) are allowed.");
        return;
      }

      // Validate size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image file size must be less than 5MB.");
        return;
      }

      setUploading(true);
      if (onUploadStart) onUploadStart();

      try {
        const url = await uploadScreenshot(file, projectId);
        onUploadSuccess(url);
        toast.success(`Uploaded: ${file.name}`);
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || "Failed to upload image. Verify Firebase credentials.");
      } finally {
        setUploading(false);
      }
    },
    [projectId, onUploadSuccess, onUploadStart]
  );

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-2">
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={cn(
          "relative border border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 min-h-[140px]",
          isDragActive 
            ? "border-sky-500 bg-sky-500/5 dark:bg-sky-500/10" 
            : "border-border bg-neutral-50/50 dark:bg-neutral-950/20 hover:border-muted-foreground/30 hover:bg-neutral-100/50 dark:hover:bg-neutral-900/10",
          uploading && "pointer-events-none opacity-50"
        )}
      >
        <input
          type="file"
          accept="image/*"
          onChange={handleFileInput}
          disabled={uploading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />

        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 text-sky-500 animate-spin" />
            <p className="text-xs text-muted-foreground font-semibold">Uploading screenshot...</p>
            <div className="w-32 bg-neutral-200 dark:bg-neutral-800 h-1 rounded-full overflow-hidden mt-1.5">
              <div className="bg-sky-500 h-full w-2/3 animate-[pulse_1.5s_infinite] rounded-full" />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-card border border-border flex items-center justify-center text-muted-foreground shadow-xs">
              <UploadCloud className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-foreground font-semibold">
                Drag & drop or <span className="text-sky-500 dark:text-sky-400 hover:underline">browse</span>
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                Supports PNG, JPG, WEBP up to 5MB.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
