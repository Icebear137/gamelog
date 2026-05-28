"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { X, Reply, Smile, Gamepad2, Forward, Play, Pause, Pin } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ChatMessage, MessageReaction } from "@/lib/types";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatDistanceToNow, extractFirstUrl } from "@/lib/utils";
import Avatar from "./Avatar";

interface SeenUser {
  id: string;
  username: string;
  avatar?: string | null;
}

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

const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

// ── Lightbox (supports multiple images with prev/next) ──────────────────────
function Lightbox({
  urls,
  initialIdx = 0,
  onClose,
}: {
  urls: string[];
  initialIdx?: number;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(initialIdx);
  const hasPrev = idx > 0;
  const hasNext = idx < urls.length - 1;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && hasPrev) setIdx((i) => i - 1);
      if (e.key === "ArrowRight" && hasNext) setIdx((i) => i + 1);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [hasPrev, hasNext, onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-999 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Close */}
      <button
        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
        onClick={onClose}
      >
        <X size={18} />
      </button>

      {/* Counter */}
      {urls.length > 1 && (
        <span className="absolute top-4 left-1/2 -translate-x-1/2 text-xs text-gray-400 bg-black/50 px-3 py-1 rounded-full">
          {idx + 1} / {urls.length}
        </span>
      )}

      {/* Prev */}
      {hasPrev && (
        <button
          className="absolute left-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
          onClick={(e) => { e.stopPropagation(); setIdx((i) => i - 1); }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      )}

      {/* Next */}
      {hasNext && (
        <button
          className="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
          onClick={(e) => { e.stopPropagation(); setIdx((i) => i + 1); }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      )}

      {/* Image */}
      <div className="relative max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={urls[idx]}
          alt={`Image ${idx + 1}`}
          className="max-w-[90vw] max-h-[90vh] rounded-xl object-contain shadow-2xl"
        />
      </div>
    </div>,
    document.body
  );
}

// ── Single image bubble ─────────────────────────────────────────────────────
function ImageContent({ imageUrl, caption, isOwn }: { imageUrl: string; caption: string; isOwn: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div
        className={`rounded-2xl overflow-hidden cursor-pointer group/img max-w-60 ${isOwn ? "rounded-br-sm" : "rounded-bl-sm"}`}
        onClick={() => setOpen(true)}
      >
        <div className="relative">
          <Image
            src={imageUrl}
            alt="Shared image"
            width={240}
            height={240}
            style={{ width: "100%", height: "auto" }}
            className="object-contain group-hover/img:brightness-90 transition-all duration-200"
            sizes="240px"
          />
          <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/10 transition-colors" />
        </div>
        {caption && caption !== "[deleted]" && (
          <div className={`px-3 py-1.5 text-sm ${isOwn ? "bg-violet-600/90 text-white" : "bg-white/10 text-white"}`}>
            {caption}
          </div>
        )}
      </div>
      {open && <Lightbox urls={[imageUrl]} onClose={() => setOpen(false)} />}
    </>
  );
}

// ── Multi-image grid ────────────────────────────────────────────────────────
function ImageGrid({ urls, caption, isOwn }: { urls: string[]; caption: string; isOwn: boolean }) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const count = urls.length;
  const visible = urls.slice(0, 4);
  const extra = Math.max(0, count - 4);

  // Grid tile helper
  const Tile = ({ url, idx, spanFull = false }: { url: string; idx: number; spanFull?: boolean }) => (
    <div
      className={`relative overflow-hidden cursor-pointer group/tile ${spanFull ? "col-span-2 aspect-video" : "aspect-square"}`}
      onClick={() => setLightboxIdx(idx)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" className="w-full h-full object-cover group-hover/tile:brightness-90 transition-all duration-200" />
      {/* "+N more" overlay on last tile */}
      {extra > 0 && idx === 3 && (
        <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
          <span className="text-white font-bold text-xl">+{extra}</span>
        </div>
      )}
    </div>
  );

  return (
    <>
      <div className={`rounded-2xl overflow-hidden max-w-60 ${isOwn ? "rounded-br-sm" : "rounded-bl-sm"}`}>
        {/* Grid layouts */}
        {count === 1 && (
          <Tile url={visible[0]} idx={0} spanFull />
        )}
        {count === 2 && (
          <div className="grid grid-cols-2 gap-0.5">
            <Tile url={visible[0]} idx={0} />
            <Tile url={visible[1]} idx={1} />
          </div>
        )}
        {count === 3 && (
          <div className="grid grid-cols-2 gap-0.5">
            <Tile url={visible[0]} idx={0} spanFull />
            <Tile url={visible[1]} idx={1} />
            <Tile url={visible[2]} idx={2} />
          </div>
        )}
        {count >= 4 && (
          <div className="grid grid-cols-2 gap-0.5">
            {visible.map((url, i) => <Tile key={i} url={url} idx={i} />)}
          </div>
        )}
        {/* Caption */}
        {caption && caption !== "[deleted]" && (
          <div className={`px-3 py-1.5 text-sm ${isOwn ? "bg-violet-600/90 text-white" : "bg-white/10 text-white"}`}>
            {caption}
          </div>
        )}
      </div>

      {lightboxIdx !== null && (
        <Lightbox
          urls={urls}
          initialIdx={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
        />
      )}
    </>
  );
}

// ── Reply quote ─────────────────────────────────────────────────────────────
function ReplyQuote({ replyTo, isOwn }: { replyTo: NonNullable<ChatMessage["replyTo"]>; isOwn: boolean }) {
  const isDeleted = replyTo.body === "[deleted]";
  const multiCount = (() => {
    if (!replyTo.imageUrls) return 0;
    try { return (JSON.parse(replyTo.imageUrls) as string[]).length; } catch { return 0; }
  })();
  const preview = isDeleted
    ? "Message deleted"
    : multiCount > 1
    ? `📷 ${multiCount} photos${replyTo.body ? ` — ${replyTo.body}` : ""}`
    : replyTo.imageUrl && !replyTo.body
    ? "📷 Photo"
    : replyTo.imageUrl
    ? `📷 ${replyTo.body}`
    : replyTo.body;

  return (
    <div className={`flex items-stretch rounded-xl overflow-hidden mb-1 max-w-full ${isOwn ? "self-end" : "self-start"}`}>
      <div className={`w-0.5 shrink-0 ${isOwn ? "bg-violet-300/60" : "bg-violet-400/60"}`} />
      <div className={`px-3 py-1.5 text-xs min-w-0 ${isOwn ? "bg-violet-800/40 text-violet-200" : "bg-white/8 text-gray-300"}`}>
        <p className={`font-semibold mb-0.5 truncate ${isOwn ? "text-violet-300" : "text-violet-400"}`}>
          {replyTo.sender.username}
        </p>
        <p className={`truncate ${isDeleted ? "italic text-gray-500" : ""}`}>{preview}</p>
      </div>
    </div>
  );
}

// ── Audio bubble (voice message) ────────────────────────────────────────────
function AudioBubble({ audioUrl, duration, isOwn }: { audioUrl: string; duration?: number | null; isOwn: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration ?? 0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    function onTimeUpdate() { setCurrentTime(audio!.currentTime); }
    function onDurationChange() {
      if (isFinite(audio!.duration)) setTotalDuration(audio!.duration);
    }
    function onEnded() { setPlaying(false); setCurrentTime(0); }
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("durationchange", onDurationChange);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("durationchange", onDurationChange);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); setPlaying(false); }
    else { audio.play(); setPlaying(true); }
  }

  function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
    const audio = audioRef.current;
    if (!audio) return;
    const t = parseFloat(e.target.value);
    audio.currentTime = t;
    setCurrentTime(t);
  }

  const displayDuration = totalDuration > 0 ? totalDuration : (duration ?? 0);
  const progress = displayDuration > 0 ? currentTime / displayDuration : 0;

  function fmt(s: number) {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  return (
    <div
      className={`flex items-center gap-2.5 rounded-2xl px-3 py-2.5 max-w-55 ${
        isOwn
          ? "bg-violet-600/90 text-white rounded-br-sm"
          : "bg-white/10 backdrop-blur-sm text-white rounded-bl-sm"
      }`}
    >
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      <button
        onClick={togglePlay}
        className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
          isOwn ? "bg-white/20 hover:bg-white/30" : "bg-white/15 hover:bg-white/25"
        }`}
      >
        {playing ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
      </button>

      <div className="flex flex-col gap-1 flex-1 min-w-0">
        {/* Waveform-style progress bar */}
        <input
          type="range"
          min={0}
          max={displayDuration || 1}
          step={0.1}
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-1 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, ${isOwn ? "rgba(255,255,255,0.9)" : "rgb(139,92,246)"} ${progress * 100}%, ${isOwn ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.15)"} ${progress * 100}%)`,
          }}
        />
        <span className={`text-[10px] tabular-nums ${isOwn ? "text-violet-200" : "text-gray-400"}`}>
          {playing || currentTime > 0 ? fmt(currentTime) : fmt(displayDuration)}
        </span>
      </div>
    </div>
  );
}

