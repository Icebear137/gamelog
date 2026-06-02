"use client";

import { Loader2, ArrowDown } from "lucide-react";
import { ChatMessage, Conversation } from "@/lib/types";
import MessageBubble from "@/components/MessageBubble";
import { formatDateSeparator } from "@/lib/utils";

function isSameDay(a: string, b: string) {
  const da = new Date(a), db = new Date(b);
  return da.getFullYear() === db.getFullYear()
    && da.getMonth() === db.getMonth()
    && da.getDate() === db.getDate();
}

interface Member { id: string; username: string; avatar?: string | null }

interface Props {
  allMessages: ChatMessage[];
  isLoading: boolean;
  hasEarlier: boolean;
  loadingEarlier: boolean;
  typingUsers: Map<string, { username: string; avatar?: string | null }>;
  memberReadAt: Map<string, string>;
  members: Member[];
  currentUserId: string;
  conv: Conversation | undefined;
  nicknames: Map<string, string>;
  highlightedMsgId: string | null;
  canPin: boolean;
  showScrollDown: boolean;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  bottomRef: React.RefObject<HTMLDivElement | null>;
  messageRefsMap: React.MutableRefObject<Map<string, HTMLDivElement>>;
  onLoadEarlier: () => void;
  onReply: (msg: ChatMessage) => void;
  onForward: (msg: ChatMessage) => void;
  onPin: (msgId: string) => void;
  onScrollDown: () => void;
}

export function MessagesList({
  allMessages, isLoading, hasEarlier, loadingEarlier,
  typingUsers, memberReadAt, members, currentUserId,
  conv, nicknames, highlightedMsgId, canPin,
  showScrollDown, scrollContainerRef, bottomRef, messageRefsMap,
  onLoadEarlier, onReply, onForward, onPin, onScrollDown,
}: Props) {
  // Build seenByMap: for each non-self member, find the latest message they've read
  type SeenUser = { id: string; username: string; avatar?: string | null };
  const seenByMap = new Map<string, SeenUser[]>();
  for (const m of members) {
    if (m.id === currentUserId) continue;
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

  return (
    <div className="flex-1 relative min-h-0">
      <div ref={scrollContainerRef} className="h-full overflow-y-auto overflow-x-hidden px-4 py-4">
        {hasEarlier && allMessages.length >= 30 && (
          <div className="text-center pb-4">
            <button
              onClick={onLoadEarlier}
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
                : `Say hi to ${conv?.otherUser?.username ?? "them"}! 👋`}
            </p>
          </div>
        )}

        <div className="space-y-0.5 w-full">
          {allMessages.map((msg, i) => {
            const isOwn = msg.senderId === currentUserId;
            const prevMsg = allMessages[i - 1];
            const nextMsg = allMessages[i + 1];
            const showSender = !prevMsg || prevMsg.senderId !== msg.senderId;
            const isLastInGroup = !nextMsg || nextMsg.senderId !== msg.senderId;
            const seenBy = isOwn ? (seenByMap.get(msg.id) ?? []) : [];
            const showDateSep = !prevMsg || !isSameDay(prevMsg.createdAt, msg.createdAt);
            return (
              <div key={msg.id}>
                {/* Date separator */}
                {showDateSep && (
                  <div className="flex items-center gap-3 my-4 px-2">
                    <div className="flex-1 h-px bg-white/8" />
                    <span className="text-[11px] text-gray-500 font-medium shrink-0 select-none">
                      {formatDateSeparator(msg.createdAt)}
                    </span>
                    <div className="flex-1 h-px bg-white/8" />
                  </div>
                )}

                <div
                  ref={(el) => {
                    if (el) messageRefsMap.current.set(msg.id, el);
                    else messageRefsMap.current.delete(msg.id);
                  }}
                  className={`flex w-full ${isOwn ? "justify-end" : "justify-start"} ${
                    showSender && !showDateSep && i > 0 ? "mt-4" : showDateSep ? "mt-0" : "mt-0.5"
                  } ${isLastInGroup ? "mb-1" : ""} ${
                    highlightedMsgId === msg.id ? "bg-violet-500/10 rounded-xl transition-colors duration-700" : ""
                  }`}
                >
                  <MessageBubble
                    message={msg}
                    isOwn={isOwn}
                    showSender={showSender}
                    seenBy={seenBy}
                    nickname={nicknames.get(msg.senderId)}
                    onReply={onReply}
                    onForward={onForward}
                    onPin={canPin ? (m) => onPin(m.id) : undefined}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {typingUsers.size > 0 && (
          <div className="flex items-end gap-2 mt-1 mb-1">
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

      {showScrollDown && (
        <button
          onClick={onScrollDown}
          className="absolute bottom-4 right-4 z-20 w-8 h-8 rounded-full bg-zinc-800 border border-white/10 shadow-lg flex items-center justify-center text-gray-300 hover:text-white hover:bg-zinc-700 transition-all"
          title="Scroll to latest"
        >
          <ArrowDown size={15} />
        </button>
      )}
    </div>
  );
}
