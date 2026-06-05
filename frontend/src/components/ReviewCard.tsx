"use client";

import { memo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Star, ThumbsUp, Monitor, Flag } from "lucide-react";
import { ReportModal } from "./ReportModal";
import Link from "next/link";
import { Text, Flex } from "@radix-ui/themes";
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

  // Derive directly from the cache-updated prop — no local mirror needed.
  // The mutation's onSuccess patches the cache, which triggers a re-render
  // with the updated values here automatically.
  const helpful = r.helpfulByMe;
  const count   = r.helpfulCount;

  const mutation = useMutation({
    mutationFn: () => api.post(`/api/entries/${r.id}/helpful`),
    onSuccess: (res) => {
      qc.setQueryData(queryKey, (old: unknown) => {
        if (!Array.isArray(old)) return old; // guard against mismatched cache shape
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
    <div className="bg-white/5 backdrop-blur-sm border border-white/8 rounded-2xl p-5 space-y-3">
      {/* Game header (global feed only) */}
      {showGame && r.game && (
        <Link
          href={`/game/${r.game.rawgId}`}
          className="flex items-center gap-2.5 group mb-1"
        >
          {r.game.coverImage && (
            <img
              src={r.game.coverImage}
              alt={r.game.name}
              className="w-8 h-10 object-cover rounded-md shrink-0"
            />
          )}
          <Text as="span" size="2" className="font-semibold text-violet-400 group-hover:text-violet-300 transition-colors">
            {r.game.name}
          </Text>
        </Link>
      )}

      {/* Reviewer info */}
      <Flex align="center" justify="between" gap="3">
        <Link href={`/user/${r.user.username}`} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <Avatar src={r.user.avatar} username={r.user.username} size="sm" />
          <div>
            <Text as="p" size="2" className="font-semibold">{r.user.username}</Text>
            <Text as="p" size="1" color="gray">{formatDistanceToNow(r.updatedAt)}</Text>
          </div>
        </Link>
        <Flex align="center" gap="2" className="shrink-0">
          <StatusBadge status={r.status as GameStatus} />
          {r.platform && (
            <span className="flex items-center gap-1 text-xs text-gray-500 bg-white/8 px-2 py-0.5 rounded-full">
              <Monitor size={10} />
              {r.platform}
            </span>
          )}
        </Flex>
      </Flex>

      {/* Rating */}
      {r.rating != null && (
        <Flex align="center" gap="1">
          {Array.from({ length: 10 }).map((_, i) => (
            <Star key={i} size={14} className={i < r.rating! ? "text-yellow-400" : "text-gray-700"} fill={i < r.rating! ? "currentColor" : "none"} />
          ))}
          <span className="text-yellow-400 text-sm font-bold ml-1">{r.rating}/10</span>
        </Flex>
      )}

      {/* Review text */}
      <MarkdownReview text={r.review} className="text-gray-300 text-sm leading-relaxed" />

      {reporting && <ReportModal type="REVIEW" targetId={r.id} onClose={() => setReporting(false)} />}

      {/* Helpful + Report */}
      <div className="flex items-center justify-between pt-1 border-t border-white/6">
        {user && !isOwn ? (
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${
              helpful
                ? "bg-violet-500/20 text-violet-300 border border-violet-500/30"
                : "text-gray-500 hover:text-gray-300 hover:bg-white/8 border border-transparent"
            }`}
          >
            <ThumbsUp size={13} fill={helpful ? "currentColor" : "none"} />
            Helpful {count > 0 && <span className="font-medium">{count}</span>}
          </button>
        ) : count > 0 ? (
          <span className="flex items-center gap-1.5 text-xs text-gray-600">
            <ThumbsUp size={11} />
            {count} found this helpful
          </span>
        ) : null}

        {/* Report button — only for other users' reviews */}
        {user && !isOwn && (
          <button
            onClick={() => setReporting(true)}
            className="flex items-center gap-1 text-xs text-gray-600 hover:text-orange-400 transition-colors ml-auto"
            title="Report this review"
          >
            <Flag size={12} /> Report
          </button>
        )}
      </div>
    </div>
  );
});
