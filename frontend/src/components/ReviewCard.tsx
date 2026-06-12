"use client";

import { memo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Star, ThumbsUp, Monitor, Flag } from "lucide-react";
import { ReportModal } from "./ReportModal";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { GameReview, GameStatus } from "@/lib/types";
import { formatDistanceToNow } from "@/lib/utils";
import { dispatchToast } from "@/lib/toast";
import Avatar from "./Avatar";
import StatusBadge from "./StatusBadge";
import MarkdownReview from "./MarkdownReview";

interface Props {
  review: GameReview;
  /** If true, show the game cover + name (for global feed) */
  showGame?: boolean;
  queryKey: unknown[];
}

export const ReviewCard = memo(function ReviewCard({ review: r, showGame = false, queryKey }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isOwn = user?.id === r.user.id;
  const [reporting, setReporting] = useState(false);

  const helpful = r.helpfulByMe;
  const count   = r.helpfulCount;

  const mutation = useMutation({
    mutationFn: () => api.post(`/api/entries/${r.id}/helpful`),
    onSuccess: (res) => {
      qc.setQueryData(queryKey, (old: unknown) => {
        if (!Array.isArray(old)) return old;
        return (old as GameReview[]).map((rev) =>
          rev.id === r.id
            ? { ...rev, helpfulByMe: res.data.helpful, helpfulCount: res.data.count }
            : rev
        );
      });
    },
    onError: (err: any) => dispatchToast(err?.response?.data?.error ?? "Failed", "error"),
  });

  return (
    <div className="gx-rv-card">
      {/* Game link — global feed only */}
      {showGame && r.game && (
        <Link href={`/game/${r.game.rawgId}`} className="gx-rv-game-link">
          {r.game.coverImage && (
            <img src={r.game.coverImage} alt={r.game.name} className="gx-rv-game-cover" />
          )}
          <span className="gx-rv-game-name">{r.game.name}</span>
        </Link>
      )}

      {/* Reviewer info */}
      <div className="gx-rv-user-row">
        <Link href={`/user/${r.user.username}`} className="gx-rv-user-link">
          <Avatar src={r.user.avatar} username={r.user.username} size="sm" />
          <div>
            <p className="gx-rv-username">{r.user.username}</p>
            <p className="gx-rv-date">{formatDistanceToNow(r.updatedAt)}</p>
          </div>
        </Link>
        <div className="gx-rv-meta">
          <StatusBadge status={r.status as GameStatus} />
          {r.platform && (
            <span className="gx-rv-platform">
              <Monitor size={10} /> {r.platform}
            </span>
          )}
        </div>
      </div>

      {/* Rating */}
      {r.rating != null && (
        <div className="gx-rv-stars">
          {Array.from({ length: 10 }).map((_, i) => (
            <Star
              key={i}
              size={13}
              style={{ color: i < r.rating! ? "#F59E0B" : "var(--gx-text-3)" }}
              fill={i < r.rating! ? "currentColor" : "none"}
            />
          ))}
          <span className="gx-rv-star-count">{r.rating}/10</span>
        </div>
      )}

      {/* Review text */}
      <MarkdownReview text={r.review} className="gx-rv-body" />

      {reporting && <ReportModal type="REVIEW" targetId={r.id} onClose={() => setReporting(false)} />}

      {/* Footer: helpful + report */}
      <div className="gx-rv-footer">
        {user && !isOwn ? (
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className={`gx-rv-helpful ${helpful ? "gx-rv-helpful-active" : ""}`}
          >
            <ThumbsUp size={12} fill={helpful ? "currentColor" : "none"} />
            Helpful {count > 0 && <span style={{ fontWeight: 700 }}>{count}</span>}
          </button>
        ) : count > 0 ? (
          <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--gx-text-3)" }}>
            <ThumbsUp size={11} /> {count} found this helpful
          </span>
        ) : <span />}

        {user && !isOwn && (
          <button onClick={() => setReporting(true)} className="gx-rv-report">
            <Flag size={11} /> Report
          </button>
        )}
      </div>
    </div>
  );
});
