"use client";

import { useState } from "react";
import { Lightbox } from "./Lightbox";

interface Props { urls: string[]; caption: string; isOwn: boolean }

export function ImageGrid({ urls, caption, isOwn }: Props) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const count = urls.length;
  const visible = urls.slice(0, 4);
  const extra = Math.max(0, count - 4);

  const Tile = ({ url, idx, spanFull = false }: { url: string; idx: number; spanFull?: boolean }) => (
    <div
      className={`relative overflow-hidden cursor-pointer group/tile ${spanFull ? "col-span-2 aspect-video" : "aspect-square"}`}
      onClick={() => setLightboxIdx(idx)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" className="w-full h-full object-cover group-hover/tile:brightness-90 transition-all duration-200" />
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
        {count === 1 && <Tile url={visible[0]} idx={0} spanFull />}
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
        {caption && caption !== "[deleted]" && (
          <div className={`px-3 py-1.5 text-sm ${isOwn ? "bg-violet-600/90 text-white" : "bg-white/10 text-white"}`}>
            {caption}
          </div>
        )}
      </div>
      {lightboxIdx !== null && (
        <Lightbox urls={urls} initialIdx={lightboxIdx} onClose={() => setLightboxIdx(null)} />
      )}
    </>
  );
}