// ── Game card ───────────────────────────────────────────────────────────────
function GameCard({
  game,
  caption,
  isOwn,
}: {
  game: NonNullable<ChatMessage["game"]>;
  caption: string;
  isOwn: boolean;
}) {
  const router = useRouter();
  return (
    <div
      className={`rounded-2xl overflow-hidden border max-w-55 cursor-pointer group/card ${
        isOwn
          ? "border-violet-500/30 bg-violet-900/20 rounded-br-sm"
          : "border-white/10 bg-white/5 rounded-bl-sm"
      }`}
      onClick={() => router.push(`/game/${game.rawgId}`)}
    >
      {/* Cover */}
      {game.coverImage ? (
        <div className="relative h-28 w-full overflow-hidden">
          <Image
            src={game.coverImage}
            alt={game.name}
            fill
            className="object-cover group-hover/card:brightness-90 transition-all duration-200"
            sizes="220px"
          />
          <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />
        </div>
      ) : (
        <div className="h-20 bg-white/5 flex items-center justify-center">
          <Gamepad2 size={28} className="text-gray-600" />
        </div>
      )}

      {/* Info */}
      <div className="px-3 py-2.5">
        <p className="text-[10px] text-violet-400 font-semibold uppercase tracking-wide mb-1">
          🎮 Game
        </p>
        <p className="text-sm font-bold text-white leading-tight line-clamp-2">{game.name}</p>
        {game.releaseYear && (
          <p className="text-xs text-gray-500 mt-0.5">{game.releaseYear}</p>
        )}
        {caption && caption !== "[deleted]" && (
          <p className="text-xs text-gray-300 mt-1.5 leading-relaxed wrap-anywhere">{caption}</p>
        )}
        <p className={`text-xs font-medium mt-2 transition-colors ${isOwn ? "text-violet-300 group-hover/card:text-violet-200" : "text-violet-400 group-hover/card:text-violet-300"}`}>
          View game →
        </p>
      </div>
    </div>
  );
}

