"use client";

import { useState, useEffect, useRef } from "react";
import { Play, Pause } from "lucide-react";
import { Flex } from "@radix-ui/themes";

interface Props { audioUrl: string; duration?: number | null; isOwn: boolean }

export function AudioBubble({ audioUrl, duration, isOwn }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration ?? 0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    function onTimeUpdate() { setCurrentTime(audio!.currentTime); }
    function onDurationChange() { if (isFinite(audio!.duration)) setTotalDuration(audio!.duration); }
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
    return `${m}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
  }

  return (
    <div className={`flex items-center gap-2.5 rounded-2xl px-3 py-2.5 max-w-55 ${isOwn ? "bg-violet-600/90 text-white rounded-br-sm" : "bg-white/10 backdrop-blur-sm text-white rounded-bl-sm"}`}>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      <button
        onClick={togglePlay}
        className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isOwn ? "bg-white/20 hover:bg-white/30" : "bg-white/15 hover:bg-white/25"}`}
      >
        {playing ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
      </button>
      <Flex direction="column" gap="1" flexGrow="1" minWidth="0">
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
      </Flex>
    </div>
  );
}
