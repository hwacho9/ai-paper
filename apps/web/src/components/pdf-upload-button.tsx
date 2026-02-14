"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, FileText } from "lucide-react";
import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuth } from "@/components/auth/auth-context";
import { toast } from "sonner";
import { ingestPaper } from "@/lib/api/papers";

interface PdfUploadButtonProps {
  paperId: string;
  onUploadComplete?: () => void;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function PdfUploadButton({
  paperId,
  onUploadComplete,
  variant = "outline",
  size = "sm",
  className,
}: PdfUploadButtonProps) {
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !storage) return;

    if (file.type !== "application/pdf") {
      toast.error("PDFファイルのみアップロード可能です");
      return;
    }

    setIsUploading(true);
    try {
      // 1. Upload to Firebase Storage
      // Path: papers/{uid}/{paperId}.pdf
      const storageRef = ref(storage, `papers/${user.uid}/${paperId}.pdf`);

      const snapshot = await uploadBytes(storageRef, file);
      console.log("Uploaded a blob or file!", snapshot);

      // 2. Trigger Ingestion (Backend)
      await ingestPaper(paperId);

      toast.success("PDFをアップロードしました。解析を開始します。");
      if (onUploadComplete) onUploadComplete();
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error("アップロードに失敗しました");
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  if (!storage) return null;

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="application/pdf"
        className="hidden"
      />
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={handleClick}
        disabled={isUploading}
        title="PDF をアップロード"
      >
        {isUploading ? (
          <Loader2
            className={`h-4 w-4 animate-spin${size !== "icon" ? " mr-2" : ""}`}
          />
        ) : (
          <Upload className={`h-4 w-4${size !== "icon" ? " mr-2" : ""}`} />
        )}
        {size !== "icon" && (isUploading ? "Uploading..." : "PDF Upload")}
      </Button>
    </>
  );
}
