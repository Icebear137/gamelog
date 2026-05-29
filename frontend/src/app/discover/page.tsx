"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, Gamepad2, Users, Sparkles } from "lucide-react";
import { Text, Heading, Flex } from "@radix-ui/themes";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
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
    queryFn: () => api.get("/api/games/trending").then((r) => r.data),
    staleTime: FIVE_MINUTES,
  });

  const { data: suggested = [] } = useQuery<SuggestedUser[]>({
    queryKey: ["discover-people"],
    queryFn: () => api.get("/api/users/discover").then((r) => r.data),
    enabled: !!user,
    staleTime: FIVE_MINUTES,
  });

  const { data: recommendations = [] } = useQuery<RecommendedGame[]>({
    queryKey: ["recommendations"],
    queryFn: () => api.get("/api/games/recommendations").then((r) => r.data),
    enabled: !!user,
    staleTime: FIVE_MINUTES,
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
