"use client";

import { useState } from "react";

interface Props {
  text: string;
  className?: string;
}

/**
 * Renders text with [spoiler]...[/spoiler] segments as click-to-reveal blurred blocks.
 * Multiple spoiler blocks within the same string are each independently revealable.
 */
export default function SpoilerText({ text, className }: Props) {
  // Split text on [spoiler] / [/spoiler] pairs
  const parts = text.split(/(\[spoiler\][\s\S]*?\[\/spoiler\])/gi);

  return (
    <span className={className}>
      {parts.map((part, i) => {
        const match = part.match(/^\[spoiler\]([\s\S]*?)\[\/spoiler\]$/i);
        if (match) {
          return <SpoilerBlock key={i} content={match[1]} />;
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}

function SpoilerBlock({ content }: { content: string }) {
  const [revealed, setRevealed] = useState(false);

  return (
    <span
      role="button"
      tabIndex={0}
      title={revealed ? "Click to hide" : "Click to reveal spoiler"}
      onClick={() => setRevealed((v) => !v)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") setRevealed((v) => !v);
      }}
      className={`inline rounded px-1 cursor-pointer select-none transition-all duration-200 ${
        revealed
          ? "bg-gray-700 text-gray-200"
          : "bg-gray-600 text-transparent blur-[3px] hover:opacity-80"
      }`}
    >
      {content}
    </span>
  );
}
