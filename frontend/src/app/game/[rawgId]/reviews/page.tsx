"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Star, MessageSquare, ArrowLeft, Monitor } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import Avatar from "@/components/Avatar";
import StatusBadge from "@/components/StatusBadge";
import MarkdownReview from "@/components/MarkdownReview";
import { GameStatus } from "@/lib/types";
import { formatDistanceToNow } from "@/lib/utils";

interface Review {
  id: string;
  rating?: number;
  review: string;
  status: string;
  platform?: string;
  updatedAt: string;
  user: { id: string; username: string; avatar?: string };
}

interface GameBasic {
  name: string;
  coverImage?: string;
  rawgId: number;
}

export default function GameReviewsPage({ params }: { params: Promise<{ rawgId: string }> }) {
  const { rawgId } = use(params);
  const router = useRouter();

  const { data: game } = useQuery<GameBasic>({
    queryKey: ["game", rawgId],
    queryFn: () => api.get(`/api/games/${rawgId}`).then((r) => r.data),
  });

  const { data: reviews = [], isLoading } = useQuery<Review[]>({
    queryKey: ["game-reviews", rawgId],
    queryFn: () => api.get(`/api/games/${rawgId}/reviews`).then((r) => r.data),
  });

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/8 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <MessageSquare size={20} className="text-violet-400" />
            Reviews
          </h1>
          {game && (
            <Link href={`/game/${rawgId}`} className="text-sm text-gray-400 hover:text-violet-400 transition-colors">
              {game.name}
            </Link>
          )}
        </div>
      </div>

      {isLoading && <div className="text-gray-500 text-sm py-8 text-center">Loading...</div>}

      {!isLoading && reviews.length === 0 && (
        <div className="text-center py-20 text-gray-500 bg-white/5 backdrop-blur-sm border border-white/8 rounded-2xl">
          <MessageSquare size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium text-gray-300">No reviews yet</p>
          <p className="text-sm mt-1">Be the first to review this game.</p>
        </div>
      )}

      <div className="space-y-4">
        {reviews.map((r) => (
          <div key={r.id} className="bg-white/5 backdrop-blur-sm border border-white/8 rounded-2xl p-5 space-y-3">
            {/* Reviewer info */}
            <div className="flex items-center justify-between gap-3">
              <Link
                href={`/user/${r.user.username}`}
                className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
              >
                <Avatar src={r.user.avatar} username={r.user.username} size="sm" />
                <div>
                  <p className="text-sm font-semibold text-white">{r.user.username}</p>
                  <p className="text-xs text-gray-500">{formatDistanceToNow(r.updatedAt)}</p>
                </div>
              </Link>
              <div className="flex items-center gap-2 shrink-0">
                <StatusBadge status={r.status as GameStatus} />
                {r.platform && (
                  <span className="flex items-center gap-1 text-xs text-gray-500 bg-white/8 px-2 py-0.5 rounded-full">
                    <Monitor size={10} />
                    {r.platform}
                  </span>
                )}
              </div>
            </div>

            {/* Rating */}
            {r.rating != null && (
              <div className="flex items-center gap-1.5">
                {Array.from({ length: 10 }).map((_, i) => (
                  <Star
                    key={i}
                    size={14}
                    className={i < r.rating! ? "text-yellow-400" : "text-gray-700"}
                    fill={i < r.rating! ? "currentColor" : "none"}
                  />
                ))}
                <span className="text-yellow-400 text-sm font-bold ml-1">{r.rating}/10</span>
              </div>
            )}

            {/* Review text */}
            <MarkdownReview text={r.review} className="text-gray-300 text-sm leading-relaxed" />
          </div>
        ))}
      </div>
    </div>
  );
}