// ── Quick reaction picker (click-triggered, stays open) ─────────────────────
function QuickReactionPicker({
  isOwn,
  open,
  onSelect,
  onClose,
}: {
  isOwn: boolean;
  open: boolean;
  onSelect: (emoji: string) => void;
  onClose: () => void;
}) {
  // Close on any click outside
  useEffect(() => {
    if (!open) return;
    const close = () => onClose();
    const id = setTimeout(() => document.addEventListener("click", close), 0);
    return () => { clearTimeout(id); document.removeEventListener("click", close); };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={`absolute bottom-full mb-1 flex items-center gap-0.5 bg-zinc-900/98 backdrop-blur-sm border border-white/10 rounded-full px-2 py-1 shadow-2xl z-30 ${
        isOwn ? "right-0" : "left-0"
      }`}
      onClick={(e) => e.stopPropagation()} // prevent the outside-click listener from firing
    >
      {QUICK_EMOJIS.map((e) => (
        <button
          key={e}
          onClick={() => { onSelect(e); onClose(); }}
          className="text-base leading-none hover:scale-125 active:scale-110 transition-transform w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10"
        >
          {e}
        </button>
      ))}
    </div>
  );
}

// ── Reaction pills ──────────────────────────────────────────────────────────
function ReactionPills({
  reactions,
  currentUserId,
  isOwn,
  onToggle,
}: {
  reactions: MessageReaction[];
  currentUserId: string;
  isOwn: boolean;
  onToggle: (emoji: string) => void;
}) {
  const groups: Record<string, { count: number; byMe: boolean }> = {};
  for (const r of reactions) {
    if (!groups[r.emoji]) groups[r.emoji] = { count: 0, byMe: false };
    groups[r.emoji].count++;
    if (r.userId === currentUserId) groups[r.emoji].byMe = true;
  }
  const entries = Object.entries(groups);
  if (entries.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-1 mt-1 ${isOwn ? "justify-end" : "justify-start"}`}>
      {entries.map(([emoji, { count, byMe }]) => (
        <button
          key={emoji}
          onClick={() => onToggle(emoji)}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors ${
            byMe
              ? "bg-violet-500/25 border-violet-400/50 text-white"
              : "bg-white/8 border-white/10 text-gray-300 hover:bg-white/15"
          }`}
        >
          <span>{emoji}</span>
          <span className="font-semibold tabular-nums">{count}</span>
        </button>
      ))}
    </div>
  );
}

