"use client";

import { useState } from "react";
import Image from "next/image";
import { Lightbox } from "./Lightbox";

interface Props { imageUrl: string; caption: string; isOwn: boolean }

export function ImageContent({ imageUrl, caption, isOwn }: Props) {
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
