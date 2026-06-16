"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Smile } from "lucide-react";
import clsx from "clsx";
import { api } from "@/lib/api";
import { dispatchToast } from "@/lib/toast";
import type { ClubPost, Reaction } from "../_types";

const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥", "🎮", "👏"];

export function ReactionBar({ post, clubId, currentUserId, onUpdate }: {
  post: ClubPost; clubId: string; currentUserId?: string;
  onUpdate: (reactions: Reaction[]) => void;
}) {
  const [showPicker, setShowPicker] = useState(false);

  const mutation = useMutation({
    mutationFn: (emoji: string) => api.post(`/api/clubs/${clubId}/posts/${post.id}/reactions`, { emoji }),
    onSuccess: (res) => { onUpdate(res.data.reactions); setShowPicker(false); },
    onError: (err: any) => dispatchToast(err?.response?.data?.error ?? "Failed", "error"),
  });

  const grouped = REACTION_EMOJIS.reduce<Record<string, { count: number; mine: boolean }>>((acc, e) => {
    const matching = post.reactions.filter((r) => r.emoji === e);
    if (matching.length > 0) acc[e] = { count: matching.length, mine: matching.some((r) => r.userId === currentUserId) };
    return acc;
  }, {});

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", position: "relative" }}>
      {Object.entries(grouped).map(([emoji, { count, mine }]) => (
        <button key={emoji} onClick={() => currentUserId && mutation.mutate(emoji)}
          className={clsx(
            "inline-flex items-center gap-1 px-2.25 py-0.75 rounded-[20px] text-[11px] border border-gx-border bg-white/3 text-gx-text-2 cursor-pointer transition-all hover:border-gx-border-md",
            mine && "bg-gx-amber/13! border-gx-amber/30! text-gx-amber!"
          )}>
          {emoji} <span>{count}</span>
        </button>
      ))}
      {currentUserId && (
        <div style={{ position: "relative" }}>
          <button onClick={() => setShowPicker((v) => !v)} className="p-1.25 rounded-lg text-gx-text-3 bg-none border-none cursor-pointer transition-[color,background] hover:text-gx-amber hover:bg-gx-amber/13">
            <Smile size={14} />
          </button>
          {showPicker && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowPicker(false)} />
              <div style={{ position: "absolute", bottom: "100%", left: 0, marginBottom: 4, zIndex: 20, background: "var(--gx-surface-2)", border: "1px solid var(--gx-border-md)", borderRadius: 12, padding: 8, display: "flex", gap: 4, boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}>
                {REACTION_EMOJIS.map((e) => (
                  <button key={e} onClick={() => mutation.mutate(e)}
                    style={{ fontSize: 17, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, background: "none", border: "none", cursor: "pointer", transition: "background 0.1s" }}
                    onMouseEnter={(el) => (el.currentTarget.style.background = "rgba(255,255,255,0.08)")}
                    onMouseLeave={(el) => (el.currentTarget.style.background = "none")}>
                    {e}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
