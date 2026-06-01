"use client";

import { useState } from "react";
import { Reply, Smile, Forward, Pin } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChatMessage, MessageReaction } from "@/lib/types";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatDistanceToNow, extractFirstUrl } from "@/lib/utils";
import Avatar from "./Avatar";
import PollBubble from "./PollBubble";
import GameNightBubble from "./GameNightBubble";
import { Lightbox } from "./message/Lightbox";
import { ImageContent } from "./message/ImageContent";
import { ImageGrid } from "./message/ImageGrid";
import { ReplyQuote } from "./message/ReplyQuote";
import { AudioBubble } from "./message/AudioBubble";
import { FileBubble } from "./message/FileBubble";
import { GameCard } from "./message/GameCard";
import { QuickReactionPicker } from "./message/QuickReactionPicker";
import { ReactionPills } from "./message/ReactionPills";
import { LinkPreviewCard } from "./message/LinkPreviewCard";

// Re-export for any external consumers
export { Lightbox };

interface SeenUser { id: string; username: string; avatar?: string | null }

interface Props {
  message: ChatMessage;
  isOwn: boolean;
  showSender?: boolean;
  seenBy?: SeenUser[];
  nickname?: string;
  onReply?: (msg: ChatMessage) => void;
  onForward?: (msg: ChatMessage) => void;
  onPin?: (msg: ChatMessage) => void;
}

function renderTextWithLinks(text: string, isOwn: boolean): React.ReactNode {
  const urlRegex = /https?:\/\/[^\s]+/g;
  const segments: React.ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = urlRegex.exec(text)) !== null) {
    const url = match[0].replace(/[.,!?)'"]+$/, "");
    if (match.index > cursor) segments.push(text.slice(cursor, match.index));
    segments.push(
      <a
        key={match.index}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className={`underline underline-offset-2 hover:opacity-80 transition-opacity break-all ${isOwn ? "text-violet-200" : "text-blue-300"}`}
      >
        {url}
      </a>
    );
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length) segments.push(text.slice(cursor));
  if (segments.length === 0) return text;
  return <>{segments}</>;
}

