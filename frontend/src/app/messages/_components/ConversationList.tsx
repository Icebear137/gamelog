"use client";

import { useRouter, usePathname } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { MessageCircle, PenSquare, Users, Loader2 } from "lucide-react";
import Image from "next/image";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Conversation } from "@/lib/types";
import { formatDistanceToNow } from "@/lib/utils";
import { getSocket } from "@/lib/socket-client";
import Avatar from "@/components/Avatar";
import CreateGroupModal from "@/components/CreateGroupModal";

// ── Stacked avatars for group conversations ──────────────────────────────────
function GroupAvatarStack({ participants }: { participants: { id: string; username: string; avatar?: string | null }[] }) {
  const visible = participants.slice(0, 2);
  const extra = participants.length - 2;
  return (
    <div className="relative w-10 h-10 shrink-0">
      {visible.length === 0 && (
        <div className="w-10 h-10 rounded-full bg-violet-700/40 flex items-center justify-center">
          <Users size={16} className="text-violet-300" />
        </div>
      )}
      {visible.length >= 2 && (
        <>
          <div className="absolute bottom-0 left-0 w-7 h-7 rounded-full border-2 border-zinc-900 overflow-hidden bg-violet-700 flex items-center justify-center">
            {visible[1].avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={visible[1].avatar} alt={visible[1].username} className="w-full h-full object-cover" />
            ) : (
              <span className="text-white font-bold uppercase text-[10px] leading-none select-none">{visible[1].username[0]}</span>
            )}
          </div>
          <div className="absolute top-0 right-0 w-7 h-7 rounded-full border-2 border-zinc-900 overflow-hidden bg-violet-700 flex items-center justify-center">
            {visible[0].avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={visible[0].avatar} alt={visible[0].username} className="w-full h-full object-cover" />
            ) : (
              <span className="text-white font-bold uppercase text-[10px] leading-none select-none">{visible[0].username[0]}</span>
            )}
          </div>
        </>
      )}
      {visible.length === 1 && (
        <div className="w-10 h-10 rounded-full overflow-hidden">
          <Avatar src={visible[0].avatar ?? undefined} username={visible[0].username} size="md" />
        </div>
      )}
      {extra > 0 && (
        <span className="absolute -bottom-0.5 -right-0.5 min-w-4 h-4 bg-zinc-700 border border-zinc-900 text-[9px] text-gray-300 font-bold rounded-full flex items-center justify-center px-0.5">
          +{extra}
        </span>
      )}
    </div>
  );
}

