"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowLeft, MessageSquare } from "lucide-react";
import Link from "next/link";
import { Heading, Text, Flex } from "@radix-ui/themes";
import { api } from "@/lib/api";
import { GameReview } from "@/lib/types";
import { ReviewCard } from "@/components/ReviewCard";

export default function UserReviewsPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);
  const router = useRouter();

  const queryKey = ["user-reviews", username];
  const { data: reviews = [], isLoading } = useQuery<GameReview[]>({
    queryKey,
    queryFn: () => api.get(`/api/users/${username}/reviews`).then((r) => r.data),
  });

  return (
    <div className="max-w-2xl mx-auto space-y-5">
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
            {reviews.length > 0 && (
              <span className="text-gray-500 font-normal text-base">({reviews.length})</span>
            )}
          </Heading>
          <Link href={`/user/${username}`} className="text-sm text-gray-400 hover:text-violet-400 transition-colors">
            {username}
          </Link>
        </div>
      </Flex>

      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white/5 border border-white/8 rounded-2xl p-5 h-36 animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && reviews.length === 0 && (
        <div className="text-center py-20 bg-white/5 border border-white/8 rounded-2xl">
          <MessageSquare size={40} className="mx-auto mb-3 opacity-30 text-gray-500" />
          <Text as="p" size="2" color="gray">No reviews yet.</Text>
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
