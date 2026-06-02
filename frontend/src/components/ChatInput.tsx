"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { Send, Smile, ImageIcon, X, Gamepad2, Loader2, Plus, Mic, Square, BarChart2, CalendarDays, Paperclip } from "lucide-react";
import { useDropzone } from "react-dropzone";
import dynamic from "next/dynamic";
import data from "@emoji-mart/data";
import Image from "next/image";
import { api } from "@/lib/api";
import { ChatMessageGame } from "@/lib/types";
import { PollCreator } from "./chat-input/PollCreator";
import { GameNightCreator } from "./chat-input/GameNightCreator";
import { GamePicker } from "./chat-input/GamePicker";

const Picker = dynamic(() => import("@emoji-mart/react"), { ssr: false });

const MAX_IMAGES = 10;

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onSubmitImages?: (files: File[], caption: string) => void;
  onSubmitGame?: (gameId: string, caption: string) => void;
  onSubmitAudio?: (blob: Blob, duration: number) => void;
  onSubmitFile?: (file: File) => void;
  onSubmitPoll?: (question: string, options: string[], allowMultiple: boolean, endsAt?: string, anonymous?: boolean) => void;
  onSubmitGameNight?: (data: { title: string; scheduledAt: string; rawgId?: number; platform?: string; note?: string }) => void;
  onTyping?: () => void;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
}