export default function ConversationList() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const qc = useQueryClient();

  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [groupModalOpen, setGroupModalOpen] = useState(false);

  const { data: conversations = [], isLoading } = useQuery<Conversation[]>({
    queryKey: ["conversations"],
    queryFn: () => api.get("/api/messages/conversations").then((r) => r.data),
    enabled: !!user,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });

  // ── Presence: query initial status + listen for live updates ─────────────
  useEffect(() => {
    const socket = getSocket();
    if (!socket || conversations.length === 0) return;
    conversations.forEach((conv) => {
      if (!conv.isGroup && conv.otherUser?.id) {
        socket.emit("get_presence", { userId: conv.otherUser.id });
      }
    });
  }, [conversations]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    function handlePresence({ userId, isOnline }: { userId: string; isOnline: boolean }) {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        if (isOnline) next.add(userId);
        else next.delete(userId);
        return next;
      });
    }
    function handleConversationsRefresh() {
      qc.invalidateQueries({ queryKey: ["conversations"] });
    }
    socket.on("presence_update", handlePresence);
    socket.on("new_group", handleConversationsRefresh);
    socket.on("group_updated", handleConversationsRefresh);
    socket.on("member_added", handleConversationsRefresh);
    socket.on("member_removed", handleConversationsRefresh);
    socket.on("member_role_changed", handleConversationsRefresh);
    return () => {
      socket.off("presence_update", handlePresence);
      socket.off("new_group", handleConversationsRefresh);
      socket.off("group_updated", handleConversationsRefresh);
      socket.off("member_added", handleConversationsRefresh);
      socket.off("member_removed", handleConversationsRefresh);
      socket.off("member_role_changed", handleConversationsRefresh);
    };
  }, [qc]);

  const activeId = pathname.startsWith("/messages/")
    ? pathname.split("/messages/")[1]
    : null;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/8 shrink-0">
        <div className="flex items-center gap-2">
          <MessageCircle size={17} className="text-violet-400" />
          <span className="font-semibold text-white text-sm">Messages</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            title="New group"
            onClick={() => setGroupModalOpen(true)}
            className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/8 transition-colors"
          >
            <Users size={15} />
          </button>
          <button
            title="New conversation"
            className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/8 transition-colors"
            onClick={() => router.push("/discover")}
          >
            <PenSquare size={15} />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto py-1">
        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-8 text-gray-600">
            <Loader2 size={15} className="animate-spin" />
            <span className="text-xs">Loading…</span>
          </div>
        )}

        {!isLoading && conversations.length === 0 && (
          <div className="px-4 py-10 text-center text-gray-600">
            <p className="text-xs leading-relaxed">
              No conversations yet.
              <br />
              Visit someone's profile to start chatting.
            </p>
          </div>
        )}

        {conversations.map((conv) => {
          const isActive = conv.id === activeId;
          const hasUnread = conv.unreadCount > 0;

          // Display name: group name or DM partner
          const displayName = conv.isGroup
            ? (conv.name ?? "Group")
            : (conv.otherUser?.username ?? "Unknown");

          // Preview text for last message
          const lastMsg = conv.lastMessage;
          let preview: React.ReactNode = <span className="italic">No messages yet</span>;
          if (lastMsg) {
            const isOwn = lastMsg.senderId === user?.id;
            const prefix = isOwn ? "You: " : (conv.isGroup ? `${lastMsg.sender.username}: ` : "");
            if (lastMsg.body === "[deleted]") {
              preview = <><span>{prefix}</span><span className="italic">Message deleted</span></>;
            } else if (lastMsg.game) {
              preview = <span>{prefix}🎮 {lastMsg.game.name}</span>;
            } else if ((lastMsg as any).audioUrl) {
              preview = <span>{prefix}🎤 Voice message</span>;
            } else if (lastMsg.imageUrls) {
              try {
                const n = (JSON.parse(lastMsg.imageUrls) as string[]).length;
                preview = <span>{prefix}📷 {n} photo{n > 1 ? "s" : ""}</span>;
              } catch { preview = <span>{prefix}📷 Photos</span>; }
            } else if (lastMsg.imageUrl && !lastMsg.body) {
              preview = <span>{prefix}📷 Photo</span>;
            } else if (lastMsg.imageUrl) {
              preview = <span>{prefix}📷 {lastMsg.body}</span>;
            } else {
              preview = <span>{prefix}{lastMsg.body}</span>;
            }
          }

          return (
            <button
              key={conv.id}
              onClick={() => router.push(`/messages/${conv.id}`)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                isActive ? "bg-white/8" : "hover:bg-white/5"
              }`}
            >
              {/* Avatar */}
              <div className="relative shrink-0">
                {conv.isGroup ? (
                  conv.avatar ? (
                    <div className="w-10 h-10 rounded-full overflow-hidden shrink-0">
                      <Image src={conv.avatar} alt={conv.name ?? "Group"} width={40} height={40} className="object-cover w-full h-full" />
                    </div>
                  ) : (
                    <GroupAvatarStack participants={conv.participants} />
                  )
                ) : (
                  <>
                    <Avatar
                      src={conv.otherUser?.avatar}
                      username={conv.otherUser?.username ?? "?"}
                      size="md"
                    />
                    {conv.otherUser && onlineUsers.has(conv.otherUser.id) && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-zinc-900" />
                    )}
                  </>
                )}
                {hasUnread && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-4.5 h-4.5 bg-violet-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                    {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                  </span>
                )}
              </div>

              {/* Name + preview */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {conv.isGroup && <Users size={11} className="text-violet-400 shrink-0" />}
                    <span className={`text-sm truncate ${hasUnread ? "font-semibold text-white" : "font-medium text-gray-300"}`}>
                      {displayName}
                    </span>
                  </div>
                  {lastMsg && (
                    <span className="text-[10px] text-gray-600 shrink-0">
                      {formatDistanceToNow(lastMsg.createdAt)}
                    </span>
                  )}
                </div>
                <p className={`text-xs truncate mt-0.5 ${hasUnread ? "text-gray-400 font-medium" : "text-gray-600"}`}>
                  {preview}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {groupModalOpen && (
        <CreateGroupModal
          onClose={() => setGroupModalOpen(false)}
          onCreated={(id) => {
            setGroupModalOpen(false);
            qc.invalidateQueries({ queryKey: ["conversations"] });
            router.push(`/messages/${id}`);
          }}
        />
      )}
    </div>
  );
}
