"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Star, Gamepad2, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { dispatchToast } from "@/lib/toast";
import { GameEntry, GameStatus } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";
import AddGameModal from "@/components/AddGameModal";

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
    <div className="gx-lib-card">
      <Link href={`/game/${entry.game.rawgId}`} style={{ display: "block" }}>
        {entry.game.coverImage ? (
          <img src={entry.game.coverImage} alt={entry.game.name} loading="lazy" decoding="async" />
        ) : (
          <div className="gx-lib-card-empty">
            <Gamepad2 size={28} color="var(--gx-text-3)" />
          </div>
        )}
        <div className="gx-lib-card-foot">
          <StatusBadge status={entry.status as GameStatus} />
          {entry.rating != null && (
            <div style={{ display: "flex", alignItems: "center", gap: 3, marginTop: 4 }}>
              <Star size={10} fill="#F59E0B" color="#F59E0B" />
              <span style={{ fontSize: 10, color: "#F59E0B", fontWeight: 700 }}>{entry.rating}</span>
            </div>
          )}
        </div>
      </Link>

      <p className="gx-lib-card-name">{entry.game.name}</p>

      {/* Hover actions */}
      <div className="gx-lib-card-actions">
        <AddGameModal
          preselectedGame={entry.game}
          initialValues={{
            status: entry.status as GameStatus,
            rating: entry.rating,
            review: entry.review,
            playtime: entry.playtime,
          }}
          trigger={
            <button className="gx-lib-card-btn" title="Edit">
              <Pencil size={11} />
            </button>
          }
        />
        <button
          onClick={() => deleteMutation.mutate()}
          disabled={deleteMutation.isPending}
          className="gx-lib-card-btn gx-lib-card-btn-danger"
          title="Remove"
        >
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  );
}
