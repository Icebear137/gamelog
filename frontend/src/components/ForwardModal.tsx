"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, Search, Loader2, Forward } from "lucide-react";
import { api } from "@/lib/api";
import { Conversation } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";
import Avatar from "./Avatar";

interface Props {
  messageId: string;
  onClose: () => void;
  onForward: (conversationId: string) => void;
  forwarding: boolean;
}

export default function ForwardModal({ messageId: _messageId, onClose, onForward, forwarding }: Props) {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ["conversations"],
    queryFn: () => api.get("/api/messages/conversations").then((r) => r.data),
    enabled: !!user,
    staleTime: 60_000,
  });

  const filtered = conversations.filter((c) => {
    const name = c.otherUser?.username ?? "";
    return name.toLowerCase().includes(query.toLowerCase());
  });

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
          <div className="flex items-center gap-2">
            <Forward size={15} className="text-violet-400" />
            <span className="text-sm font-semibold text-white">Forward message</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-white/8 rounded-lg transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/8">
          <Search size={13} className="text-gray-500 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search conversations…"
            className="flex-1 bg-transparent text-sm text-white outline-none placeholder-gray-600"
          />
        </div>

        {/* Conversation list */}
        <div className="max-h-72 overflow-y-auto">
          {filtered.length === 0 && (
            <p className="py-10 text-center text-xs text-gray-600">No conversations found</p>
          )}
          {filtered.map((conv) => (
            <button
              key={conv.id}
              disabled={forwarding}
              onClick={() => onForward(conv.id)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left disabled:opacity-50"
            >
              <Avatar
                src={conv.otherUser?.avatar}
                username={conv.otherUser?.username ?? "?"}
                size="sm"
              />
              <span className="text-sm text-white truncate flex-1">
                {conv.otherUser?.username ?? "Unknown"}
              </span>
              {forwarding && (
                <Loader2 size={13} className="animate-spin text-gray-500 shrink-0" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
