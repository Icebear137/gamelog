"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, Gamepad2, Users, Sparkles, Tag } from "lucide-react";
import Link from "next/link";
import { Text, Heading, Flex } from "@radix-ui/themes";
import { useAuth } from "@/lib/auth-context";
import { getTrendingGamesService, getRecommendationsService, getPopularTagsService } from "@/services/game.service";
import { discoverUsersService } from "@/services/user.service";
import TrendingGameCard, {
  type TrendingGame,
} from "./_components/TrendingGameCard";
import SuggestedUserCard, {
  type SuggestedUser,
} from "./_components/SuggestedUserCard";
import RecommendedGameCard, {
  type RecommendedGame,
} from "./_components/RecommendedGameCard";

const FIVE_MINUTES = 5 * 60 * 1000;

export default function DiscoverPage() {
  const { user } = useAuth();

  const { data: trending = [], isLoading } = useQuery<TrendingGame[]>({
    queryKey: ["trending"],
    queryFn: () => getTrendingGamesService(),
    staleTime: FIVE_MINUTES,
  });

  const { data: suggested = [] } = useQuery<SuggestedUser[]>({
    queryKey: ["discover-people"],
    queryFn: () => discoverUsersService(),
    enabled: !!user,
    staleTime: FIVE_MINUTES,
  });

  const { data: recommendations = [] } = useQuery<RecommendedGame[]>({
    queryKey: ["recommendations"],
    queryFn: () => getRecommendationsService(),
    enabled: !!user,
    staleTime: FIVE_MINUTES,
  });

  const { data: popularTags = [] } = useQuery<{ tag: string; votes: number }[]>({
    queryKey: ["popular-tags"],
    queryFn: () => getPopularTagsService(),
    staleTime: 5 * 60_000,
  });

  const MAX_VISIBLE = 8;
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());
  const handleDismiss = useCallback((rawgId: number) => {
    setDismissed((prev) => new Set([...prev, rawgId]));
  }, []);
  const visibleRecs = recommendations
    .filter((g) => !dismissed.has(g.rawgId))
    .slice(0, MAX_VISIBLE);

  return (
    <Flex direction="column" className="space-y-10">
      <section>
        <Flex align="center" gap="2" className="mb-6">
          <TrendingUp size={22} className="text-violet-400" />
          <Heading size="6">Trending This Week</Heading>
        </Flex>

        {isLoading && (
          <Text as="p" size="2" color="gray">
            Loading...
          </Text>
        )}

        {!isLoading && trending.length === 0 && (
          <div className="text-center py-16 text-gray-500">
            <Gamepad2 size={40} className="mx-auto mb-3 opacity-30" />
            <Text as="p">
              No trending games yet. Add some games to your library!
            </Text>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {trending.map((game, i) => (
            <TrendingGameCard
              key={game.id}
              game={game}
              rank={i + 1}
              showButton={!!user}
            />
          ))}
        </div>
      </section>

      {user && visibleRecs.length > 0 && (
        <section>
          <Flex align="center" gap="2" className="mb-2">
            <Sparkles size={20} className="text-violet-400" />
            <Heading size="5" as="h2">
              Recommended For You
            </Heading>
          </Flex>
          <Text as="p" size="2" color="gray" className=" pb-4">
            Based on the genres you play most
          </Text>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {visibleRecs.map((game) => (
              <RecommendedGameCard
                key={game.rawgId}
                game={game}
                onDismiss={handleDismiss}
              />
            ))}
          </div>
        </section>
      )}

      {popularTags.length > 0 && (
        <section>
          <Flex align="center" gap="2" className="mb-4">
            <Tag size={20} className="text-violet-400" />
            <Heading size="5" as="h2">Browse by Tag</Heading>
          </Flex>
          <div className="flex flex-wrap gap-2">
            {popularTags.map(({ tag, votes }) => (
              <Link
                key={tag}
                href={`/games/tag/${tag}`}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-violet-500/15 border border-white/10 hover:border-violet-500/40 rounded-full text-sm text-gray-300 hover:text-violet-300 transition-colors"
              >
                {tag}
                <span className="text-xs text-gray-600">{votes}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {user && suggested.length > 0 && (
        <section>
          <Flex align="center" gap="2" className="mb-2">
            <Users size={20} className="text-violet-400" />
            <Heading size="5" as="h2">
              People You Might Know
            </Heading>
          </Flex>
          <Text as="p" size="2" color="gray" className="pb-4">
            Based on games in common with you
          </Text>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {suggested.map((su) => (
              <SuggestedUserCard key={su.id} user={su} />
            ))}
          </div>
        </section>
      )}
    </Flex>
  );
}
