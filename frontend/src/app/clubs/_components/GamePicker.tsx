"use client";

import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { X, Gamepad2 } from "lucide-react";
import clsx from "clsx";
import { api } from "@/lib/api";

const clubLabel =
  "block text-[10px] font-bold tracking-[0.1em] uppercase text-gx-text-3 mb-[5px]";
const clubInput =
  "w-full bg-gx-surface-2 border border-gx-border rounded-[10px] px-3 py-[9px] text-[13px] text-gx-text-1 " +
  "outline-none transition-colors focus:border-gx-amber/30 placeholder:text-gx-text-3";

interface GameOption {
  id: string;
  rawgId: number;
  name: string;
  coverImage?: string | null;
}

export function GamePicker({ selected, onSelect }: {
  selected: GameOption | null;
  onSelect: (g: GameOption | null) => void;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [dropRect, setDropRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const { data: results = [], isFetching } = useQuery<GameOption[]>({
    queryKey: ["game-search-club", q],
    queryFn: () => api.get(`/api/games/search?q=${encodeURIComponent(q)}`).then(r => r.data),
    enabled: q.trim().length >= 2,
    staleTime: 60_000,
  });

  function openDrop() {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (rect) setDropRect({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    setOpen(true);
  }

  function pick(g: GameOption) { onSelect(g); setQ(g.name); setOpen(false); }

  return (
    <div ref={wrapRef}>
      <label className={clubLabel}>Linked game (optional)</label>
      <div className="flex items-center gap-2">
        {selected?.coverImage && (
          <img src={selected.coverImage} alt={selected.name} className="w-6.5 h-8.5 object-cover rounded-sm shrink-0" />
        )}
        <input
          value={q}
          onChange={e => { setQ(e.target.value); onSelect(null); openDrop(); }}
          onFocus={() => { if (q.length >= 2 && !selected) openDrop(); }}
          placeholder="Search game…"
          className={clsx(clubInput, "flex-1")}
        />
        {selected && (
          <button onClick={() => { onSelect(null); setQ(""); setOpen(false); }}
            className="p-1.25 text-gx-text-3 bg-transparent border-none cursor-pointer hover:text-gx-text-1 transition-colors">
            <X size={13} />
          </button>
        )}
      </div>

      {open && !selected && q.length >= 2 && dropRect && typeof window !== "undefined" && createPortal(
        <>
          <div className="fixed inset-0 z-200" onClick={() => setOpen(false)} />
          <div style={{
            position: "fixed", top: dropRect.top, left: dropRect.left, width: dropRect.width,
            zIndex: 201, background: "var(--gx-surface-2)", border: "1px solid rgba(255,255,255,0.11)",
            borderRadius: 10, overflow: "hidden", boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
            maxHeight: 200, overflowY: "auto",
          }}>
            {isFetching && <p className="px-3 py-2 text-[12px] text-gx-text-3">Searching…</p>}
            {!isFetching && results.length === 0 && <p className="px-3 py-2 text-[12px] text-gx-text-3">No games found</p>}
            {results.map(g => (
              <button key={g.rawgId} onClick={() => pick(g)}
                className="w-full flex items-center gap-2.5 px-3 py-2 bg-transparent border-none cursor-pointer text-left transition-colors hover:bg-white/5">
                {g.coverImage
                  ? <img src={g.coverImage} alt={g.name} className="w-5 h-7 object-cover rounded-[3px] shrink-0" />
                  : <Gamepad2 size={13} className="text-gx-text-3 shrink-0" />}
                <span className="text-[12px] text-gx-text-2 truncate">{g.name}</span>
              </button>
            ))}
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
