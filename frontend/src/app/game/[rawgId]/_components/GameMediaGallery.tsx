"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Play, X, Maximize2 } from "lucide-react";
import { api } from "@/lib/api";

interface Screenshot { id: number; url: string }
interface Movie { id: number; name: string; preview: string; url: string | null }
interface MediaItem {
  type: "image" | "video";
  id: number;
  thumb: string;
  url: string;
  name?: string;
}

interface Props {
  rawgId: string;
  /** Cover image shown while RAWG media loads */
  coverFallback?: string | null;
}

export function GameMediaGallery({ rawgId, coverFallback }: Props) {
  const [active, setActive]     = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [playing, setPlaying]   = useState(false);
  const videoRef                = useRef<HTMLVideoElement>(null);
  const thumbRef                = useRef<HTMLDivElement>(null);

  const { data: screenshots = [], isLoading: loadingShots } = useQuery<Screenshot[]>({
    queryKey: ["game-screenshots", rawgId],
    queryFn: () => api.get(`/api/games/${rawgId}/screenshots`).then((r) => r.data),
    staleTime: 10 * 60_000,
  });

  const { data: movies = [], isLoading: loadingMovies } = useQuery<Movie[]>({
    queryKey: ["game-movies", rawgId],
    queryFn: () => api.get(`/api/games/${rawgId}/movies`).then((r) => r.data),
    staleTime: 10 * 60_000,
  });

  const isLoading = loadingShots || loadingMovies;

  const items: MediaItem[] = [
    ...movies.filter((m) => m.url).map((m) => ({
      type: "video" as const, id: m.id, thumb: m.preview, url: m.url!, name: m.name,
    })),
    ...screenshots.map((s) => ({
      type: "image" as const, id: s.id, thumb: s.url, url: s.url,
    })),
  ];

  const current = items[active] ?? null;

  const go = useCallback((dir: 1 | -1) => {
    setPlaying(false);
    setActive((prev) => (prev + dir + items.length) % items.length);
  }, [items.length]);

  // Scroll active thumbnail into view
  useEffect(() => {
    const el = thumbRef.current?.children[active] as HTMLElement | undefined;
    el?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [active]);

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft")  go(-1);
      if (e.key === "ArrowRight") go(1);
      if (e.key === "Escape")     setLightbox(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [lightbox, go]);

  // While loading or no media, show cover fallback as banner
  if (isLoading || items.length === 0) {
    if (!coverFallback) return null;
    return (
      <div className="relative h-52 overflow-hidden">
        <img src={coverFallback} alt="Cover" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-linear-to-t from-gray-900/80 via-gray-900/20 to-transparent" />
      </div>
    );
  }

  return (
    <>
      {/* ── Main display ── */}
      <div className="relative w-full aspect-video bg-black group">
        {current?.type === "video" && current.url ? (
          !playing ? (
            <>
              <img src={current.thumb} alt={current.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <button
                  onClick={() => setPlaying(true)}
                  className="w-16 h-16 rounded-full bg-white/90 hover:bg-white flex items-center justify-center transition-transform hover:scale-110 shadow-2xl"
                >
                  <Play size={28} className="text-gray-900 ml-1" fill="currentColor" />
                </button>
              </div>
              <div className="absolute bottom-3 left-3 px-2 py-0.5 rounded-full bg-black/60 text-white text-xs backdrop-blur-sm">
                {current.name}
              </div>
            </>
          ) : (
            <video
              ref={videoRef}
              src={current.url}
              autoPlay
              controls
              className="w-full h-full object-contain bg-black"
              onEnded={() => setPlaying(false)}
            />
          )
        ) : (
          <img
            src={current?.url}
            alt="Screenshot"
            className="w-full h-full object-cover cursor-zoom-in"
            onClick={() => setLightbox(true)}
          />
        )}

        {/* Nav arrows */}
        {items.length > 1 && (
          <>
            <button onClick={() => go(-1)}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
              <ChevronLeft size={18} />
            </button>
            <button onClick={() => go(1)}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
              <ChevronRight size={18} />
            </button>
          </>
        )}

        {/* Expand button for images */}
        {current?.type === "image" && (
          <button onClick={() => setLightbox(true)}
            className="absolute top-3 right-3 p-1.5 rounded-lg bg-black/50 hover:bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
            <Maximize2 size={14} />
          </button>
        )}

        {/* Counter */}
        <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded-full bg-black/60 text-white text-xs backdrop-blur-sm">
          {active + 1} / {items.length}
        </div>
      </div>

      {/* ── Thumbnail strip ── */}
      {items.length > 1 && (
        <div
          ref={thumbRef}
          className="flex gap-1.5 overflow-x-auto p-2 bg-black/30 scrollbar-none"
        >
          {items.map((item, i) => (
            <button
              key={item.id}
              onClick={() => { setActive(i); setPlaying(false); }}
              className={`relative shrink-0 w-20 h-12 overflow-hidden rounded-md border-2 transition-all ${
                i === active
                  ? "border-violet-500 opacity-100"
                  : "border-transparent opacity-50 hover:opacity-80"
              }`}
            >
              <img src={item.thumb} alt="" className="w-full h-full object-cover" />
              {item.type === "video" && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <Play size={12} className="text-white" fill="white" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* ── Lightbox — portal to body to escape backdrop-filter stacking context ── */}
      {lightbox && current?.type === "image" && typeof window !== "undefined" && createPortal(
        <div
          style={{ position: "fixed", inset: 0, zIndex: 9999, background: "#000" }}
          className="flex items-center justify-center"
          onClick={() => setLightbox(false)}
        >
          {/* Close */}
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            onClick={() => setLightbox(false)}
          >
            <X size={20} />
          </button>

          {/* Prev */}
          {items.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); go(-1); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            >
              <ChevronLeft size={24} />
            </button>
          )}

          {/* Image — fills screen, click outside to close */}
          <img
            src={current.url}
            alt=""
            style={{ maxWidth: "100vw", maxHeight: "100vh", objectFit: "contain" }}
            onClick={(e) => e.stopPropagation()}
          />

          {/* Next */}
          {items.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); go(1); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            >
              <ChevronRight size={24} />
            </button>
          )}

          {/* Counter + thumbnail strip at bottom */}
          <div className="absolute bottom-4 left-0 right-0 flex flex-col items-center gap-2">
            <div className="flex gap-1.5 overflow-x-auto max-w-2xl px-4 scrollbar-none">
              {items.filter((it) => it.type === "image").map((item, _i) => {
                const globalIdx = items.indexOf(item);
                return (
                  <button
                    key={item.id}
                    onClick={(e) => { e.stopPropagation(); setActive(globalIdx); }}
                    className={`shrink-0 w-14 h-9 rounded overflow-hidden border-2 transition-all ${
                      globalIdx === active ? "border-white opacity-100" : "border-transparent opacity-40 hover:opacity-70"
                    }`}
                  >
                    <img src={item.thumb} alt="" className="w-full h-full object-cover" />
                  </button>
                );
              })}
            </div>
            <span className="text-white/50 text-xs">{active + 1} / {items.length} · Esc to close</span>
          </div>
        </div>,
        document.body
      )}

    </>
  );
}
