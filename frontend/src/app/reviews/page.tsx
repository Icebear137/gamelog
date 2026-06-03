"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MessageSquare, Clock, ThumbsUp } from "lucide-react";
import { Heading, Text, Flex, Box } from "@radix-ui/themes";
import { GameReview } from "@/lib/types";
import { getGlobalReviewsService } from "@/services/game.service";
import { ReviewCard } from "@/components/ReviewCard";

type Sort = "recent" | "helpful";

export default function ReviewsPage() {
  const [sort, setSort] = useState<Sort>("recent");

  const queryKey = ["reviews-global", sort];
  const { data: reviews = [], isLoading } = useQuery<GameReview[]>({
    queryKey,
    queryFn: () => getGlobalReviewsService(sort),
    staleTime: 2 * 60_000,
  });

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <Flex align="center" justify="between" className="flex-wrap gap-3">
        <Box>
          <Heading size="6" className="flex items-center gap-2">
            <MessageSquare size={22} className="text-violet-400" />
            Community Reviews
          </Heading>
          <Text as="p" size="2" color="gray" className="mt-1">
            Recent reviews from the GameLog community.
          </Text>
        </Box>

        {/* Sort */}
        <div className="flex gap-1">
          {([
            { key: "recent",  label: "Recent",       icon: <Clock size={13} /> },
            { key: "helpful", label: "Most Helpful",  icon: <ThumbsUp size={13} /> },
          ] as { key: Sort; label: string; icon: React.ReactNode }[]).map((o) => (
            <button
              key={o.key}
              onClick={() => setSort(o.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                sort === o.key ? "bg-violet-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
              }`}
            >
              {o.icon} {o.label}
            </button>
          ))}
        </div>
      </Flex>

      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white/5 border border-white/8 rounded-2xl p-5 animate-pulse h-36" />
          ))}
        </div>
      )}

      {!isLoading && reviews.length === 0 && (
        <div className="text-center py-20 bg-white/5 border border-white/8 rounded-2xl">
          <MessageSquare size={40} className="mx-auto mb-3 opacity-30 text-gray-500" />
          <Text as="p" size="2" color="gray">No reviews yet. Be the first!</Text>
        </div>
      )}

      <div className="space-y-4">
        {reviews.map((r) => (
          <ReviewCard key={r.id} review={r} showGame queryKey={queryKey} />
        ))}
      </div>
    </div>
  );
}