export default function MessageBubble({ message, isOwn, showSender = true, seenBy = [], nickname, onReply, onForward, onPin }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [pickerOpen, setPickerOpen] = useState(false);

  const isDeleted = message.body === "[deleted]";
  const multiUrls = !isDeleted && message.imageUrls
    ? (() => { try { return JSON.parse(message.imageUrls) as string[]; } catch { return null; } })()
    : null;
  const hasMultiImage = !!multiUrls && multiUrls.length > 0;
  const hasImage = !!message.imageUrl && !isDeleted && !hasMultiImage;
  const hasGame = !!message.game && !isDeleted;
  const hasAudio = !!message.audioUrl && !isDeleted;
  const hasFile  = !!message.fileUrl && !isDeleted;
  const hasPoll = !!message.poll && !isDeleted;
  const hasGameNight = !!message.gameNight && !isDeleted;
  const reactions = message.reactions ?? [];
  const linkPreviewUrl = !isDeleted && !hasGame && !hasImage && !hasMultiImage && !hasAudio && !hasFile && !hasPoll && !hasGameNight
    ? extractFirstUrl(message.body)
    : null;

  const toggleReaction = useMutation({
    mutationFn: (emoji: string) => api.post(`/api/messages/reactions/${message.id}`, { emoji }),
    onSuccess: (res) => {
      const freshReactions: MessageReaction[] = res.data.reactions;
      qc.setQueryData(
        ["messages", message.conversationId],
        (old: { messages: ChatMessage[]; otherUserLastReadAt: string | null } | undefined) => {
          if (!old) return old;
          return { ...old, messages: old.messages.map((m) => m.id === message.id ? { ...m, reactions: freshReactions } : m) };
        }
      );
    },
  });

  if (!user) return null;

  const ReactBtn = (
    <button
      onClick={(e) => { e.stopPropagation(); setPickerOpen((v) => !v); }}
      className={`p-1 rounded-lg transition-all shrink-0 mb-0.5 ${pickerOpen ? "text-violet-400 bg-violet-500/15 opacity-100" : "text-gray-600 hover:text-gray-400 hover:bg-white/8 opacity-0 group-hover:opacity-100"}`}
      title="React"
    >
      <Smile size={13} />
    </button>
  );

  const ReplyBtn = !isDeleted && onReply ? (
    <button onClick={() => onReply(message)} className="p-1 rounded-lg text-gray-600 hover:text-gray-400 hover:bg-white/8 opacity-0 group-hover:opacity-100 transition-all shrink-0 mb-0.5" title="Reply">
      <Reply size={13} />
    </button>
  ) : null;

  const ForwardBtn = !isDeleted && onForward ? (
    <button onClick={() => onForward(message)} className="p-1 rounded-lg text-gray-600 hover:text-gray-400 hover:bg-white/8 opacity-0 group-hover:opacity-100 transition-all shrink-0 mb-0.5" title="Forward">
      <Forward size={13} />
    </button>
  ) : null;

  const PinBtn = !isDeleted && onPin ? (
    <button onClick={() => onPin(message)} className="p-1 rounded-lg text-gray-600 hover:text-violet-400 hover:bg-white/8 opacity-0 group-hover:opacity-100 transition-all shrink-0 mb-0.5" title="Pin message">
      <Pin size={13} />
    </button>
  ) : null;

  if (isOwn) {
    return (
      <div className="group flex flex-col items-end gap-0.5 max-w-[75%] min-w-0">
        {message.isForwarded && (
          <span className="text-[10px] text-gray-500 flex items-center gap-1 mr-1">
            <Forward size={10} /> Forwarded
          </span>
        )}
        {message.replyTo && <ReplyQuote replyTo={message.replyTo} isOwn={true} />}

        <div className="relative flex items-end gap-2 min-w-0 w-full justify-end">
          <QuickReactionPicker isOwn={true} open={pickerOpen} onSelect={(e) => toggleReaction.mutate(e)} onClose={() => setPickerOpen(false)} />
          {PinBtn}{ForwardBtn}{ReplyBtn}{ReactBtn}

          <span className="text-[10px] text-gray-600 mb-0.5 shrink-0">{formatDistanceToNow(message.createdAt)}</span>

          {hasGameNight ? (
            <GameNightBubble gameNight={message.gameNight!} conversationId={message.conversationId} currentUserId={user.id} isOwn={true} />
          ) : hasPoll ? (
            <PollBubble poll={message.poll!} conversationId={message.conversationId} currentUserId={user.id} isOwn={true} />
          ) : hasGame ? (
            <GameCard game={message.game!} caption={message.body} isOwn={true} />
          ) : hasMultiImage ? (
            <ImageGrid urls={multiUrls!} caption={message.body} isOwn={true} />
          ) : hasImage ? (
            <ImageContent imageUrl={message.imageUrl!} caption={message.body} isOwn={true} />
          ) : hasAudio ? (
            <AudioBubble audioUrl={message.audioUrl!} duration={message.audioDuration} isOwn={true} />
          ) : hasFile ? (
            <FileBubble fileUrl={message.fileUrl!} fileName={message.fileName ?? "file"} fileSize={message.fileSize} fileType={message.fileType} isOwn={true} />
          ) : (
            <div className={`px-3.5 py-2 rounded-2xl rounded-br-sm text-sm leading-relaxed wrap-anywhere min-w-0 ${isDeleted ? "bg-white/8 text-gray-500 italic" : "bg-violet-600/90 text-white shadow-lg shadow-violet-900/30"}`}>
              {isDeleted ? message.body : renderTextWithLinks(message.body, true)}
            </div>
          )}
        </div>

        {linkPreviewUrl && <LinkPreviewCard url={linkPreviewUrl} isOwn={true} />}

        {reactions.length > 0 && (
          <ReactionPills reactions={reactions} currentUserId={user.id} isOwn={true} onToggle={(e) => toggleReaction.mutate(e)} />
        )}

        {seenBy.length > 0 && (
          <div className="flex items-center justify-end gap-0.5 mr-1 mt-1">
            {seenBy.slice(0, 5).map((u, i) => (
              <div
                key={u.id}
                className="w-3.5 h-3.5 rounded-full overflow-hidden border border-zinc-900 shrink-0 bg-violet-700 flex items-center justify-center"
                style={{ marginLeft: i === 0 ? 0 : -4 }}
                title={u.username}
              >
                {u.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={u.avatar} alt={u.username} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white font-bold uppercase leading-none select-none" style={{ fontSize: 6 }}>{u.username[0]}</span>
                )}
              </div>
            ))}
            {seenBy.length > 5 && <span className="text-[9px] text-gray-600 ml-0.5">+{seenBy.length - 5}</span>}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="group flex items-end gap-2 max-w-[75%] min-w-0">
      {showSender ? (
        <Avatar src={message.sender.avatar} username={message.sender.username} size="sm" />
      ) : (
        <div className="w-7 shrink-0" />
      )}

      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        {message.isForwarded && (
          <span className="text-[10px] text-gray-500 flex items-center gap-1 pl-1">
            <Forward size={10} /> Forwarded
          </span>
        )}
        {message.replyTo && <ReplyQuote replyTo={message.replyTo} isOwn={false} />}

        {showSender && (
          <span className="text-xs text-gray-500 pl-1 truncate">{nickname ?? message.sender.username}</span>
        )}

        <div className="relative flex items-end gap-2 min-w-0">
          <QuickReactionPicker isOwn={false} open={pickerOpen} onSelect={(e) => toggleReaction.mutate(e)} onClose={() => setPickerOpen(false)} />

          {hasGameNight ? (
            <GameNightBubble gameNight={message.gameNight!} conversationId={message.conversationId} currentUserId={user.id} isOwn={false} />
          ) : hasPoll ? (
            <PollBubble poll={message.poll!} conversationId={message.conversationId} currentUserId={user.id} isOwn={false} />
          ) : hasGame ? (
            <GameCard game={message.game!} caption={message.body} isOwn={false} />
          ) : hasMultiImage ? (
            <ImageGrid urls={multiUrls!} caption={message.body} isOwn={false} />
          ) : hasImage ? (
            <ImageContent imageUrl={message.imageUrl!} caption={message.body} isOwn={false} />
          ) : hasAudio ? (
            <AudioBubble audioUrl={message.audioUrl!} duration={message.audioDuration} isOwn={false} />
          ) : hasFile ? (
            <FileBubble fileUrl={message.fileUrl!} fileName={message.fileName ?? "file"} fileSize={message.fileSize} fileType={message.fileType} isOwn={false} />
          ) : (
            <div className={`px-3.5 py-2 rounded-2xl rounded-bl-sm text-sm leading-relaxed wrap-anywhere min-w-0 ${isDeleted ? "bg-white/5 text-gray-500 italic" : "bg-white/10 backdrop-blur-sm text-white"}`}>
              {isDeleted ? message.body : renderTextWithLinks(message.body, false)}
            </div>
          )}

          <span className="text-[10px] text-gray-600 mb-0.5 shrink-0">{formatDistanceToNow(message.createdAt)}</span>
          {ReactBtn}{ReplyBtn}{ForwardBtn}{PinBtn}
        </div>

        {linkPreviewUrl && <LinkPreviewCard url={linkPreviewUrl} isOwn={false} />}

        {reactions.length > 0 && (
          <ReactionPills reactions={reactions} currentUserId={user.id} isOwn={false} onToggle={(e) => toggleReaction.mutate(e)} />
        )}
      </div>
    </div>
  );
}
