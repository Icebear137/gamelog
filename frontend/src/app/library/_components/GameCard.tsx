"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Star, Gamepad2, Pencil, Trash2 } from "lucide-react";
import clsx from "clsx";
import Link from "next/link";
import { api } from "@/lib/api";
import { dispatchToast } from "@/lib/toast";
import { GameEntry, GameStatus } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";
import AddGameModal from "@/components/AddGameModal";

const cardBtn =
  "w-[26px] h-[26px] bg-black/70 backdrop-blur-[4px] border-none rounded-[7px] " +
  "text-gx-text-1 flex items-center justify-center cursor-pointer transition-[background-color]";

export function GameCard({ entry }: { entry: GameEntry }) {
  const qc = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/api/entries/${entry.game.rawgId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-entries"] });
      dispatchToast("Removed from library", "success");
    },
    onError: (err: any) => {
      dispatchToast(err?.response?.data?.error ?? "Failed to remove", "error");
    },
  });

  return (
    <div
      className={clsx(
        "group relative rounded-[10px] overflow-hidden bg-gx-surface-2 border border-gx-border",
        "cursor-pointer contain-[layout_style] transition-colors hover:border-gx-amber/30",
      )}
    >
      <Link href={`/game/${entry.game.rawgId}`} style={{ display: "block" }}>
        {entry.game.coverImage ? (
          <img
            src={entry.game.coverImage}
            alt={entry.game.name}
            loading="lazy"
            decoding="async"
            className="w-full aspect-3/4 object-cover block"
          />
        ) : (
          <div className="w-full aspect-3/4 flex items-center justify-center bg-gx-surface-2">
            <Gamepad2 size={28} color="var(--gx-text-3)" />
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.9)_0%,transparent_100%)] pt-5.5 px-1.5 pb-1.5">
          <StatusBadge status={entry.status as GameStatus} />
          {entry.rating != null && (
            <div style={{ display: "flex", alignItems: "center", gap: 3, marginTop: 4 }}>
              <Star size={10} fill="#F59E0B" color="#F59E0B" />
              <span style={{ fontSize: 10, color: "#F59E0B", fontWeight: 700 }}>{entry.rating}</span>
            </div>
          )}
        </div>
      </Link>

      <p className="text-[10px] font-semibold text-gx-text-2 truncate mt-1.5 px-1 transition-colors group-hover:text-gx-text-1">
        {entry.game.name}
      </p>

      {/* Hover actions */}
      <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 z-5">
        <AddGameModal
          preselectedGame={entry.game}
          initialValues={{
            status: entry.status as GameStatus,
            rating: entry.rating,
            review: entry.review,
            playtime: entry.playtime,
          }}
          trigger={
            <button className={clsx(cardBtn, "hover:bg-gx-amber/13 hover:text-gx-amber")} title="Edit">
              <Pencil size={11} />
            </button>
          }
        />
        <button
          onClick={() => deleteMutation.mutate()}
          disabled={deleteMutation.isPending}
          className={clsx(cardBtn, "hover:bg-gx-red/13 hover:text-gx-red")}
          title="Remove"
        >
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  );
}
