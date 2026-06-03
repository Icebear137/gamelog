"use client";

import { FileText, FileVideo, FileAudio, FileArchive, File, Download } from "lucide-react";

interface Props {
  fileUrl: string;
  fileName: string;
  fileSize?: number | null;
  fileType?: string | null;
  isOwn: boolean;
}

function FileIcon({ type }: { type: string }) {
  if (type.startsWith("video/"))   return <FileVideo  size={22} />;
  if (type.startsWith("audio/"))   return <FileAudio  size={22} />;
  if (type === "application/pdf")  return <FileText   size={22} />;
  if (type.includes("zip") || type.includes("rar") || type.includes("7z") || type.includes("tar"))
    return <FileArchive size={22} />;
  if (type.includes("word") || type.includes("document") || type.includes("text"))
    return <FileText size={22} />;
  return <File size={22} />;
}

function formatBytes(b: number) {
  if (b < 1024)             return `${b} B`;
  if (b < 1024 * 1024)      return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

function truncateName(name: string, max = 28) {
  if (name.length <= max) return name;
  const ext = name.lastIndexOf(".");
  if (ext > 0) {
    const base = name.slice(0, ext);
    const extension = name.slice(ext);
    return base.slice(0, max - extension.length - 3) + "…" + extension;
  }
  return name.slice(0, max - 1) + "…";
}

export function FileBubble({ fileUrl, fileName, fileSize, fileType, isOwn }: Props) {
  const type = fileType ?? "";

  return (
    <a
      href={fileUrl}
      download={fileName}
      target="_blank"
      rel="noreferrer"
      className={`flex items-center gap-3 rounded-2xl px-3.5 py-3 max-w-64 no-underline transition-opacity hover:opacity-85 ${
        isOwn
          ? "bg-violet-600/90 text-white rounded-br-sm"
          : "bg-white/10 backdrop-blur-sm text-white rounded-bl-sm"
      }`}
    >
      {/* File type icon */}
      <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
        isOwn ? "bg-white/20" : "bg-white/10"
      }`}>
        <FileIcon type={type} />
      </div>

      {/* Name + size */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-tight break-all" style={{ wordBreak: "break-word" }}>
          {truncateName(fileName)}
        </p>
        {fileSize != null && (
          <p className={`text-[11px] mt-0.5 ${isOwn ? "text-violet-200" : "text-gray-400"}`}>
            {formatBytes(fileSize)}
          </p>
        )}
      </div>

      {/* Download icon */}
      <Download size={14} className={`shrink-0 ${isOwn ? "text-white/60" : "text-gray-500"}`} />
    </a>
  );
}
