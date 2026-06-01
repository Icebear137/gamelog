"use client";

import { useQuery } from "@tanstack/react-query";
import { FileText, FileVideo, FileAudio, FileArchive, File, Download, Paperclip, Loader2 } from "lucide-react";
import { Text } from "@radix-ui/themes";
import { api } from "@/lib/api";
import { formatDistanceToNow } from "@/lib/utils";

interface FileItem {
  id: string;
  fileUrl: string;
  fileName: string;
  fileSize?: number | null;
  fileType?: string | null;
  createdAt: string;
  sender: { id: string; username: string; avatar?: string };
}

interface Props {
  conversationId: string;
}

function FileTypeIcon({ type }: { type: string }) {
  if (type.startsWith("video/"))  return <FileVideo  size={16} className="text-blue-400" />;
  if (type.startsWith("audio/"))  return <FileAudio  size={16} className="text-green-400" />;
  if (type === "application/pdf") return <FileText   size={16} className="text-red-400" />;
  if (type.includes("zip") || type.includes("rar") || type.includes("tar"))
    return <FileArchive size={16} className="text-yellow-400" />;
  if (type.includes("word") || type.includes("document") || type.includes("text"))
    return <FileText size={16} className="text-blue-300" />;
  return <File size={16} className="text-gray-400" />;
}

function formatBytes(b: number) {
  if (b < 1024)        return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

export function SharedFilesPanel({ conversationId }: Props) {
  const { data: files = [], isLoading } = useQuery<FileItem[]>({
    queryKey: ["conv-files", conversationId],
    queryFn: () => api.get(`/api/messages/conversations/${conversationId}/files`).then((r) => r.data),
    staleTime: 30_000,
  });

  return (
    <div className="px-4 py-3 border-t border-white/8">
      <div className="flex items-center gap-1.5 mb-3">
        <Paperclip size={12} className="text-gray-500" />
        <Text as="span" size="1" color="gray" className="font-medium">Files</Text>
        {files.length > 0 && (
          <span className="text-[10px] text-gray-600 ml-auto">{files.length}</span>
        )}
      </div>

      {isLoading && (
        <div className="flex justify-center py-4">
          <Loader2 size={16} className="animate-spin text-gray-600" />
        </div>
      )}

      {!isLoading && files.length === 0 && (
        <Text as="p" size="1" color="gray" className="text-center py-3">No files shared yet</Text>
      )}

      {!isLoading && files.length > 0 && (
        <div className="space-y-1">
          {files.map((f) => (
            <a
              key={f.id}
              href={f.fileUrl}
              download={f.fileName}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-white/5 transition-colors group"
            >
              <div className="w-8 h-8 rounded-lg bg-white/8 flex items-center justify-center shrink-0">
                <FileTypeIcon type={f.fileType ?? ""} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white font-medium truncate">{f.fileName}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  {f.fileSize != null ? formatBytes(f.fileSize) : ""}{f.fileSize != null ? " · " : ""}
                  {formatDistanceToNow(f.createdAt)}
                </p>
              </div>
              <Download size={13} className="shrink-0 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
