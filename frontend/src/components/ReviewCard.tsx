"use client";

import { memo, useState } from "react";
import clsx from "clsx";
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
    <div className="bg-gx-surface border border-gx-border rounded-[14px] px-5 py-4.5 transition-colors flex flex-col gap-2.5 hover:border-gx-border-md">
      {/* Game link — global feed only */}
      {showGame && r.game && (
        <Link href={`/game/${r.game.rawgId}`} className="flex items-center gap-2.5 no-underline pb-3 border-b border-gx-border group">
          {r.game.coverImage && (
            <img src={r.game.coverImage} alt={r.game.name} className="w-7.5 h-10 rounded-[5px] object-cover shrink-0" />
          )}
          <span className="text-[12px] font-bold text-gx-text-2 tracking-[0.01em] transition-colors group-hover:text-gx-amber">{r.game.name}</span>
        </Link>
      )}

      {/* Reviewer info */}
      <div className="flex items-center justify-between gap-3">
        <Link href={`/user/${r.user.username}`} className="flex items-center gap-2 no-underline group">
          <Avatar src={r.user.avatar} username={r.user.username} size="sm" />
          <div>
            <p className="text-[13px] font-bold text-gx-text-1 transition-colors group-hover:text-gx-amber m-0">{r.user.username}</p>
            <p className="text-[11px] text-gx-text-3 mt-px m-0">{formatDistanceToNow(r.updatedAt)}</p>
          </div>
        </Link>
        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
          <StatusBadge status={r.status as GameStatus} />
          {r.platform && (
            <span className="inline-flex items-center gap-0.75 text-[10px] text-gx-text-3 bg-white/5 border border-gx-border px-1.75 py-0.5 rounded-[20px]">
              <Monitor size={10} /> {r.platform}
            </span>
          )}
        </div>
      </div>

      {/* Rating */}
      {r.rating != null && (
        <div className="flex items-center gap-0.5">
          {Array.from({ length: 10 }).map((_, i) => (
            <Star
              key={i}
              size={13}
              style={{ color: i < r.rating! ? "#F59E0B" : "var(--gx-text-3)" }}
              fill={i < r.rating! ? "currentColor" : "none"}
            />
          ))}
          <span className="text-[12px] font-bold text-gl-amber ml-1.5">{r.rating}/10</span>
        </div>
      )}

      {/* Review text */}
      <MarkdownReview text={r.review} className="text-[13px] text-gx-text-2 leading-[1.65]" />

      {reporting && <ReportModal type="REVIEW" targetId={r.id} onClose={() => setReporting(false)} />}

      {/* Footer: helpful + report */}
      <div className="flex items-center pt-2.5 border-t border-gx-border">
        {user && !isOwn ? (
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className={clsx(
              "inline-flex items-center gap-1.25 px-3 py-1.25 rounded-lg text-[12px] bg-transparent border cursor-pointer transition-all hover:text-gx-text-2 hover:bg-white/4 hover:border-gx-border",
              helpful
                ? "bg-gx-amber/13 border-gx-amber/30 text-gx-amber"
                : "border-transparent text-gx-text-3"
            )}
          >
            <ThumbsUp size={12} fill={helpful ? "currentColor" : "none"} />
            Helpful {count > 0 && <span className="font-bold">{count}</span>}
          </button>
        ) : count > 0 ? (
          <span className="flex items-center gap-1.25 text-[11px] text-gx-text-3">
            <ThumbsUp size={11} /> {count} found this helpful
          </span>
        ) : <span />}

        {user && !isOwn && (
          <button onClick={() => setReporting(true)} className="inline-flex items-center gap-1 ml-auto text-[11px] text-gx-text-3 bg-transparent border-none cursor-pointer transition-colors px-2 py-1 hover:text-gx-amber">
            <Flag size={11} /> Report
          </button>
        )}
      </div>
    </div>
  );
});
