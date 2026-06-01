"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, Search, Loader2, Forward, Users, Mic, ImageIcon, BarChart2, Gamepad2, CalendarDays } from "lucide-react";
import Image from "next/image";
import { Text, Flex } from "@radix-ui/themes";
import { api } from "@/lib/api";
import { Conversation, ChatMessage } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";
import Avatar from "./Avatar";

interface Props {
  message: ChatMessage;
  onClose: () => void;
  onForward: (conversationId: string) => void;
  forwarding: boolean;
}

function MessagePreview({ message }: { message: ChatMessage }) {
  if (message.poll)
    return <><BarChart2 size={12} className="shrink-0" /><span className="truncate">Poll: {message.poll.question}</span></>;
  if (message.gameNight)
    return <><CalendarDays size={12} className="shrink-0" /><span className="truncate">Game Night: {message.gameNight.title}</span></>;
  if (message.audioUrl)
    return <><Mic size={12} className="shrink-0" /><span>Voice message</span></>;
  if (message.imageUrls || message.imageUrl)
    return <><ImageIcon size={12} className="shrink-0" /><span>Photo</span></>;
  if (message.game)
    return <><Gamepad2 size={12} className="shrink-0" /><span className="truncate">{message.game.name}</span></>;
  return <span className="truncate">{message.body}</span>;
}

export default function ForwardModal({ message, onClose, onForward, forwarding }: Props) {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [forwardingToId, setForwardingToId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (!forwarding) setForwardingToId(null); }, [forwarding]);

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
    const name = c.isGroup ? (c.name ?? "") : (c.otherUser?.username ?? "");
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
        <Flex align="center" justify="between" className="px-4 py-3 border-b border-white/8">
          <Flex align="center" gap="2">
            <Forward size={15} className="text-violet-400" />
            <span className="text-sm font-semibold text-white">Forward message</span>
          </Flex>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-white/8 rounded-lg transition-colors"
          >
            <X size={14} />
          </button>
        </Flex>

        {/* Message preview */}
        <div className="px-4 py-2.5 border-b border-white/8 bg-white/3">
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <MessagePreview message={message} />
          </div>
        </div>

        {/* Search */}
        <Flex align="center" gap="2" className="px-4 py-2.5 border-b border-white/8">
          <Search size={13} className="text-gray-500 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search conversations…"
            className="flex-1 bg-transparent text-sm text-white outline-none placeholder-gray-600"
          />
        </Flex>

        {/* Conversation list */}
        <div className="max-h-72 overflow-y-auto">
          {filtered.length === 0 && (
            <Text as="p" size="1" color="gray" className="py-10 text-center">No conversations found</Text>
          )}
          {filtered.map((conv) => (
            <button
              key={conv.id}
              disabled={forwarding && forwardingToId === conv.id}
              onClick={() => { setForwardingToId(conv.id); onForward(conv.id); }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left disabled:opacity-50"
            >
              {conv.isGroup ? (
                conv.avatar ? (
                  <div className="w-8 h-8 rounded-full overflow-hidden shrink-0">
                    <Image src={conv.avatar} alt={conv.name ?? "Group"} width={32} height={32} className="object-cover w-full h-full" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-violet-700/40 flex items-center justify-center shrink-0">
                    <Users size={14} className="text-violet-300" />
                  </div>
                )
              ) : (
                <Avatar src={conv.otherUser?.avatar} username={conv.otherUser?.username ?? "?"} size="sm" />
              )}
              <span className="text-sm text-white truncate flex-1">
                {conv.isGroup ? (conv.name ?? "Group") : (conv.otherUser?.username ?? "Unknown")}
              </span>
              {forwarding && forwardingToId === conv.id && (
                <Loader2 size={13} className="animate-spin text-gray-500 shrink-0" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
