"use client";

import { useEffect } from "react";

const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

interface Props {
  isOwn: boolean;
  open: boolean;
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export function QuickReactionPicker({ isOwn, open, onSelect, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const close = () => onClose();
    const id = setTimeout(() => document.addEventListener("click", close), 0);
    return () => { clearTimeout(id); document.removeEventListener("click", close); };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={`absolute bottom-full mb-1 flex items-center gap-0.5 bg-zinc-900/98 backdrop-blur-sm border border-white/10 rounded-full px-2 py-1 shadow-2xl z-30 ${isOwn ? "right-0" : "left-0"}`}
      onClick={(e) => e.stopPropagation()}
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
