"use client";

import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Conversation, GroupMember } from "@/lib/types";
import { EmptyPanel } from "./info-panel/EmptyPanel";
import { GroupInfoPanel } from "./info-panel/GroupInfoPanel";
import { DMInfoPanel } from "./info-panel/DMInfoPanel";
import { Flex } from "@radix-ui/themes";

interface MessagesQueryData {
  messages: unknown[];
  isGroup: boolean;
  groupName: string | null;
  groupAvatar: string | null;
  members: GroupMember[];
}

export default function ConversationInfoPanel() {
  const pathname = usePathname();
  const { user: me } = useAuth();

  const conversationId = pathname.startsWith("/messages/")
    ? pathname.split("/messages/")[1]
    : null;

  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ["conversations"],
    queryFn: () => api.get("/api/messages/conversations").then((r) => r.data),
    enabled: !!me,
    staleTime: 60_000,
  });

  const conv = conversationId ? conversations.find((c) => c.id === conversationId) : null;

  const { data: messagesData } = useQuery<MessagesQueryData>({
    queryKey: ["messages", conversationId],
    queryFn: () =>
      api.get(`/api/messages/conversations/${conversationId}?limit=30`).then((r) => r.data),
    enabled: !!conversationId && !!conv?.isGroup,
    staleTime: 30_000,
  });

  if (!conversationId) return <EmptyPanel />;

  if (!conv) {
    return (
      <Flex direction="column" align="center" gap="3" px="4" pt="6" className="animate-pulse">
        <div className="w-14 h-14 rounded-full bg-white/8" />
        <div className="h-3 w-24 rounded bg-white/8" />
        <div className="h-2 w-32 rounded bg-white/6" />
      </Flex>
    );
  }

  if (conv.isGroup) {
    const members: GroupMember[] = messagesData?.members ?? conv.participants.map((p) => ({
      id: p.id,
      username: p.username,
      avatar: p.avatar,
      role: "member" as const,
    }));
    return <GroupInfoPanel conversationId={conversationId} conv={conv} members={members} />;
  }

  if (!conv.otherUser) {
    return (
      <Flex direction="column" align="center" gap="3" px="4" pt="6" className="animate-pulse">
        <div className="w-14 h-14 rounded-full bg-white/8" />
        <div className="h-3 w-24 rounded bg-white/8" />
      </Flex>
    );
  }

  return <DMInfoPanel conv={conv} />;
}