export default function ChatInput({
  value,
  onChange,
  onSubmit,
  onSubmitImages,
  onSubmitGame,
  onSubmitAudio,
  onSubmitFile,
  onSubmitPoll,
  onSubmitGameNight,
  onTyping,
  disabled = false,
  placeholder = "Type a message…",
  maxLength = 2000,
}: Props) {
  const textareaRef    = useRef<HTMLTextAreaElement>(null);
  const fileInputRef   = useRef<HTMLInputElement>(null);
  const attachInputRef = useRef<HTMLInputElement>(null);
  const pickerContainerRef = useRef<HTMLDivElement>(null);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [gamePickerOpen, setGamePickerOpen] = useState(false);
  const [pollCreatorOpen, setPollCreatorOpen] = useState(false);
  const [gameNightCreatorOpen, setGameNightCreatorOpen] = useState(false);
  const [images, setImages] = useState<{ file: File; preview: string }[]>([]);
  const imagesRef = useRef(images);
  const [selectedGame, setSelectedGame] = useState<ChatMessageGame | null>(null);

  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingStartRef = useRef<number>(0);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 96)}px`;
  }, [value]);

  useEffect(() => { imagesRef.current = images; }, [images]);

  useEffect(() => {
    return () => { imagesRef.current.forEach((img) => URL.revokeObjectURL(img.preview)); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    setImages((prev) => [...prev, ...toAdd.map((f) => ({ file: f, preview: URL.createObjectURL(f) }))]);
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
    if (e.key === "Escape") { setPickerOpen(false); setGamePickerOpen(false); setGameNightCreatorOpen(false); }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const imageFiles: File[] = [];
    for (const item of e.clipboardData.items) {
      if (item.type.startsWith("image/")) {
        const f = item.getAsFile();
        if (f) imageFiles.push(f);
      }
    }
    if (imageFiles.length > 0) { e.preventDefault(); addFiles(imageFiles); }
  }

  async function startRecording() {
    if (disabled || recording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
      mr.start(250);
      mediaRecorderRef.current = mr;
      recordingStartRef.current = Date.now();
      setRecordingSeconds(0);
      setRecording(true);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(Math.round((Date.now() - recordingStartRef.current) / 1000));
      }, 500);
    } catch {
      // Microphone permission denied — silently ignore
    }
  }

  function stopRecording(send = true) {
    if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== "inactive") {
      if (!send) { mr.onstop = () => { mr.stream?.getTracks().forEach((t) => t.stop()); }; }
      mr.stop();
    }
    mediaRecorderRef.current = null;
    setRecording(false);
    setRecordingSeconds(0);
  }

  useEffect(() => {
    return () => { stopRecording(false); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function fmtRecording(s: number) {
    const m = Math.floor(s / 60);
    return `${m}:${(s % 60).toString().padStart(2, "0")}`;
  }

  const canSend = !disabled && (!!selectedGame || images.length > 0 || !!value.trim());
  const remaining = maxLength - value.length;
  const nearLimit = remaining <= 200;
  const activePlaceholder = selectedGame
    ? "Add a comment… (optional)"
    : images.length > 0
    ? "Add a caption… (optional)"
    : placeholder;

  const { getRootProps, isDragActive } = useDropzone({
    noClick: true,
    noKeyboard: true,
    onDrop: (accepted: File[]) => {
      const imgs  = accepted.filter((f) => f.type.startsWith("image/"));
      const files = accepted.filter((f) => !f.type.startsWith("image/"));
      if (imgs.length > 0) addFiles(imgs);
      if (files.length > 0 && onSubmitFile) files.forEach((f) => onSubmitFile(f));
    },
  });

  return (
    <div {...getRootProps()} className="relative">
      {isDragActive && (
        <div className="absolute inset-0 z-50 rounded-2xl border-2 border-dashed border-violet-500/70 bg-violet-500/10 backdrop-blur-sm flex items-center justify-center pointer-events-none">
          <p className="text-violet-300 text-sm font-medium">Drop files to send</p>
        </div>
      )}
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

      {gamePickerOpen && (
        <GamePicker
          onSelect={(game) => { setSelectedGame(game); setGamePickerOpen(false); }}
          onClose={() => setGamePickerOpen(false)}
        />
      )}

      {pollCreatorOpen && onSubmitPoll && (
        <PollCreator
          onSubmit={(q, opts, multi) => { onSubmitPoll(q, opts, multi); setPollCreatorOpen(false); }}
          onClose={() => setPollCreatorOpen(false)}
          disabled={disabled}
        />
      )}

      {gameNightCreatorOpen && onSubmitGameNight && (
        <GameNightCreator
          onSubmit={(data) => { onSubmitGameNight(data); setGameNightCreatorOpen(false); }}
          onClose={() => setGameNightCreatorOpen(false)}
        />
      )}

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
          <div className="flex items-end pb-0.5">
            <span className="text-xs text-gray-600">{images.length}/{MAX_IMAGES}</span>
          </div>
        </div>
      )}

      <div className="flex items-end gap-2 bg-white/5 backdrop-blur-sm border border-white/8 rounded-2xl px-3 py-2">
        <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileInput} />
        <input
          ref={attachInputRef}
          type="file"
          accept="*/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) { onSubmitFile?.(f); e.target.value = ""; }
          }}
        />

        {recording ? (
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
            <span className={`text-[10px] ${remaining <= 50 ? "text-red-400" : "text-gray-500"}`}>{remaining}</span>
          )}

          {recording ? (
            <>
              <button
                type="button"
                onClick={() => stopRecording(false)}
                className="p-1.5 rounded-xl text-gray-500 hover:text-gray-300 hover:bg-white/8 transition-colors"
                title="Cancel recording"
              >
                <X size={15} />
              </button>
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
              {onSubmitGameNight && (
                <button
                  type="button"
                  onClick={() => { setGameNightCreatorOpen((v) => !v); setPickerOpen(false); setGamePickerOpen(false); setPollCreatorOpen(false); }}
                  className={`p-1.5 rounded-xl transition-colors ${gameNightCreatorOpen ? "text-emerald-400 bg-emerald-500/15" : "text-gray-500 hover:text-gray-300 hover:bg-white/8"}`}
                  title="Schedule a game night"
                >
                  <CalendarDays size={15} />
                </button>
              )}
              {onSubmitPoll && (
                <button
                  type="button"
                  onClick={() => { setPollCreatorOpen((v) => !v); setPickerOpen(false); setGamePickerOpen(false); setGameNightCreatorOpen(false); }}
                  className={`p-1.5 rounded-xl transition-colors ${pollCreatorOpen ? "text-violet-400 bg-violet-500/15" : "text-gray-500 hover:text-gray-300 hover:bg-white/8"}`}
                  title="Create a poll"
                >
                  <BarChart2 size={15} />
                </button>
              )}
              <button
                type="button"
                onClick={() => { setGamePickerOpen((v) => !v); setPickerOpen(false); setPollCreatorOpen(false); setGameNightCreatorOpen(false); }}
                className={`p-1.5 rounded-xl transition-colors ${gamePickerOpen || selectedGame ? "text-violet-400 bg-violet-500/15" : "text-gray-500 hover:text-gray-300 hover:bg-white/8"}`}
                title="Share a game"
              >
                <Gamepad2 size={15} />
              </button>
              {onSubmitFile && (
                <button
                  type="button"
                  onClick={() => attachInputRef.current?.click()}
                  className="p-1.5 rounded-xl transition-colors text-gray-500 hover:text-gray-300 hover:bg-white/8"
                  title="Send a file"
                >
                  <Paperclip size={15} />
                </button>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`p-1.5 rounded-xl transition-colors ${images.length > 0 ? "text-violet-400 bg-violet-500/15" : "text-gray-500 hover:text-gray-300 hover:bg-white/8"}`}
                title={images.length > 0 ? `${images.length} image${images.length > 1 ? "s" : ""} selected` : "Send images"}
              >
                <ImageIcon size={15} />
              </button>
              <button
                type="button"
                onClick={() => { setPickerOpen((v) => !v); setGamePickerOpen(false); setPollCreatorOpen(false); }}
                className={`p-1.5 rounded-xl transition-colors ${pickerOpen ? "text-violet-400 bg-violet-500/15" : "text-gray-500 hover:text-gray-300 hover:bg-white/8"}`}
                title="Emoji"
              >
                <Smile size={15} />
              </button>
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