// ── Render text with clickable URLs ────────────────────────────────────────
function renderTextWithLinks(text: string, isOwn: boolean): React.ReactNode {
  const urlRegex = /https?:\/\/[^\s]+/g;
  const segments: React.ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = urlRegex.exec(text)) !== null) {
    // Trim trailing punctuation unlikely to be part of the URL
    const url = match[0].replace(/[.,!?)'"]+$/, "");
    if (match.index > cursor) segments.push(text.slice(cursor, match.index));
    segments.push(
      <a
        key={match.index}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className={`underline underline-offset-2 hover:opacity-80 transition-opacity break-all ${
          isOwn ? "text-violet-200" : "text-blue-300"
        }`}
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

// ── Link preview card ───────────────────────────────────────────────────────
interface LinkPreviewData {
  url: string;
  title: string;
  description: string | null;
  image: string | null;
  siteName: string;
}

function LinkPreviewCard({ url, isOwn }: { url: string; isOwn: boolean }) {
  const { data, isLoading, isError } = useQuery<LinkPreviewData>({
    queryKey: ["link-preview", url],
    queryFn: () =>
      api.get(`/api/messages/link-preview?url=${encodeURIComponent(url)}`, {
        silentOnError: true,
      } as any).then((r) => r.data),
    staleTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return (
      <div className={`mt-1.5 rounded-2xl overflow-hidden border max-w-60 animate-pulse ${
        isOwn
          ? "border-violet-500/20 bg-violet-900/10 rounded-br-sm"
          : "border-white/8 bg-white/4 rounded-bl-sm"
      }`}>
        <div className="h-24 bg-white/5" />
        <div className="px-3 py-2.5 space-y-1.5">
          <div className="h-3 bg-white/10 rounded w-4/5" />
          <div className="h-2.5 bg-white/8 rounded w-full" />
          <div className="h-2 bg-white/6 rounded w-2/5 mt-2" />
        </div>
      </div>
    );
  }

  if (isError || !data?.title) return null;

  return (
    <a
      href={data.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={`mt-1.5 block rounded-2xl overflow-hidden border max-w-60 group/link transition-opacity hover:opacity-90 ${
        isOwn
          ? "border-violet-500/30 bg-violet-900/20 rounded-br-sm"
          : "border-white/10 bg-white/5 rounded-bl-sm"
      }`}
    >
      {data.image && (
        <div className="relative h-28 w-full overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={data.image}
            alt=""
            className="w-full h-full object-cover group-hover/link:brightness-90 transition-all duration-200"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        </div>
      )}
      <div className="px-3 py-2.5">
        <p className="text-xs font-bold text-white leading-snug line-clamp-2">{data.title}</p>
        {data.description && (
          <p className="text-[11px] text-gray-400 mt-1 line-clamp-2 leading-relaxed">{data.description}</p>
        )}
        <p className="text-[10px] text-violet-400 font-medium mt-1.5">🔗 {data.siteName}</p>
      </div>
    </a>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
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
  const reactions = message.reactions ?? [];
  // Only show link preview for plain text messages (not deleted/game/image/audio)
  const linkPreviewUrl = !isDeleted && !hasGame && !hasImage && !hasMultiImage && !hasAudio
    ? extractFirstUrl(message.body)
    : null;

  const toggleReaction = useMutation({
    mutationFn: (emoji: string) =>
      api.post(`/api/messages/reactions/${message.id}`, { emoji }),
    onSuccess: (res) => {
      const freshReactions: MessageReaction[] = res.data.reactions;
      qc.setQueryData(
        ["messages", message.conversationId],
        (old: { messages: ChatMessage[]; otherUserLastReadAt: string | null } | undefined) => {
          if (!old) return old;
          return {
            ...old,
            messages: old.messages.map((m) =>
              m.id === message.id ? { ...m, reactions: freshReactions } : m
            ),
          };
        }
      );
    },
  });

  if (!user) return null;

  // ── Shared action buttons ──────────────────────────────────────────────────
  // React button — click opens/closes the quick picker
  const ReactBtn = (
    <button
      onClick={(e) => { e.stopPropagation(); setPickerOpen((v) => !v); }}
      className={`p-1 rounded-lg transition-all shrink-0 mb-0.5 ${
        pickerOpen
          ? "text-violet-400 bg-violet-500/15 opacity-100"
          : "text-gray-600 hover:text-gray-400 hover:bg-white/8 opacity-0 group-hover:opacity-100"
      }`}
      title="React"
    >
      <Smile size={13} />
    </button>
  );

  const ReplyBtn = !isDeleted && onReply ? (
    <button
      onClick={() => onReply(message)}
      className="p-1 rounded-lg text-gray-600 hover:text-gray-400 hover:bg-white/8 opacity-0 group-hover:opacity-100 transition-all shrink-0 mb-0.5"
      title="Reply"
    >
      <Reply size={13} />
    </button>
  ) : null;

  const ForwardBtn = !isDeleted && onForward ? (
    <button
      onClick={() => onForward(message)}
      className="p-1 rounded-lg text-gray-600 hover:text-gray-400 hover:bg-white/8 opacity-0 group-hover:opacity-100 transition-all shrink-0 mb-0.5"
      title="Forward"
    >
      <Forward size={13} />
    </button>
  ) : null;

  const PinBtn = !isDeleted && onPin ? (
    <button
      onClick={() => onPin(message)}
      className="p-1 rounded-lg text-gray-600 hover:text-violet-400 hover:bg-white/8 opacity-0 group-hover:opacity-100 transition-all shrink-0 mb-0.5"
      title="Pin message"
    >
      <Pin size={13} />
    </button>
  ) : null;

  // ── Own message ────────────────────────────────────────────────────────────
  if (isOwn) {
    return (
      <div className="group flex flex-col items-end gap-0.5 max-w-[75%] min-w-0">
        {message.isForwarded && (
          <span className="text-[10px] text-gray-500 flex items-center gap-1 mr-1">
            <Forward size={10} />
            Forwarded
          </span>
        )}
        {message.replyTo && <ReplyQuote replyTo={message.replyTo} isOwn={true} />}

        <div className="relative flex items-end gap-2 min-w-0 w-full justify-end">
          <QuickReactionPicker
            isOwn={true}
            open={pickerOpen}
            onSelect={(e) => toggleReaction.mutate(e)}
            onClose={() => setPickerOpen(false)}
          />

          {PinBtn}
          {ForwardBtn}
          {ReplyBtn}
          {ReactBtn}

          <span className="text-[10px] text-gray-600 mb-0.5 shrink-0">
            {formatDistanceToNow(message.createdAt)}
          </span>

          {hasGame ? (
            <GameCard game={message.game!} caption={message.body} isOwn={true} />
          ) : hasMultiImage ? (
            <ImageGrid urls={multiUrls!} caption={message.body} isOwn={true} />
          ) : hasImage ? (
            <ImageContent imageUrl={message.imageUrl!} caption={message.body} isOwn={true} />
          ) : hasAudio ? (
            <AudioBubble audioUrl={message.audioUrl!} duration={message.audioDuration} isOwn={true} />
          ) : (
            <div
              className={`px-3.5 py-2 rounded-2xl rounded-br-sm text-sm leading-relaxed wrap-anywhere min-w-0 ${
                isDeleted
                  ? "bg-white/8 text-gray-500 italic"
                  : "bg-violet-600/90 text-white shadow-lg shadow-violet-900/30"
              }`}
            >
              {isDeleted ? message.body : renderTextWithLinks(message.body, true)}
            </div>
          )}
        </div>

        {linkPreviewUrl && <LinkPreviewCard url={linkPreviewUrl} isOwn={true} />}

        {reactions.length > 0 && (
          <ReactionPills
            reactions={reactions}
            currentUserId={user.id}
            isOwn={true}
            onToggle={(e) => toggleReaction.mutate(e)}
          />
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
            {seenBy.length > 5 && (
              <span className="text-[9px] text-gray-600 ml-0.5">+{seenBy.length - 5}</span>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Other user's message ──────────────────────────────────────────────────
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
            <Forward size={10} />
            Forwarded
          </span>
        )}
        {message.replyTo && <ReplyQuote replyTo={message.replyTo} isOwn={false} />}

        {showSender && (
          <span className="text-xs text-gray-500 pl-1 truncate">
            {nickname ?? message.sender.username}
          </span>
        )}

        <div className="relative flex items-end gap-2 min-w-0">
          <QuickReactionPicker
            isOwn={false}
            open={pickerOpen}
            onSelect={(e) => toggleReaction.mutate(e)}
            onClose={() => setPickerOpen(false)}
          />

          {hasGame ? (
            <GameCard game={message.game!} caption={message.body} isOwn={false} />
          ) : hasMultiImage ? (
            <ImageGrid urls={multiUrls!} caption={message.body} isOwn={false} />
          ) : hasImage ? (
            <ImageContent imageUrl={message.imageUrl!} caption={message.body} isOwn={false} />
          ) : hasAudio ? (
            <AudioBubble audioUrl={message.audioUrl!} duration={message.audioDuration} isOwn={false} />
          ) : (
            <div
              className={`px-3.5 py-2 rounded-2xl rounded-bl-sm text-sm leading-relaxed wrap-anywhere min-w-0 ${
                isDeleted
                  ? "bg-white/5 text-gray-500 italic"
                  : "bg-white/10 backdrop-blur-sm text-white"
              }`}
            >
              {isDeleted ? message.body : renderTextWithLinks(message.body, false)}
            </div>
          )}

          <span className="text-[10px] text-gray-600 mb-0.5 shrink-0">
            {formatDistanceToNow(message.createdAt)}
          </span>

          {ReactBtn}
          {ReplyBtn}
          {ForwardBtn}
          {PinBtn}
        </div>

        {linkPreviewUrl && <LinkPreviewCard url={linkPreviewUrl} isOwn={false} />}

        {reactions.length > 0 && (
          <ReactionPills
            reactions={reactions}
            currentUserId={user.id}
            isOwn={false}
            onToggle={(e) => toggleReaction.mutate(e)}
          />
        )}
      </div>
    </div>
  );
}
