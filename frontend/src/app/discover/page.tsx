"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, Gamepad2, Users, Sparkles, Tag } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { gx } from "@/lib/gx-styles";
import { getTrendingGamesService, getRecommendationsService, getPopularTagsService } from "@/services/game.service";
import { discoverUsersService } from "@/services/user.service";
import TrendingGameCard, { type TrendingGame } from "./_components/TrendingGameCard";
import SuggestedUserCard, { type SuggestedUser } from "./_components/SuggestedUserCard";
import RecommendedGameCard, { type RecommendedGame } from "./_components/RecommendedGameCard";

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
    staleTime: FIVE_MINUTES,
  });

  const MAX_VISIBLE = 8;
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());
  const handleDismiss = useCallback((rawgId: number) => {
    setDismissed((prev) => new Set([...prev, rawgId]));
  }, []);
  const visibleRecs = recommendations.filter((g) => !dismissed.has(g.rawgId)).slice(0, MAX_VISIBLE);

  return (
    <div className="flex flex-col gap-9">

      {/* ── TRENDING ── */}
      <section>
        <div className="mb-[18px]">
          <p className={gx.eyebrow} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <TrendingUp size={11} /> This Week
          </p>
          <h2 className="mt-1 font-bebas text-[22px] tracking-[0.04em] text-gx-text-1">Trending Games</h2>
        </div>

        {isLoading && (
          <p style={{ fontSize: 13, color: "var(--gx-text-2)" }}>Loading…</p>
        )}

        {!isLoading && trending.length === 0 && (
          <div style={{ textAlign: "center", padding: "48px 0" }}>
            <Gamepad2 size={36} color="var(--gx-text-3)" style={{ margin: "0 auto 10px" }} />
            <p style={{ fontSize: 13, color: "var(--gx-text-2)" }}>
              No trending games yet. Add some games to your library!
            </p>
          </div>
        )}

        <div className="grid grid-cols-5 gap-3 max-[768px]:grid-cols-3 max-[480px]:grid-cols-2">
          {trending.map((game, i) => (
            <TrendingGameCard key={game.id} game={game} rank={i + 1} showButton={!!user} />
          ))}
        </div>
      </section>

      {/* ── RECOMMENDED ── */}
      {user && visibleRecs.length > 0 && (
        <section>
          <div className="mb-[18px]">
            <p className={gx.eyebrow} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Sparkles size={11} /> Picked For You
            </p>
            <h2 className="mt-1 font-bebas text-[22px] tracking-[0.04em] text-gx-text-1">Recommended</h2>
            <p className="mt-[3px] text-[12px] text-gx-text-3">Based on the genres you play most</p>
          </div>
          <div className="grid grid-cols-2 gap-2.5 max-[540px]:grid-cols-1">
            {visibleRecs.map((game) => (
              <RecommendedGameCard key={game.rawgId} game={game} onDismiss={handleDismiss} />
            ))}
          </div>
        </section>
      )}

      {/* ── TAGS ── */}
      {popularTags.length > 0 && (
        <section>
          <div className="mb-[18px]">
            <p className={gx.eyebrow} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Tag size={11} /> Browse
            </p>
            <h2 className="mt-1 font-bebas text-[22px] tracking-[0.04em] text-gx-text-1">Popular Tags</h2>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {popularTags.map(({ tag, votes }) => (
              <Link key={tag} href={`/games/tag/${tag}`} className={gx.tagPill}>
                {tag}
                <span className={gx.tagPillCount}>{votes}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── PEOPLE ── */}
      {user && suggested.length > 0 && (
        <section>
          <div className="mb-[18px]">
            <p className={gx.eyebrow} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Users size={11} /> Connect
            </p>
            <h2 className="mt-1 font-bebas text-[22px] tracking-[0.04em] text-gx-text-1">People You Might Know</h2>
            <p className="mt-[3px] text-[12px] text-gx-text-3">Based on games in common with you</p>
          </div>
          <div className="grid grid-cols-2 gap-2.5 max-[540px]:grid-cols-1">
            {suggested.map((su) => (
              <SuggestedUserCard key={su.id} user={su} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
