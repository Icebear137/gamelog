"use client";

import { useState, useEffect, useRef } from "react";
import { QueryClient } from "@tanstack/react-query";
import { getSocket } from "@/lib/socket-client";
import { ChatMessage, GroupMember, PinnedMessage, PollData, GameNightData } from "@/lib/types";

interface MessagesData {
  messages: ChatMessage[];
  otherUserLastReadAt: string | null;
  isGroup: boolean;
  members: GroupMember[];
  pinnedMessage: PinnedMessage | null;
}

interface Params {
  conversationId: string;
  otherUserId: string | undefined;
  currentUserId: string;
  messagesData: MessagesData | undefined;
  qc: QueryClient;
  setEarlierMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}

export function useConversationSocket({
  conversationId,
  otherUserId,
  currentUserId,
  messagesData,
  qc,
  setEarlierMessages,
}: Params) {
  const [typingUsers, setTypingUsers] = useState<Map<string, { username: string; avatar?: string | null }>>(new Map());
  const [memberReadAt, setMemberReadAt] = useState<Map<string, string>>(new Map());
  const [otherUserPresence, setOtherUserPresence] = useState<{ isOnline: boolean; lastSeen: string | null } | null>(null);
  const [pinnedMessage, setPinnedMessage] = useState<PinnedMessage | null>(null);
  const typingTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Sync memberReadAt from query (initial load + refetch)
  useEffect(() => {
    if (!messagesData) return;
    setMemberReadAt((prev) => {
      const next = new Map(prev);
      if (!messagesData.isGroup && otherUserId && messagesData.otherUserLastReadAt) {
        const existing = next.get(otherUserId);
        if (!existing || new Date(messagesData.otherUserLastReadAt) > new Date(existing))
          next.set(otherUserId, messagesData.otherUserLastReadAt);
      }
      if (messagesData.isGroup) {
        for (const m of messagesData.members) {
          if (m.id === currentUserId || !m.lastReadAt) continue;
          const existing = next.get(m.id);
          if (!existing || new Date(m.lastReadAt) > new Date(existing))
            next.set(m.id, m.lastReadAt);
        }
      }
      return next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messagesData?.otherUserLastReadAt, messagesData?.members]);

  // Sync pinnedMessage from query
  useEffect(() => {
    if (messagesData !== undefined) setPinnedMessage(messagesData.pinnedMessage ?? null);
  }, [messagesData?.pinnedMessage]);

  // join / leave room
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    socket.emit("join_conversation", conversationId);
    return () => { socket.emit("leave_conversation", conversationId); };
  }, [conversationId]);

  // typing indicator
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    function handleTyping({ conversationId: cid, userId: uid, username, avatar }: {
      conversationId: string; userId: string; username: string; avatar?: string | null;
    }) {
      if (cid !== conversationId) return;
      setTypingUsers((prev) => { const next = new Map(prev); next.set(uid, { username, avatar }); return next; });
      const prev = typingTimersRef.current.get(uid);
      if (prev) clearTimeout(prev);
      const timer = setTimeout(() => {
        setTypingUsers((prev) => { const next = new Map(prev); next.delete(uid); return next; });
        typingTimersRef.current.delete(uid);
      }, 3000);
      typingTimersRef.current.set(uid, timer);
    }
    socket.on("typing", handleTyping);
    return () => {
      socket.off("typing", handleTyping);
      typingTimersRef.current.forEach((t) => clearTimeout(t));
      typingTimersRef.current.clear();
    };
  }, [conversationId]);

  // read receipts
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    function handleReadReceipt({ conversationId: cid, userId: uid, readAt }: {
      conversationId: string; userId: string; readAt: string;
    }) {
      if (cid !== conversationId) return;
      setMemberReadAt((prev) => {
        const existing = prev.get(uid);
        if (existing && new Date(readAt) <= new Date(existing)) return prev;
        const next = new Map(prev);
        next.set(uid, readAt);
        return next;
      });
    }
    socket.on("read_receipt", handleReadReceipt);
    return () => { socket.off("read_receipt", handleReadReceipt); };
  }, [conversationId]);

  // reaction updates
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    function handleReactionUpdate({ conversationId: cid, messageId, reactions }: {
      conversationId: string; messageId: string; reactions: { id: string; emoji: string; userId: string }[];
    }) {
      if (cid !== conversationId) return;
      qc.setQueryData(
        ["messages", conversationId],
        (old: { messages: ChatMessage[]; otherUserLastReadAt: string | null } | undefined) => {
          if (!old) return old;
          return { ...old, messages: old.messages.map((m) => m.id === messageId ? { ...m, reactions } : m) };
        }
      );
      setEarlierMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, reactions } : m));
    }
    socket.on("reaction_update", handleReactionUpdate);
    return () => { socket.off("reaction_update", handleReactionUpdate); };
  }, [conversationId, qc]);

  // new message → invalidate
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    function handleNewMessage({ conversationId: cid }: { conversationId: string }) {
      if (cid !== conversationId) return;
      qc.invalidateQueries({ queryKey: ["messages", conversationId] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
    }
    socket.on("new_message", handleNewMessage);
    return () => { socket.off("new_message", handleNewMessage); };
  }, [conversationId, qc]);

  // group member changes
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    function handleGroupUpdated() {
      qc.invalidateQueries({ queryKey: ["conversations"] });
      qc.invalidateQueries({ queryKey: ["messages", conversationId] });
    }
    socket.on("group_updated", handleGroupUpdated);
    socket.on("member_added", handleGroupUpdated);
    socket.on("member_removed", handleGroupUpdated);
    socket.on("member_role_changed", handleGroupUpdated);
    return () => {
      socket.off("group_updated", handleGroupUpdated);
      socket.off("member_added", handleGroupUpdated);
      socket.off("member_removed", handleGroupUpdated);
      socket.off("member_role_changed", handleGroupUpdated);
    };
  }, [conversationId, qc]);

  // nickname updated
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    function handleNicknameUpdated({ conversationId: cid }: { conversationId: string }) {
      if (cid !== conversationId) return;
      qc.invalidateQueries({ queryKey: ["nicknames", conversationId] });
    }
    socket.on("nickname_updated", handleNicknameUpdated);
    return () => { socket.off("nickname_updated", handleNicknameUpdated); };
  }, [conversationId, qc]);

  // poll vote updates
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    function handlePollUpdated({ conversationId: cid, messageId, poll }: {
      conversationId: string; messageId: string; poll: PollData;
    }) {
      if (cid !== conversationId) return;
      qc.setQueryData(
        ["messages", conversationId],
        (old: { messages: ChatMessage[] } | undefined) => {
          if (!old) return old;
          return { ...old, messages: old.messages.map((m) => m.id === messageId ? { ...m, poll } : m) };
        }
      );
      setEarlierMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, poll } : m));
    }
    socket.on("poll_updated", handlePollUpdated);
    return () => { socket.off("poll_updated", handlePollUpdated); };
  }, [conversationId, qc]);

  // game night RSVP updates
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    function handleGameNightUpdated({ conversationId: cid, messageId, gameNight }: {
      conversationId: string; messageId: string; gameNight: GameNightData;
    }) {
      if (cid !== conversationId) return;
      qc.setQueryData(
        ["messages", conversationId],
        (old: { messages: ChatMessage[] } | undefined) => {
          if (!old) return old;
          return { ...old, messages: old.messages.map((m) => m.id === messageId ? { ...m, gameNight } : m) };
        }
      );
      setEarlierMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, gameNight } : m));
    }
    socket.on("game_night_updated", handleGameNightUpdated);
    return () => { socket.off("game_night_updated", handleGameNightUpdated); };
  }, [conversationId, qc]);

  // pin / unpin
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    function handleMessagePinned({ conversationId: cid, pinnedMessage: pm }: {
      conversationId: string; pinnedMessage: PinnedMessage | null;
    }) {
      if (cid !== conversationId) return;
      setPinnedMessage(pm);
    }
    socket.on("message_pinned", handleMessagePinned);
    return () => { socket.off("message_pinned", handleMessagePinned); };
  }, [conversationId]);

  // presence
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !otherUserId) return;
    socket.emit("get_presence", { userId: otherUserId });
    function handlePresence({ userId, isOnline, lastSeen }: {
      userId: string; isOnline: boolean; lastSeen: string | null;
    }) {
      if (userId !== otherUserId) return;
      setOtherUserPresence({ isOnline, lastSeen });
    }
    socket.on("presence_update", handlePresence);
    return () => { socket.off("presence_update", handlePresence); };
  }, [otherUserId]);

  return { typingUsers, memberReadAt, otherUserPresence, pinnedMessage };
}
