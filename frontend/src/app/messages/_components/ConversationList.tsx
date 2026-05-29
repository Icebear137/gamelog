"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, PenSquare, Users, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Conversation } from "@/lib/types";
import { getSocket } from "@/lib/socket-client";
import CreateGroupModal from "@/components/CreateGroupModal";
import { ConversationItem } from "./ConversationItem";
import { Text, Flex, Box } from "@radix-ui/themes";

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

  // Query presence for each DM partner on mount
  useEffect(() => {
    const socket = getSocket();
    if (!socket || conversations.length === 0) return;
    conversations.forEach((conv) => {
      if (!conv.isGroup && conv.otherUser?.id)
        socket.emit("get_presence", { userId: conv.otherUser.id });
    });
  }, [conversations]);

  // Live presence + conversation refresh events
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    function handlePresence({ userId, isOnline }: { userId: string; isOnline: boolean }) {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        if (isOnline) next.add(userId); else next.delete(userId);
        return next;
      });
    }

    function handleRefresh() {
      qc.invalidateQueries({ queryKey: ["conversations"] });
    }

    socket.on("presence_update", handlePresence);
    socket.on("new_group", handleRefresh);
    socket.on("group_updated", handleRefresh);
    socket.on("member_added", handleRefresh);
    socket.on("member_removed", handleRefresh);
    socket.on("member_role_changed", handleRefresh);

    return () => {
      socket.off("presence_update", handlePresence);
      socket.off("new_group", handleRefresh);
      socket.off("group_updated", handleRefresh);
      socket.off("member_added", handleRefresh);
      socket.off("member_removed", handleRefresh);
      socket.off("member_role_changed", handleRefresh);
    };
  }, [qc]);

  const activeId = pathname.startsWith("/messages/") ? pathname.split("/messages/")[1] : null;

  return (
    <Flex direction="column" className="h-full">
      <Flex align="center" justify="between" className="px-4 py-4 border-b border-white/8 shrink-0">
        <Flex align="center" gap="2">
          <MessageCircle size={17} className="text-violet-400" />
          <Text as="span" size="2" weight="medium">Messages</Text>
        </Flex>
        <Flex align="center" gap="1">
          <button
            title="New group"
            onClick={() => setGroupModalOpen(true)}
            className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/8 transition-colors"
          >
            <Users size={15} />
          </button>
          <button
            title="New conversation"
            onClick={() => router.push("/discover")}
            className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/8 transition-colors"
          >
            <PenSquare size={15} />
          </button>
        </Flex>
      </Flex>

      <Box className="flex-1 overflow-y-auto py-1">
        {isLoading && (
          <Flex align="center" justify="center" gap="2" className="py-8 text-gray-600">
            <Loader2 size={15} className="animate-spin" />
            <Text as="span" size="1">Loading…</Text>
          </Flex>
        )}
        {!isLoading && conversations.length === 0 && (
          <div className="px-4 py-10 text-center text-gray-600">
            <Text as="p" size="1" className="leading-relaxed">
              No conversations yet.<br />Visit someone's profile to start chatting.
            </Text>
          </div>
        )}
        {conversations.map((conv) => (
          <ConversationItem
            key={conv.id}
            conv={conv}
            isActive={conv.id === activeId}
            isOnline={!!conv.otherUser && onlineUsers.has(conv.otherUser.id)}
            currentUserId={user?.id ?? ""}
          />
        ))}
      </Box>

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
    </Flex>
  );
}
