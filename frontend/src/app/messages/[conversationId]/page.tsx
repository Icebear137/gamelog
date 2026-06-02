"use client";

import { use, useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { ChatMessage, Conversation, GroupMember, PinnedMessage } from "@/lib/types";
import { dispatchToast } from "@/lib/toast";
import { getSocket } from "@/lib/socket-client";
import ChatInput from "@/components/ChatInput";
import ForwardModal from "@/components/ForwardModal";
import { useConversationSocket } from "./_hooks/useConversationSocket";
import { useConversationMutations } from "./_hooks/useConversationMutations";
import { ConversationHeader } from "./_components/ConversationHeader";
import { PinnedMessageBanner } from "./_components/PinnedMessageBanner";
import { MessageSearchPanel } from "./_components/MessageSearchPanel";
import { MessagesList } from "./_components/MessagesList";
import { ReplyBar } from "./_components/ReplyBar";

export default function ConversationPage({ params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = use(params);
  const { user } = useAuth();
  const qc = useQueryClient();

  const [body, setBody] = useState("");
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [forwardingMsg, setForwardingMsg] = useState<ChatMessage | null>(null);
  const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null);

  // Pagination
  const [earlierMessages, setEarlierMessages] = useState<ChatMessage[]>([]);
  const [loadingEarlier, setLoadingEarlier] = useState(false);
  const [hasEarlier, setHasEarlier] = useState(true);

  // Scroll
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const hasInitialScrolled = useRef(false);
  const messageRefsMap = useRef<Map<string, HTMLDivElement>>(new Map());

  // Typing debounce
  const lastTypingEmitRef = useRef(0);

  // Search
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // ── Queries ─────────────────────────────────────────────────────────────────
  const { data: convList = [] } = useQuery<Conversation[]>({
    queryKey: ["conversations"],
    queryFn: () => api.get("/api/messages/conversations").then((r) => r.data),
    enabled: !!user,
    staleTime: 60_000,
  });
  const conv = convList.find((c) => c.id === conversationId);
  const otherUser = conv?.otherUser;

  const { data: nicknamesRaw = [] } = useQuery<{ userId: string; nickname: string }[]>({
    queryKey: ["nicknames", conversationId],
    queryFn: () => api.get(`/api/messages/conversations/${conversationId}/nicknames`).then((r) => r.data),
    enabled: !!user,
    staleTime: 60_000,
  });
  const nicknames = new Map(nicknamesRaw.map((n) => [n.userId, n.nickname]));

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
    queryFn: () => api.get(`/api/messages/conversations/${conversationId}?limit=30`).then((r) => r.data),
    enabled: !!user,
    refetchInterval: 5_000,
    refetchIntervalInBackground: false,
  });

  const { data: searchResults = [], isFetching: searchFetching } = useQuery<ChatMessage[]>({
    queryKey: ["messages-search", conversationId, debouncedSearch],
    queryFn: () =>
      api.get(`/api/messages/conversations/${conversationId}/search?q=${encodeURIComponent(debouncedSearch.trim())}`).then((r) => r.data),
    enabled: debouncedSearch.trim().length >= 2,
    staleTime: 30_000,
  });

  const messages = messagesData?.messages ?? [];
  const allMessages = [...earlierMessages, ...messages];
  const members = messagesData?.members ?? (otherUser ? [{ id: otherUser.id, username: otherUser.username, avatar: otherUser.avatar }] : []);
  const myRole = messagesData?.members.find((m) => m.id === user?.id)?.role;
  const canPin = messagesData?.isGroup ? myRole === "admin" : !!messagesData;
  const membersCount = messagesData?.members.length ?? (conv?.participants.length ?? 0) + 1;

  // ── Socket hook ──────────────────────────────────────────────────────────────
  const { typingUsers, memberReadAt, otherUserPresence, pinnedMessage } = useConversationSocket({
    conversationId,
    otherUserId: otherUser?.id,
    currentUserId: user?.id ?? "",
    messagesData,
    qc,
    setEarlierMessages,
  });

  // ── Mutations ────────────────────────────────────────────────────────────────
  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const { sendMutation, sendImagesMutation, sendGameMutation, sendAudioMutation, sendFileMutation, forwardMutation, pollMutation, gameNightMutation, pinMutation } =
    useConversationMutations({
      conversationId,
      qc,
      scrollToBottom,
      onSendSuccess: () => { setBody(""); setReplyingTo(null); },
      onImageSendSuccess: () => setReplyingTo(null),
      onGameSendSuccess: () => setReplyingTo(null),
      onForwardSuccess: () => setForwardingMsg(null),
    });

  // ── Mark read ────────────────────────────────────────────────────────────────
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

  // ── Search: debounce + focus ─────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
    else { setSearchQuery(""); setDebouncedSearch(""); }
  }, [searchOpen]);

  // ── Scroll tracking ──────────────────────────────────────────────────────────
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const handleScroll = () => {
      setShowScrollDown(el.scrollHeight - el.scrollTop - el.clientHeight > 150);
    };
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  // Reset on conversation switch
  useEffect(() => {
    setEarlierMessages([]);
    setHasEarlier(true);
    hasInitialScrolled.current = false;
  }, [conversationId]);

  // Initial scroll to bottom
  useEffect(() => {
    if (hasInitialScrolled.current || messages.length === 0) return;
    bottomRef.current?.scrollIntoView({ behavior: "instant" as ScrollBehavior });
    hasInitialScrolled.current = true;
  }, [messages.length]);

  // Auto-scroll when near bottom
  useEffect(() => {
    if (!hasInitialScrolled.current) return;
    const el = scrollContainerRef.current;
    if (!el) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight <= 300) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, typingUsers.size]);

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function handleTypingEmit() {
    const now = Date.now();
    if (now - lastTypingEmitRef.current < 2000) return;
    lastTypingEmitRef.current = now;
    getSocket()?.emit("typing", { conversationId });
  }

  function scrollToMessage(msgId: string) {
    setSearchOpen(false);
    const el = messageRefsMap.current.get(msgId);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightedMsgId(msgId);
    setTimeout(() => setHighlightedMsgId(null), 1500);
  }

  function scrollToPinnedMessage() {
    if (!pinnedMessage) return;
    const el = messageRefsMap.current.get(pinnedMessage.id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedMsgId(pinnedMessage.id);
      setTimeout(() => setHighlightedMsgId(null), 1500);
    } else {
      dispatchToast("Pinned message not loaded — scroll up to find it", "info");
    }
  }

  async function loadEarlier() {
    const oldest = allMessages[0];
    if (!oldest) return;
    setLoadingEarlier(true);
    try {
      const { data } = await api.get<{ messages: ChatMessage[] }>(
        `/api/messages/conversations/${conversationId}?before=${oldest.id}&limit=30`
      );
      if (data.messages.length < 30) setHasEarlier(false);
      setEarlierMessages((prev) => [...data.messages, ...prev]);
    } catch { /* silently fail */ }
    finally { setLoadingEarlier(false); }
  }

  if (!user) return null;

  return (
    <div className="flex flex-col h-full">
      <ConversationHeader
        conv={conv}
        membersCount={membersCount}
        otherUserPresence={otherUserPresence}
        searchOpen={searchOpen}
        setSearchOpen={setSearchOpen}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchFetching={searchFetching}
        searchInputRef={searchInputRef}
      />

      {pinnedMessage && (
        <PinnedMessageBanner
          pinnedMessage={pinnedMessage}
          canPin={canPin}
          onScrollTo={scrollToPinnedMessage}
          onUnpin={() => pinMutation.mutate(null)}
        />
      )}

      {searchOpen && (
        <MessageSearchPanel
          debouncedSearch={debouncedSearch}
          searchFetching={searchFetching}
          searchResults={searchResults}
          currentUserId={user.id}
          onScrollToMessage={scrollToMessage}
        />
      )}

      <MessagesList
        allMessages={allMessages}
        isLoading={isLoading}
        hasEarlier={hasEarlier}
        loadingEarlier={loadingEarlier}
        typingUsers={typingUsers}
        memberReadAt={memberReadAt}
        members={members}
        currentUserId={user.id}
        conv={conv}
        nicknames={nicknames}
        highlightedMsgId={highlightedMsgId}
        canPin={canPin}
        showScrollDown={showScrollDown}
        scrollContainerRef={scrollContainerRef}
        bottomRef={bottomRef}
        messageRefsMap={messageRefsMap}
        onLoadEarlier={loadEarlier}
        onReply={setReplyingTo}
        onForward={setForwardingMsg}
        onPin={(id) => pinMutation.mutate(id)}
        onScrollDown={scrollToBottom}
      />

      {replyingTo && (
        <ReplyBar
          replyingTo={replyingTo}
          nicknames={nicknames}
          onCancel={() => setReplyingTo(null)}
        />
      )}

      <div className="shrink-0 px-4 pb-4 pt-2 border-t border-white/8/60">
        <ChatInput
          value={body}
          onChange={setBody}
          onSubmit={() => { if (!sendMutation.isPending) sendMutation.mutate({ body, replyToId: replyingTo?.id }); }}
          onSubmitImages={(files, caption) => sendImagesMutation.mutate({ files, caption, replyToId: replyingTo?.id })}
          onSubmitGame={(gameId, caption) => sendGameMutation.mutate({ gameId, caption, replyToId: replyingTo?.id })}
          onSubmitAudio={(blob, duration) => sendAudioMutation.mutate({ blob, duration })}
          onSubmitFile={(file) => sendFileMutation.mutate(file)}
          onSubmitPoll={(question, options, allowMultiple, endsAt, anonymous) => pollMutation.mutate({ question, options, allowMultiple, endsAt, anonymous })}
          onSubmitGameNight={conv?.isGroup ? (data) => gameNightMutation.mutate(data) : undefined}
          onTyping={handleTypingEmit}
          disabled={sendMutation.isPending || sendImagesMutation.isPending || sendGameMutation.isPending || sendAudioMutation.isPending || sendFileMutation.isPending}
          placeholder={conv?.isGroup ? `Message ${conv.name ?? "group"}…` : `Message ${otherUser?.username ?? ""}…`}
        />
      </div>

      {forwardingMsg && (
        <ForwardModal
          message={forwardingMsg}
          onClose={() => setForwardingMsg(null)}
          onForward={(targetConversationId) => forwardMutation.mutate({ messageId: forwardingMsg.id, targetConversationId })}
          forwarding={forwardMutation.isPending}
        />
      )}
    </div>
  );
}
