"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Star, MessageSquare, ArrowLeft, Monitor } from "lucide-react";
import Link from "next/link";
import { Text, Heading, Flex, Box } from "@radix-ui/themes";
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
      <Flex align="center" gap="3">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/8 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <Heading size="5" className="flex items-center gap-2">
            <MessageSquare size={20} className="text-violet-400" />
            Reviews
          </Heading>
          {game && (
            <Link href={`/game/${rawgId}`} className="text-sm text-gray-400 hover:text-violet-400 transition-colors">
              {game.name}
            </Link>
          )}
        </div>
      </Flex>

      {isLoading && (
        <Box className="py-8 text-center">
          <Text size="2" color="gray">Loading...</Text>
        </Box>
      )}

      {!isLoading && reviews.length === 0 && (
        <div className="text-center py-20 bg-white/5 backdrop-blur-sm border border-white/8 rounded-2xl">
          <MessageSquare size={40} className="mx-auto mb-3 opacity-30 text-gray-500" />
          <Text as="p" size="2" color="gray" className="font-medium">No reviews yet</Text>
          <Text as="p" size="2" color="gray" className="mt-1">Be the first to review this game.</Text>
        </div>
      )}

      <div className="space-y-4">
        {reviews.map((r) => (
          <div key={r.id} className="bg-white/5 backdrop-blur-sm border border-white/8 rounded-2xl p-5 space-y-3">
            {/* Reviewer info */}
            <Flex align="center" justify="between" gap="3">
              <Link
                href={`/user/${r.user.username}`}
                className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
              >
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
              <Flex align="center" gap="1" className="gap-1.5">
                {Array.from({ length: 10 }).map((_, i) => (
                  <Star
                    key={i}
                    size={14}
                    className={i < r.rating! ? "text-yellow-400" : "text-gray-700"}
                    fill={i < r.rating! ? "currentColor" : "none"}
                  />
                ))}
                <span className="text-yellow-400 text-sm font-bold ml-1">{r.rating}/10</span>
              </Flex>
            )}

            {/* Review text */}
            <MarkdownReview text={r.review} className="text-gray-300 text-sm leading-relaxed" />
          </div>
        ))}
      </div>
    </div>
  );
}
