"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { X, Gamepad2 } from "lucide-react";
import { api } from "@/lib/api";
import type { GameOption } from "../_types";

export function GamePickerInline({ selected, onSelect }: {
  selected: GameOption | null;
  onSelect: (g: GameOption | null) => void;
}) {
  const [q, setQ]       = useState(selected?.name ?? "");
  const [open, setOpen] = useState(false);
  const [dropRect, setDropRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setQ(selected?.name ?? ""); }, [selected?.name]);

  const { data: results = [], isFetching } = useQuery<GameOption[]>({
    queryKey: ["game-search-club-inline", q],
    queryFn: () => api.get(`/api/games/search?q=${encodeURIComponent(q)}`).then((r) => r.data),
    enabled: q.trim().length >= 2 && !selected,
    staleTime: 60_000,
  });

  function openDrop() {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (rect) setDropRect({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    setOpen(true);
  }

  return (
    <div ref={wrapRef}>
      <label className="text-[10px] font-bold tracking-widest uppercase text-gx-text-3 mb-1.25 block">Linked game</label>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {selected?.coverImage && (
          <img src={selected.coverImage} alt={selected.name} style={{ width: 24, height: 32, objectFit: "cover", borderRadius: 4, flexShrink: 0 }} />
        )}
        <input value={q}
          onChange={(e) => { setQ(e.target.value); onSelect(null); openDrop(); }}
          onFocus={() => { if (q.length >= 2 && !selected) openDrop(); }}
          placeholder="Search and link a game…"
          className="w-full bg-gx-surface-2 border border-gx-border rounded-[10px] px-3 py-2.25 text-[13px] text-gx-text-1 outline-none transition-colors focus:border-gx-amber/30 placeholder:text-gx-text-3"
          style={{ flex: 1 }}
        />
        {selected && (
          <button onClick={() => { onSelect(null); setQ(""); setOpen(false); }}
            style={{ padding: 4, color: "var(--gx-text-3)", background: "none", border: "none", cursor: "pointer", flexShrink: 0 }}>
            <X size={13} />
          </button>
        )}
      </div>
      {open && !selected && q.length >= 2 && dropRect && typeof window !== "undefined" && createPortal(
        <>
          <div className="fixed inset-0 z-200" onClick={() => setOpen(false)} />
          <div style={{ position: "fixed", top: dropRect.top, left: dropRect.left, width: dropRect.width, zIndex: 201, background: "var(--gx-surface-2)", border: "1px solid var(--gx-border-md)", borderRadius: 10, overflow: "hidden", boxShadow: "0 12px 32px rgba(0,0,0,0.5)", maxHeight: 176, overflowY: "auto" }}>
            {isFetching && <p style={{ padding: "8px 12px", fontSize: 12, color: "var(--gx-text-3)" }}>Searching…</p>}
            {!isFetching && results.length === 0 && <p style={{ padding: "8px 12px", fontSize: 12, color: "var(--gx-text-3)" }}>No games found</p>}
            {results.map((g) => (
              <button key={g.rawgId} onClick={() => { onSelect(g); setQ(g.name); setOpen(false); }}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "none")}>
                {g.coverImage
                  ? <img src={g.coverImage} alt={g.name} style={{ width: 20, height: 27, objectFit: "cover", borderRadius: 3, flexShrink: 0 }} />
                  : <Gamepad2 size={13} style={{ color: "var(--gx-text-3)", flexShrink: 0 }} />}
                <span style={{ fontSize: 12, color: "var(--gx-text-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.name}</span>
              </button>
            ))}
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
