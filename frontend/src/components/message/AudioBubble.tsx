"use client";

import { useState, useEffect, useRef } from "react";
import { Play, Pause, Volume2, Volume1, VolumeX } from "lucide-react";
import * as Slider from "@radix-ui/react-slider";

interface Props {
  audioUrl: string;
  duration?: number | null;
  isOwn: boolean;
}

// Fixed heights to avoid hydration mismatch
const SKELETON = [35, 60, 80, 50, 75, 90, 45, 65, 85, 55, 70, 95, 50, 68, 58, 80, 42, 65, 88, 52, 73, 38, 62, 78];

function fmt(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
}

function VolumeIcon({ vol }: { vol: number }) {
  if (vol === 0) return <VolumeX size={11} />;
  if (vol < 0.5) return <Volume1 size={11} />;
  return <Volume2 size={11} />;
}

export function AudioBubble({ audioUrl, duration, isOwn }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wsRef        = useRef<any>(null);

  const [playing, setPlaying]         = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotal]     = useState(duration ?? 0);
  const [ready, setReady]             = useState(false);
  const [volume, setVolume]           = useState(1);

  useEffect(() => {
    if (!containerRef.current) return;

    let destroyed = false;
    let ws: any = null;

    import("wavesurfer.js").then(({ default: WaveSurfer }) => {
      if (destroyed || !containerRef.current) return;

      ws = WaveSurfer.create({
        container: containerRef.current,
        url: audioUrl,
        waveColor:     isOwn ? "rgba(255,255,255,0.30)" : "rgba(139,92,246,0.45)",
        progressColor: isOwn ? "rgba(255,255,255,0.95)" : "rgb(139,92,246)",
        height: 30,
        barWidth: 2,
        barGap: 1,
        barRadius: 3,
        interact: true,
        normalize: true,
        cursorWidth: 0,
      });

      ws.on("ready",      (dur: number) => { setTotal(dur); setReady(true); });
      ws.on("play",       () => setPlaying(true));
      ws.on("pause",      () => setPlaying(false));
      ws.on("timeupdate", (t: number)  => setCurrentTime(t));
      ws.on("finish",     () => { setPlaying(false); setCurrentTime(0); ws.seekTo(0); });

      wsRef.current = ws;
    });

    return () => {
      destroyed = true;
      ws?.destroy();
      wsRef.current = null;
    };
  }, [audioUrl, isOwn]);

  function handleVolumeChange([v]: number[]) {
    setVolume(v);
    wsRef.current?.setVolume(v);
  }

  const displayTime = playing || currentTime > 0 ? currentTime : (totalDuration || duration || 0);

  return (
    <div className={`flex items-center gap-2.5 rounded-2xl px-3 py-2.5 w-52 ${
      isOwn
        ? "bg-violet-600/90 text-white rounded-br-sm"
        : "bg-white/10 backdrop-blur-sm text-white rounded-bl-sm"
    }`}>
      {/* Play / Pause */}
      <button
        onClick={() => wsRef.current?.playPause()}
        disabled={!ready}
        className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors disabled:opacity-40 ${
          isOwn ? "bg-white/20 hover:bg-white/30" : "bg-white/15 hover:bg-white/25"
        }`}
      >
        {playing ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
      </button>

      {/* Waveform + bottom row */}
      <div className="flex-1 min-w-0">
        {/* Skeleton while loading */}
        {!ready && (
          <div className="flex items-center gap-[2.5px] h-7.5">
            {SKELETON.map((h, i) => (
              <div
                key={i}
                className={`w-0.5 rounded-full ${isOwn ? "bg-white/25" : "bg-violet-400/30"}`}
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        )}
        <div ref={containerRef} className={ready ? "" : "hidden"} />

        {/* Timer + volume (slider slides in on hover) */}
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className={`text-[10px] tabular-nums shrink-0 ${isOwn ? "text-violet-200" : "text-gray-400"}`}>
            {fmt(displayTime)}
          </span>

          <div className="group flex items-center gap-1 ml-auto">
            {/* Slider: hidden by default, expands on group hover */}
            <Slider.Root
              value={[volume]}
              onValueChange={handleVolumeChange}
              min={0}
              max={1}
              step={0.05}
              className="relative flex items-center select-none touch-none h-3 cursor-pointer w-0 overflow-hidden group-hover:w-14 transition-all duration-200"
            >
              <Slider.Track className={`relative grow rounded-full h-0.5 ${isOwn ? "bg-white/20" : "bg-white/15"}`}>
                <Slider.Range className={`absolute rounded-full h-full ${isOwn ? "bg-white/90" : "bg-violet-400"}`} />
              </Slider.Track>
              <Slider.Thumb
                className={`block w-2.5 h-2.5 rounded-full shadow hover:scale-110 transition-transform focus:outline-none ${
                  isOwn ? "bg-white" : "bg-violet-400"
                }`}
              />
            </Slider.Root>
            {/* Volume icon */}
            <div className="opacity-50 group-hover:opacity-100 transition-opacity" title="Volume">
              <VolumeIcon vol={volume} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
