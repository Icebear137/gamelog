"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { Send, Smile, ImageIcon, X, Gamepad2, Loader2, Search, Plus, Mic, Square } from "lucide-react";
import dynamic from "next/dynamic";
import data from "@emoji-mart/data";
import Image from "next/image";
import { api } from "@/lib/api";
import { ChatMessageGame } from "@/lib/types";

const Picker = dynamic(() => import("@emoji-mart/react"), { ssr: false });

const MAX_IMAGES = 10;

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  /** Called with an array of files (1–10) + optional caption */
  onSubmitImages?: (files: File[], caption: string) => void;
  onSubmitGame?: (gameId: string, caption: string) => void;
  /** Called with the recorded audio blob + duration in seconds */
  onSubmitAudio?: (blob: Blob, duration: number) => void;
  onTyping?: () => void;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
}

// ── Game search picker ───────────────────────────────────────────────────────
function GamePicker({ onSelect, onClose }: {
  onSelect: (game: ChatMessageGame) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ChatMessageGame[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    const q = query.trim();
    if (!q) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const { data: games } = await api.get<ChatMessageGame[]>(
          `/api/messages/games?q=${encodeURIComponent(q)}`
        );
        setResults(games);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 bg-zinc-950 border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-50">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/8">
        <Search size={14} className="text-gray-500 shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search games in library…"
          className="flex-1 bg-transparent text-sm text-white outline-none placeholder-gray-600"
        />
        {loading && <Loader2 size={13} className="animate-spin text-gray-500 shrink-0" />}
        <button onClick={onClose} className="p-0.5 text-gray-500 hover:text-gray-300 transition-colors shrink-0">
          <X size={14} />
        </button>
      </div>
      <div className="max-h-56 overflow-y-auto">
        {!query.trim() && <p className="py-8 text-center text-xs text-gray-600">Type a game name to search</p>}
        {query.trim() && !loading && results.length === 0 && <p className="py-8 text-center text-xs text-gray-600">No games found in library</p>}
        {results.map((game) => (
          <button key={game.id} onClick={() => onSelect(game)} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition-colors text-left">
            {game.coverImage ? (
              <div className="relative w-9 h-12 rounded-lg overflow-hidden shrink-0">
                <Image src={game.coverImage} alt={game.name} fill className="object-cover" sizes="36px" />
              </div>
            ) : (
              <div className="w-9 h-12 bg-white/8 rounded-lg shrink-0 flex items-center justify-center">
                <Gamepad2 size={16} className="text-gray-600" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{game.name}</p>
              {game.releaseYear && <p className="text-xs text-gray-500 mt-0.5">{game.releaseYear}</p>}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ChatInput({
  value,
  onChange,
  onSubmit,
  onSubmitImages,
  onSubmitGame,
  onSubmitAudio,
  onTyping,
  disabled = false,
  placeholder = "Type a message…",
  maxLength = 2000,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pickerContainerRef = useRef<HTMLDivElement>(null);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [gamePickerOpen, setGamePickerOpen] = useState(false);
  // Multi-image: array of {file, preview}
  const [images, setImages] = useState<{ file: File; preview: string }[]>([]);
  const [selectedGame, setSelectedGame] = useState<ChatMessageGame | null>(null);

  // Voice recording state
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingStartRef = useRef<number>(0);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 96)}px`;
  }, [value]);

  // Revoke all object URLs on unmount
  useEffect(() => {
    return () => { images.forEach((img) => URL.revokeObjectURL(img.preview)); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close emoji picker on outside click
  useEffect(() => {
    if (!pickerOpen) return;
    function handle(e: MouseEvent) {
      if (pickerContainerRef.current && !pickerContainerRef.current.contains(e.target as Node))
        setPickerOpen(false);
    }
    const id = setTimeout(() => document.addEventListener("mousedown", handle), 0);
    return () => { clearTimeout(id); document.removeEventListener("mousedown", handle); };
  }, [pickerOpen]);

  const insertEmoji = useCallback((emoji: string) => {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    onChange(value.slice(0, start) + emoji + value.slice(end));
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      el.setSelectionRange(start + emoji.length, start + emoji.length);
    });
    setPickerOpen(false);
  }, [value, onChange]);

  function addFiles(newFiles: File[]) {
    const available = MAX_IMAGES - images.length;
    if (available <= 0) return;
    const toAdd = newFiles.slice(0, available);
    const newEntries = toAdd.map((f) => ({ file: f, preview: URL.createObjectURL(f) }));
    setImages((prev) => [...prev, ...newEntries]);
  }

  function removeImage(idx: number) {
    setImages((prev) => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length) addFiles(files);
    e.target.value = "";
  }

  function handleSend() {
    if (disabled) return;
    if (selectedGame && onSubmitGame) {
      onSubmitGame(selectedGame.id, value.trim());
      onChange("");
      setSelectedGame(null);
    } else if (images.length > 0 && onSubmitImages) {
      onSubmitImages(images.map((i) => i.file), value.trim());
      onChange("");
      images.forEach((i) => URL.revokeObjectURL(i.preview));
      setImages([]);
    } else if (value.trim()) {
      onSubmit();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
    if (e.key === "Escape") { setPickerOpen(false); setGamePickerOpen(false); }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const items = e.clipboardData.items;
    const imageFiles: File[] = [];
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        const f = item.getAsFile();
        if (f) imageFiles.push(f);
      }
    }
    if (imageFiles.length > 0) {
      e.preventDefault();
      addFiles(imageFiles);
    }
  }

  async function startRecording() {
    if (disabled || recording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Pick a supported MIME type
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/ogg;codecs=opus";
      const mr = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const duration = Math.round((Date.now() - recordingStartRef.current) / 1000);
        const blob = new Blob(chunksRef.current, { type: mimeType });
        if (blob.size > 0 && onSubmitAudio) onSubmitAudio(blob, Math.max(1, duration));
      };
      mr.start(250); // collect chunks every 250ms
      mediaRecorderRef.current = mr;
      recordingStartRef.current = Date.now();
      setRecordingSeconds(0);
      setRecording(true);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(Math.round((Date.now() - recordingStartRef.current) / 1000));
      }, 500);
    } catch {
      // Microphone permission denied or not available — silently ignore
    }
  }

  function stopRecording(send = true) {
    if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== "inactive") {
      if (!send) {
        // Cancel: clear onstop handler so the blob is discarded
        mr.onstop = () => { mr.stream?.getTracks().forEach((t) => t.stop()); };
      }
      mr.stop();
    }
    mediaRecorderRef.current = null;
    setRecording(false);
    setRecordingSeconds(0);
  }

  // Clean up on unmount
  useEffect(() => {
    return () => { stopRecording(false); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function fmtRecording(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  const canSend = !disabled && (!!selectedGame || images.length > 0 || !!value.trim());
  const remaining = maxLength - value.length;
  const nearLimit = remaining <= 200;
  const activePlaceholder = selectedGame
    ? "Add a comment… (optional)"
    : images.length > 0
    ? "Add a caption… (optional)"
    : placeholder;

  return (
    <div className="relative">
      {/* ── Emoji Picker ─────────────────────────────────── */}
      {pickerOpen && (
        <div ref={pickerContainerRef} className="absolute bottom-full right-0 mb-2 z-50 drop-shadow-2xl">
          <Picker
            data={data}
            onEmojiSelect={(e: { native: string }) => insertEmoji(e.native)}
            theme="dark"
            previewPosition="none"
            skinTonePosition="none"
            maxFrequentRows={1}
            perLine={8}
          />
        </div>
      )}

      {/* ── Game Picker ───────────────────────────────────── */}
      {gamePickerOpen && (
        <GamePicker
          onSelect={(game) => { setSelectedGame(game); setGamePickerOpen(false); }}
          onClose={() => setGamePickerOpen(false)}
        />
      )}

      {/* ── Selected game preview ────────────────────────── */}
      {selectedGame && (
        <div className="mb-2 flex items-center gap-2.5 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
          {selectedGame.coverImage ? (
            <div className="relative w-9 h-12 rounded-lg overflow-hidden shrink-0">
              <Image src={selectedGame.coverImage} alt={selectedGame.name} fill className="object-cover" sizes="36px" />
            </div>
          ) : (
            <div className="w-9 h-12 bg-white/8 rounded-lg shrink-0 flex items-center justify-center">
              <Gamepad2 size={16} className="text-gray-600" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-violet-400 font-semibold uppercase tracking-wide">🎮 Sharing game</p>
            <p className="text-sm font-medium text-white truncate mt-0.5">{selectedGame.name}</p>
          </div>
          <button type="button" onClick={() => setSelectedGame(null)} className="p-1 text-gray-500 hover:text-gray-300 transition-colors shrink-0">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Multi-image preview row ───────────────────────── */}
      {images.length > 0 && (
        <div className="mb-2 flex items-start gap-2 flex-wrap">
          {images.map((img, idx) => (
            <div key={idx} className="relative shrink-0">
              <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-white/15">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.preview} alt="" className="w-full h-full object-cover" />
              </div>
              <button
                type="button"
                onClick={() => removeImage(idx)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gray-700 hover:bg-gray-600 border border-white/20 flex items-center justify-center text-white transition-colors"
              >
                <X size={10} />
              </button>
            </div>
          ))}
          {/* Add more button */}
          {images.length < MAX_IMAGES && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-16 h-16 rounded-xl border border-dashed border-white/20 flex items-center justify-center text-gray-500 hover:text-gray-300 hover:border-white/40 transition-colors shrink-0"
              title="Add more images"
            >
              <Plus size={18} />
            </button>
          )}
          {/* Count label */}
          <div className="flex items-end pb-0.5">
            <span className="text-xs text-gray-600">{images.length}/{MAX_IMAGES}</span>
          </div>
        </div>
      )}

      {/* ── Input row ────────────────────────────────────── */}
      <div className="flex items-end gap-2 bg-white/5 backdrop-blur-sm border border-white/8 rounded-2xl px-3 py-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileInput}
        />

        {recording ? (
          /* ── Recording indicator ─────────────────────── */
          <div className="flex-1 flex items-center gap-2.5 py-0.5">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
            <span className="text-sm font-mono text-red-400 tabular-nums">{fmtRecording(recordingSeconds)}</span>
            <span className="text-xs text-gray-500">Recording…</span>
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            rows={1}
            value={value}
            onChange={(e) => { onChange(e.target.value); onTyping?.(); }}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            disabled={disabled}
            maxLength={maxLength}
            placeholder={activePlaceholder}
            className="flex-1 bg-transparent text-white text-sm resize-none outline-none placeholder-gray-600 leading-relaxed"
            style={{ minHeight: "24px" }}
          />
        )}

        <div className="flex items-center gap-1.5 shrink-0 mb-0.5">
          {!recording && nearLimit && images.length === 0 && !selectedGame && (
            <span className={`text-[10px] ${remaining <= 50 ? "text-red-400" : "text-gray-500"}`}>
              {remaining}
            </span>
          )}

          {recording ? (
            <>
              {/* Cancel recording */}
              <button
                type="button"
                onClick={() => stopRecording(false)}
                className="p-1.5 rounded-xl text-gray-500 hover:text-gray-300 hover:bg-white/8 transition-colors"
                title="Cancel recording"
              >
                <X size={15} />
              </button>
              {/* Send recording */}
              <button
                type="button"
                onClick={() => stopRecording(true)}
                className="p-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white transition-colors"
                title="Send voice message"
              >
                <Square size={13} />
              </button>
            </>
          ) : (
            <>
              {/* Game share button */}
              <button
                type="button"
                onClick={() => { setGamePickerOpen((v) => !v); setPickerOpen(false); }}
                className={`p-1.5 rounded-xl transition-colors ${
                  gamePickerOpen || selectedGame
                    ? "text-violet-400 bg-violet-500/15"
                    : "text-gray-500 hover:text-gray-300 hover:bg-white/8"
                }`}
                title="Share a game"
              >
                <Gamepad2 size={15} />
              </button>

              {/* Image button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`p-1.5 rounded-xl transition-colors ${
                  images.length > 0
                    ? "text-violet-400 bg-violet-500/15"
                    : "text-gray-500 hover:text-gray-300 hover:bg-white/8"
                }`}
                title={images.length > 0 ? `${images.length} image${images.length > 1 ? "s" : ""} selected` : "Send images"}
              >
                <ImageIcon size={15} />
              </button>

              {/* Emoji button */}
              <button
                type="button"
                onClick={() => { setPickerOpen((v) => !v); setGamePickerOpen(false); }}
                className={`p-1.5 rounded-xl transition-colors ${
                  pickerOpen ? "text-violet-400 bg-violet-500/15" : "text-gray-500 hover:text-gray-300 hover:bg-white/8"
                }`}
                title="Emoji"
              >
                <Smile size={15} />
              </button>

              {/* Mic button (only when text/images/game not active) */}
              {onSubmitAudio && !value.trim() && images.length === 0 && !selectedGame && (
                <button
                  type="button"
                  onClick={startRecording}
                  disabled={disabled}
                  className="p-1.5 rounded-xl text-gray-500 hover:text-gray-300 hover:bg-white/8 disabled:opacity-40 transition-colors"
                  title="Send a voice message"
                >
                  <Mic size={15} />
                </button>
              )}

              {/* Send button */}
              <button
                type="button"
                onClick={handleSend}
                disabled={!canSend}
                className="p-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
              >
                <Send size={14} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
