"use client";

import { use, useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, ExternalLink, X, Search, ArrowDown, Users, Pin } from "lucide-react";
import { Slot } from "@radix-ui/react-slot";
import Image from "next/image";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { ChatMessage, Conversation, GroupMember, PinnedMessage } from "@/lib/types";
import { formatDistanceToNow } from "@/lib/utils";
import { dispatchToast } from "@/lib/toast";
import { getSocket } from "@/lib/socket-client";
import Avatar from "@/components/Avatar";
import MessageBubble from "@/components/MessageBubble";
import ChatInput from "@/components/ChatInput";
import ForwardModal from "@/components/ForwardModal";

export default function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = use(params);
  const { user } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();

  const [body, setBody] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [loadingEarlier, setLoadingEarlier] = useState(false);
  const [hasEarlier, setHasEarlier] = useState(true);
  const [earlierMessages, setEarlierMessages] = useState<ChatMessage[]>([]);

  // Typing indicator: userId → { username, avatar }
  const [typingUsers, setTypingUsers] = useState<Map<string, { username: string; avatar?: string | null }>>(new Map());
  const typingTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  // Debounce emit: chỉ gửi 1 lần mỗi 2 giây khi user đang gõ
  const lastTypingEmitRef = useRef(0);

  // Seen receipts: userId → ISO timestamp of their lastReadAt
  const [memberReadAt, setMemberReadAt] = useState<Map<string, string>>(new Map());

  // Pinned message — synced from query + live socket
  const [pinnedMessage, setPinnedMessage] = useState<PinnedMessage | null>(null);

  // Reply state
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);

  // Forward state
  const [forwardingMsg, setForwardingMsg] = useState<ChatMessage | null>(null);

  // Presence state
  const [otherUserPresence, setOtherUserPresence] = useState<{
    isOnline: boolean;
    lastSeen: string | null;
  } | null>(null);

  // Search state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null);
  const messageRefsMap = useRef<Map<string, HTMLDivElement>>(new Map());
  const searchInputRef = useRef<HTMLInputElement>(null);

  // ── Conversation metadata (otherUser) ─────────────────────────────────────
  const { data: convList = [] } = useQuery<Conversation[]>({
    queryKey: ["conversations"],
    queryFn: () => api.get("/api/messages/conversations").then((r) => r.data),
    enabled: !!user,
    staleTime: 60_000,
  });
  const conv = convList.find((c) => c.id === conversationId);
  const otherUser = conv?.otherUser;

  // ── Nicknames ──────────────────────────────────────────────────────────────
  const { data: nicknamesRaw = [] } = useQuery<{ userId: string; nickname: string }[]>({
    queryKey: ["nicknames", conversationId],
    queryFn: () =>
      api.get(`/api/messages/conversations/${conversationId}/nicknames`).then((r) => r.data),
    enabled: !!user,
    staleTime: 60_000,
  });
  // Map for O(1) lookup: userId → nickname
  const nicknames = new Map(nicknamesRaw.map((n) => [n.userId, n.nickname]));

  // ── Messages ───────────────────────────────────────────────────────────────
  const { data: messagesData, isLoading } = useQuery<{
    messages: ChatMessage[];
    otherUserLastReadAt: string | null;
    isGroup: boolean;
    groupName: string | null;
    groupAvatar: string | null;
    pinnedMessage: PinnedMessage | null;
    members: GroupMember[];
  }>({
    queryKey: ["messages", conversationId],
    queryFn: () =>
      api.get(`/api/messages/conversations/${conversationId}?limit=30`).then((r) => r.data),
    enabled: !!user,
    refetchInterval: 5_000,
    refetchIntervalInBackground: false,
  });

  const messages = messagesData?.messages ?? [];

  // Sync memberReadAt from query data (initial load + every refetch)
  useEffect(() => {
    if (!messagesData) return;
    setMemberReadAt((prev) => {
      const next = new Map(prev);
      // DM: otherUserLastReadAt keyed by otherUser id
      if (!messagesData.isGroup && otherUser?.id && messagesData.otherUserLastReadAt) {
        const existing = next.get(otherUser.id);
        if (!existing || new Date(messagesData.otherUserLastReadAt) > new Date(existing)) {
          next.set(otherUser.id, messagesData.otherUserLastReadAt);
        }
      }
      // Group: each member's lastReadAt
      if (messagesData.isGroup) {
        for (const m of messagesData.members) {
          if (m.id === user?.id || !m.lastReadAt) continue;
          const existing = next.get(m.id);
          if (!existing || new Date(m.lastReadAt) > new Date(existing)) {
            next.set(m.id, m.lastReadAt);
          }
        }
      }
      return next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messagesData?.otherUserLastReadAt, messagesData?.members]);

  // Sync pinnedMessage from query (initial + refetch)
  useEffect(() => {
    if (messagesData !== undefined) {
      setPinnedMessage(messagesData.pinnedMessage ?? null);
    }
  }, [messagesData?.pinnedMessage]);

  // ── Mark read on mount + window focus ─────────────────────────────────────
  const markRead = useCallback(() => {
    api.put(`/api/messages/conversations/${conversationId}/read`)
      .then(() => {
        qc.invalidateQueries({ queryKey: ["messages-unread"] });
        qc.invalidateQueries({ queryKey: ["conversations"] });
      })
      .catch(() => {});
  }, [conversationId, qc]);

  useEffect(() => {
    if (!user) return;
    markRead();
    window.addEventListener("focus", markRead);
    return () => window.removeEventListener("focus", markRead);
  }, [markRead, user]);

  // ── Search: debounce query + focus input on open ──────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
    else { setSearchQuery(""); setDebouncedSearch(""); }
  }, [searchOpen]);

  const { data: searchResults = [], isFetching: searchFetching } = useQuery<ChatMessage[]>({
    queryKey: ["messages-search", conversationId, debouncedSearch],
    queryFn: () =>
      api.get(`/api/messages/conversations/${conversationId}/search?q=${encodeURIComponent(debouncedSearch.trim())}`).then((r) => r.data),
    enabled: debouncedSearch.trim().length >= 2,
    staleTime: 30_000,
  });

  // ── Socket.io: join/leave room ─────────────────────────────────────────────
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    socket.emit("join_conversation", conversationId);
    return () => {
      socket.emit("leave_conversation", conversationId);
    };
  }, [conversationId]);

  // ── Socket.io: typing — track who is typing per user ──────────────────────
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    function handleTyping({ conversationId: cid, userId: uid, username, avatar }: {
      conversationId: string; userId: string; username: string; avatar?: string | null;
    }) {
      if (cid !== conversationId) return;
      setTypingUsers((prev) => {
        const next = new Map(prev);
        next.set(uid, { username, avatar });
        return next;
      });
      // Clear previous timer for this user
      const prev = typingTimersRef.current.get(uid);
      if (prev) clearTimeout(prev);
      const timer = setTimeout(() => {
        setTypingUsers((prev) => {
          const next = new Map(prev);
          next.delete(uid);
          return next;
        });
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

  // ── Socket.io: read_receipt — update per-user readAt ──────────────────────
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

  // ── Socket.io: nhận reaction_update — cập nhật reactions của tin nhắn ─────
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    function handleReactionUpdate({
      conversationId: cid,
      messageId,
      reactions,
    }: {
      conversationId: string;
      messageId: string;
      reactions: { id: string; emoji: string; userId: string }[];
    }) {
      if (cid !== conversationId) return;
      qc.setQueryData(
        ["messages", conversationId],
        (old: { messages: ChatMessage[]; otherUserLastReadAt: string | null } | undefined) => {
          if (!old) return old;
          return {
            ...old,
            messages: old.messages.map((m) =>
              m.id === messageId ? { ...m, reactions } : m
            ),
          };
        }
      );
    }

    socket.on("reaction_update", handleReactionUpdate);
    return () => { socket.off("reaction_update", handleReactionUpdate); };
  }, [conversationId, qc]);

  // ── Socket.io: new message — invalidate to fetch immediately ─────────────
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

  // ── Socket.io: group_updated / member changes ─────────────────────────────
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

  // ── Socket.io: nickname_updated ───────────────────────────────────────────
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

  // ── Socket.io: message_pinned ────────────────────────────────────────────
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

  // ── Socket.io: query + receive presence updates ───────────────────────
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !otherUser?.id) return;

    // Ask server for current presence of the other user on open
    socket.emit("get_presence", { userId: otherUser.id });

    function handlePresence({
      userId,
      isOnline,
      lastSeen,
    }: {
      userId: string;
      isOnline: boolean;
      lastSeen: string | null;
    }) {
      if (userId !== otherUser?.id) return;
      setOtherUserPresence({ isOnline, lastSeen });
    }

    socket.on("presence_update", handlePresence);
    return () => { socket.off("presence_update", handlePresence); };
  }, [otherUser?.id]);

  // ── Emit typing event (debounce 2s) ───────────────────────────────────────
  function handleTypingEmit() {
    const now = Date.now();
    if (now - lastTypingEmitRef.current < 2000) return;
    lastTypingEmitRef.current = now;
    getSocket()?.emit("typing", { conversationId });
  }

  // ── Track scroll position to show/hide the scroll-down button ───────────
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    function handleScroll() {
      const distanceFromBottom = el!.scrollHeight - el!.scrollTop - el!.clientHeight;
      setShowScrollDown(distanceFromBottom > 150);
    }
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  // ── Initial scroll: jump to bottom instantly when messages first load ────
  const hasInitialScrolled = useRef(false);
  useEffect(() => {
    if (hasInitialScrolled.current) return;
    if (messages.length === 0) return;
    bottomRef.current?.scrollIntoView({ behavior: "instant" as ScrollBehavior });
    hasInitialScrolled.current = true;
  }, [messages.length]);

  // ── New-message scroll: only pull down if user is already near bottom ─────
  useEffect(() => {
    if (!hasInitialScrolled.current) return;
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom <= 300) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, typingUsers.size]);

  // ── Send text ──────────────────────────────────────────────────────────────
  const sendMutation = useMutation({
    mutationFn: () =>
      api.post(`/api/messages/conversations/${conversationId}`, {
        body,
        ...(replyingTo ? { replyToId: replyingTo.id } : {}),
      }),
    onSuccess: () => {
      setBody("");
      setReplyingTo(null);
      qc.invalidateQueries({ queryKey: ["messages", conversationId] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    },
    onError: (err: any) => {
      dispatchToast(err?.response?.data?.error ?? "Failed to send message", "error");
    },
  });

  // ── Send images (1–10, uses /images endpoint) ─────────────────────────────
  const sendImagesMutation = useMutation({
    mutationFn: ({ files, caption }: { files: File[]; caption: string }) => {
      const form = new FormData();
      files.forEach((f) => form.append("images", f));
      if (caption) form.append("caption", caption);
      if (replyingTo) form.append("replyToId", replyingTo.id);
      return api.post(`/api/messages/conversations/${conversationId}/images`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    onSuccess: () => {
      setReplyingTo(null);
      qc.invalidateQueries({ queryKey: ["messages", conversationId] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    },
    onError: (err: any) => {
      dispatchToast(err?.response?.data?.error ?? "Failed to send image(s)", "error");
    },
  });

  // ── Send game card ─────────────────────────────────────────────────────────
  const sendGameMutation = useMutation({
    mutationFn: ({ gameId, caption }: { gameId: string; caption: string }) =>
      api.post(`/api/messages/conversations/${conversationId}`, {
        gameId,
        body: caption,
        ...(replyingTo ? { replyToId: replyingTo.id } : {}),
      }),
    onSuccess: () => {
      setReplyingTo(null);
      qc.invalidateQueries({ queryKey: ["messages", conversationId] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    },
    onError: (err: any) => {
      dispatchToast(err?.response?.data?.error ?? "Failed to share game", "error");
    },
  });

  // ── Send voice message ────────────────────────────────────────────────────
  const sendAudioMutation = useMutation({
    mutationFn: ({ blob, duration }: { blob: Blob; duration: number }) => {
      const form = new FormData();
      // Use .webm extension; backend accepts any audio/* MIME
      form.append("audio", blob, "voice.webm");
      form.append("duration", String(duration));
      return api.post(`/api/messages/conversations/${conversationId}/audio`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["messages", conversationId] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    },
    onError: (err: any) => {
      dispatchToast(err?.response?.data?.error ?? "Failed to send voice message", "error");
    },
  });

  // ── Forward message ───────────────────────────────────────────────────────
  const forwardMutation = useMutation({
    mutationFn: ({ messageId, targetConversationId }: { messageId: string; targetConversationId: string }) =>
      api.post(`/api/messages/conversations/${targetConversationId}/forward`, { messageId }),
    onSuccess: (_, { targetConversationId }) => {
      setForwardingMsg(null);
      qc.invalidateQueries({ queryKey: ["messages", targetConversationId] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
      dispatchToast("Message forwarded", "success");
    },
    onError: (err: any) => {
      dispatchToast(err?.response?.data?.error ?? "Failed to forward message", "error");
    },
  });

  // ── Pin / unpin ───────────────────────────────────────────────────────────
  const pinMutation = useMutation({
    mutationFn: (messageId: string | null) =>
      api.post(`/api/messages/conversations/${conversationId}/pin`, { messageId }),
    onError: (err: any) => {
      dispatchToast(err?.response?.data?.error ?? "Failed to pin message", "error");
    },
  });

  function scrollToPinnedMessage() {
    if (!pinnedMessage) return;
    const el = messageRefsMap.current.get(pinnedMessage.id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedMsgId(pinnedMessage.id);
      setTimeout(() => setHighlightedMsgId(null), 1500);
    }
  }

  // Can pin: admin in groups, any participant in DMs
  const myRole = messagesData?.members.find((m) => m.id === user?.id)?.role;
  const canPin = messagesData?.isGroup ? myRole === "admin" : !!messagesData;

  // ── Search helpers ────────────────────────────────────────────────────────
  function scrollToMessage(msgId: string) {
    setSearchOpen(false);
    const el = messageRefsMap.current.get(msgId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedMsgId(msgId);
      setTimeout(() => setHighlightedMsgId(null), 1500);
    }
  }

  // ── Load earlier (cursor pagination) ──────────────────────────────────────
  async function loadEarlier() {
    const allMsgs = [...earlierMessages, ...messages];
    const oldest = allMsgs[0];
    if (!oldest) return;
    setLoadingEarlier(true);
    try {
      const { data } = await api.get<{ messages: ChatMessage[]; otherUserLastReadAt: string | null }>(
        `/api/messages/conversations/${conversationId}?before=${oldest.id}&limit=30`
      );
      if (data.messages.length < 30) setHasEarlier(false);
      setEarlierMessages((prev) => [...data.messages, ...prev]);
    } catch { /* silently fail */ }
    finally { setLoadingEarlier(false); }
  }

  const allMessages = [...earlierMessages, ...messages];

  if (!user) return null;

  return (
    <div className="flex flex-col h-full">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/8 shrink-0">
        {searchOpen ? (
          <>
            <Search size={14} className="text-gray-500 shrink-0" />
            <input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Escape") setSearchOpen(false); }}
              placeholder="Search messages…"
              className="flex-1 bg-transparent text-sm text-white outline-none placeholder-gray-600"
            />
            {searchFetching && <Loader2 size={13} className="animate-spin text-gray-500 shrink-0" />}
            <button
              onClick={() => setSearchOpen(false)}
              className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-white/8 rounded-lg transition-colors shrink-0"
            >
              <X size={15} />
            </button>
          </>
        ) : conv?.isGroup ? (
          <>
            {/* Group avatar: custom image > participant stack > icon */}
            <div className="relative w-8 h-8 shrink-0">
              {conv.avatar ? (
                <div className="w-8 h-8 rounded-full overflow-hidden">
                  <Image src={conv.avatar} alt={conv.name ?? "Group"} width={32} height={32} className="object-cover w-full h-full" />
                </div>
              ) : conv.participants.length >= 2 ? (
                <>
                  <div className="absolute bottom-0 left-0 w-5 h-5 rounded-full border border-zinc-900 overflow-hidden bg-violet-700 flex items-center justify-center">
                    {conv.participants[1]?.avatar ? (
                      <Image src={conv.participants[1].avatar} alt={conv.participants[1].username ?? "?"} width={20} height={20} className="object-cover w-full h-full" />
                    ) : (
                      <span className="text-white font-bold uppercase text-[8px] leading-none select-none">{(conv.participants[1]?.username ?? "?")[0]}</span>
                    )}
                  </div>
                  <div className="absolute top-0 right-0 w-5 h-5 rounded-full border border-zinc-900 overflow-hidden bg-violet-700 flex items-center justify-center">
                    {conv.participants[0]?.avatar ? (
                      <Image src={conv.participants[0].avatar} alt={conv.participants[0].username ?? "?"} width={20} height={20} className="object-cover w-full h-full" />
                    ) : (
                      <span className="text-white font-bold uppercase text-[8px] leading-none select-none">{(conv.participants[0]?.username ?? "?")[0]}</span>
                    )}
                  </div>
                </>
              ) : (
                <div className="w-8 h-8 rounded-full bg-violet-700/40 flex items-center justify-center">
                  <Users size={14} className="text-violet-300" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{conv.name ?? "Group"}</p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                {(messagesData?.members.length ?? conv.participants.length + 1)} members
              </p>
            </div>
            <button
              onClick={() => setSearchOpen(true)}
              title="Search messages"
              className="p-1.5 text-gray-500 hover:text-white hover:bg-white/8 rounded-lg transition-colors shrink-0"
            >
              <Search size={15} />
            </button>
          </>
        ) : otherUser ? (
          <>
            <Avatar src={otherUser.avatar} username={otherUser.username} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{otherUser.username}</p>
              {otherUserPresence?.isOnline ? (
                <p className="text-[11px] text-emerald-400 flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  Online
                </p>
              ) : otherUserPresence?.lastSeen ? (
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Active {formatDistanceToNow(otherUserPresence.lastSeen)}
                </p>
              ) : null}
            </div>
            <button
              onClick={() => setSearchOpen(true)}
              title="Search messages"
              className="p-1.5 text-gray-500 hover:text-white hover:bg-white/8 rounded-lg transition-colors shrink-0"
            >
              <Search size={15} />
            </button>
            <Slot
              role="link"
              tabIndex={0}
              className="p-1.5 text-gray-500 hover:text-white transition-colors cursor-pointer outline-none rounded-lg hover:bg-white/8"
              onClick={() => router.push(`/user/${otherUser.username}`)}
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === "Enter" || e.key === " ")
                  router.push(`/user/${otherUser.username}`);
              }}
            >
              <div title="View profile"><ExternalLink size={15} /></div>
            </Slot>
          </>
        ) : (
          <div className="h-8" />
        )}
      </div>

      {/* ── Pinned message banner ──────────────────────────────────────── */}
      {pinnedMessage && (
        <button
          onClick={scrollToPinnedMessage}
          className="w-full shrink-0 flex items-center gap-3 px-4 py-2 border-b border-white/8 bg-violet-950/40 hover:bg-violet-900/30 transition-colors text-left"
        >
          <Pin size={13} className="text-violet-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-violet-400 font-medium leading-none mb-0.5">
              Pinned · {pinnedMessage.sender.username}
            </p>
            <p className="text-xs text-gray-400 truncate">
              {pinnedMessage.audioUrl
                ? "🎤 Voice message"
                : pinnedMessage.imageUrl
                ? "📷 Photo"
                : pinnedMessage.body || "…"}
            </p>
          </div>
          {canPin && (
            <div
              role="button"
              onClick={(e) => { e.stopPropagation(); pinMutation.mutate(null); }}
              className="p-1 text-gray-600 hover:text-gray-300 transition-colors shrink-0"
              title="Unpin"
            >
              <X size={13} />
            </div>
          )}
        </button>
      )}

      {/* ── Search results panel ───────────────────────────────────────── */}
      {searchOpen && (
        <div className="shrink-0 border-b border-white/8 max-h-72 overflow-y-auto bg-zinc-950">
          {/* Prompt */}
          {debouncedSearch.trim().length < 2 && (
            <p className="py-8 text-center text-xs text-gray-600">Type at least 2 characters to search</p>
          )}
          {/* No results */}
          {debouncedSearch.trim().length >= 2 && !searchFetching && searchResults.length === 0 && (
            <p className="py-8 text-center text-xs text-gray-600">No messages found for &quot;{debouncedSearch}&quot;</p>
          )}
          {/* Results */}
          {searchResults.map((msg) => {
            const isOwn = msg.senderId === user?.id;
            const bodyLower = msg.body.toLowerCase();
            const qLower = debouncedSearch.toLowerCase();
            const matchIdx = bodyLower.indexOf(qLower);
            const highlighted =
              matchIdx === -1 ? (
                <span className="truncate">{msg.body}</span>
              ) : (
                <span>
                  {msg.body.slice(0, matchIdx)}
                  <mark className="bg-violet-500/40 text-white rounded-sm not-italic">
                    {msg.body.slice(matchIdx, matchIdx + debouncedSearch.length)}
                  </mark>
                  {msg.body.slice(matchIdx + debouncedSearch.length)}
                </span>
              );

            return (
              <button
                key={msg.id}
                onClick={() => scrollToMessage(msg.id)}
                className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-left border-b border-white/5 last:border-0"
              >
                <Avatar src={msg.sender.avatar} username={msg.sender.username} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-semibold text-gray-300">
                      {isOwn ? "You" : msg.sender.username}
                    </span>
                    <span className="text-[10px] text-gray-600">
                      {formatDistanceToNow(msg.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{highlighted}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Messages area ──────────────────────────────────────────────── */}
      <div className="flex-1 relative min-h-0">
      <div ref={scrollContainerRef} className="h-full overflow-y-auto overflow-x-hidden px-4 py-4">
        {/* Load earlier */}
        {hasEarlier && allMessages.length >= 30 && (
          <div className="text-center pb-4">
            <button
              onClick={loadEarlier}
              disabled={loadingEarlier}
              className="text-xs text-violet-400 hover:text-violet-300 disabled:opacity-40 transition-colors"
            >
              {loadingEarlier ? (
                <span className="flex items-center gap-1.5 justify-center">
                  <Loader2 size={11} className="animate-spin" />
                  Loading earlier messages…
                </span>
              ) : (
                "↑ Load earlier messages"
              )}
            </button>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-12 text-gray-600">
            <Loader2 size={15} className="animate-spin" />
            <span className="text-xs">Loading messages…</span>
          </div>
        )}

        {!isLoading && allMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-600 pb-8">
            <p className="text-sm">No messages yet.</p>
            <p className="text-xs">
              {conv?.isGroup
                ? `Say hi to the group! 👋`
                : `Say hi to ${otherUser?.username ?? "them"}! 👋`}
            </p>
          </div>
        )}

        {/* Message bubbles */}
        <div className="space-y-0.5 w-full">
          {(() => {
            // Build seenByMap: messageId → members whose last-read falls on this message
            // For each member (not me), find the latest message they've seen
            const allMembers = messagesData?.members ?? (otherUser ? [{ id: otherUser.id, username: otherUser.username, avatar: otherUser.avatar }] : []);
            type SeenUser = { id: string; username: string; avatar?: string | null };
            const seenByMap = new Map<string, SeenUser[]>();
            for (const m of allMembers) {
              if (m.id === user.id) continue;
              const readAt = memberReadAt.get(m.id);
              if (!readAt) continue;
              const cutoff = new Date(readAt);
              for (let j = allMessages.length - 1; j >= 0; j--) {
                if (new Date(allMessages[j].createdAt) <= cutoff) {
                  const mid = allMessages[j].id;
                  if (!seenByMap.has(mid)) seenByMap.set(mid, []);
                  seenByMap.get(mid)!.push({ id: m.id, username: m.username, avatar: m.avatar });
                  break;
                }
              }
            }

            return allMessages.map((msg, i) => {
              const isOwn = msg.senderId === user.id;
              const prevMsg = allMessages[i - 1];
              const nextMsg = allMessages[i + 1];
              const showSender = !prevMsg || prevMsg.senderId !== msg.senderId;
              const isLastInGroup = !nextMsg || nextMsg.senderId !== msg.senderId;
              // Only show seen on own messages
              const seenBy = isOwn ? (seenByMap.get(msg.id) ?? []) : [];

              return (
                <div
                  key={msg.id}
                  ref={(el) => {
                    if (el) messageRefsMap.current.set(msg.id, el);
                    else messageRefsMap.current.delete(msg.id);
                  }}
                  className={`flex w-full ${isOwn ? "justify-end" : "justify-start"} ${
                    showSender && i > 0 ? "mt-4" : "mt-0.5"
                  } ${isLastInGroup ? "mb-1" : ""} ${
                    highlightedMsgId === msg.id
                      ? "bg-violet-500/10 rounded-xl transition-colors duration-700"
                      : ""
                  }`}
                >
                  <MessageBubble
                    message={msg}
                    isOwn={isOwn}
                    showSender={showSender}
                    seenBy={seenBy}
                    nickname={nicknames.get(msg.senderId)}
                    onReply={setReplyingTo}
                    onForward={setForwardingMsg}
                    onPin={canPin ? (m) => pinMutation.mutate(m.id) : undefined}
                  />
                </div>
              );
            });
          })()}
        </div>

        {/* Typing indicator — shows stacked avatars of who is typing */}
        {typingUsers.size > 0 && (
          <div className="flex items-end gap-2 mt-1 mb-1">
            {/* Stacked avatars */}
            <div className="flex items-center">
              {Array.from(typingUsers.entries()).slice(0, 3).map(([uid, u], i) => (
                <div
                  key={uid}
                  className="rounded-full overflow-hidden border-2 border-zinc-900 w-7 h-7 shrink-0 bg-violet-700 flex items-center justify-center"
                  style={{ marginLeft: i === 0 ? 0 : -8, zIndex: i }}
                >
                  {u.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={u.avatar} alt={u.username} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white font-bold uppercase text-[10px] leading-none select-none">{u.username[0]}</span>
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-1 px-3.5 py-3 bg-white/10 backdrop-blur-sm rounded-2xl rounded-bl-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Scroll-to-bottom button ───────────────────────────────────── */}
      {showScrollDown && (
        <button
          onClick={() => bottomRef.current?.scrollIntoView({ behavior: "smooth" })}
          className="absolute bottom-4 right-4 z-20 w-8 h-8 rounded-full bg-zinc-800 border border-white/10 shadow-lg flex items-center justify-center text-gray-300 hover:text-white hover:bg-zinc-700 transition-all"
          title="Scroll to latest"
        >
          <ArrowDown size={15} />
        </button>
      )}
      </div>

      {/* ── Reply bar ──────────────────────────────────────────────────── */}
      {replyingTo && (
        <div className="shrink-0 px-4 py-2 border-t border-white/8 bg-white/3 flex items-center gap-3">
          {/* Accent */}
          <div className="w-0.5 h-8 rounded-full bg-violet-400/60 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-violet-300 font-semibold truncate">
              Replying to {nicknames.get(replyingTo.senderId) ?? replyingTo.sender.username}
            </p>
            <p className="text-xs text-gray-500 truncate mt-0.5">
              {(() => {
                if (replyingTo.body === "[deleted]") return "Message deleted";
                const multiCount = (() => {
                  if (!replyingTo.imageUrls) return 0;
                  try { return (JSON.parse(replyingTo.imageUrls) as string[]).length; } catch { return 0; }
                })();
                if (multiCount > 1) return `📷 ${multiCount} photos${replyingTo.body ? ` — ${replyingTo.body}` : ""}`;
                if (replyingTo.imageUrl && !replyingTo.body) return "📷 Photo";
                if (replyingTo.imageUrl && replyingTo.body) return `📷 ${replyingTo.body}`;
                return replyingTo.body;
              })()}
            </p>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/8 transition-colors shrink-0"
            title="Cancel reply"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Input ──────────────────────────────────────────────────────── */}
      <div className="shrink-0 px-4 pb-4 pt-2 border-t border-white/8/60">
        <ChatInput
          value={body}
          onChange={setBody}
          onSubmit={() => { if (!sendMutation.isPending) sendMutation.mutate(); }}
          onSubmitImages={(files, caption) => sendImagesMutation.mutate({ files, caption })}
          onSubmitGame={(gameId, caption) => sendGameMutation.mutate({ gameId, caption })}
          onSubmitAudio={(blob, duration) => sendAudioMutation.mutate({ blob, duration })}
          onTyping={handleTypingEmit}
          disabled={sendMutation.isPending || sendImagesMutation.isPending || sendGameMutation.isPending || sendAudioMutation.isPending}
          placeholder={conv?.isGroup ? `Message ${conv.name ?? "group"}…` : `Message ${otherUser?.username ?? ""}…`}
        />
      </div>

      {/* ── Forward modal ───────────────────────────────────────────────── */}
      {forwardingMsg && (
        <ForwardModal
          messageId={forwardingMsg.id}
          onClose={() => setForwardingMsg(null)}
          onForward={(targetConversationId) =>
            forwardMutation.mutate({ messageId: forwardingMsg.id, targetConversationId })
          }
          forwarding={forwardMutation.isPending}
        />
      )}

    </div>
  );
}
