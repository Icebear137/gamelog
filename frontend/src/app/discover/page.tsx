"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, Gamepad2, Users, Sparkles, Tag } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
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
    <div className="gx-dc-page">

      {/* ── TRENDING ── */}
      <section>
        <div className="gx-dc-section-head">
          <p className="gx-eyebrow" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <TrendingUp size={11} /> This Week
          </p>
          <h2 className="gx-dc-section-title">Trending Games</h2>
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

        <div className="gx-trending-grid">
          {trending.map((game, i) => (
            <TrendingGameCard key={game.id} game={game} rank={i + 1} showButton={!!user} />
          ))}
        </div>
      </section>

      {/* ── RECOMMENDED ── */}
      {user && visibleRecs.length > 0 && (
        <section>
          <div className="gx-dc-section-head">
            <p className="gx-eyebrow" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Sparkles size={11} /> Picked For You
            </p>
            <h2 className="gx-dc-section-title">Recommended</h2>
            <p className="gx-dc-section-sub">Based on the genres you play most</p>
          </div>
          <div className="gx-rec-grid">
            {visibleRecs.map((game) => (
              <RecommendedGameCard key={game.rawgId} game={game} onDismiss={handleDismiss} />
            ))}
          </div>
        </section>
      )}

      {/* ── TAGS ── */}
      {popularTags.length > 0 && (
        <section>
          <div className="gx-dc-section-head">
            <p className="gx-eyebrow" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Tag size={11} /> Browse
            </p>
            <h2 className="gx-dc-section-title">Popular Tags</h2>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {popularTags.map(({ tag, votes }) => (
              <Link key={tag} href={`/games/tag/${tag}`} className="gx-tag-pill">
                {tag}
                <span className="gx-tag-pill-count">{votes}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── PEOPLE ── */}
      {user && suggested.length > 0 && (
        <section>
          <div className="gx-dc-section-head">
            <p className="gx-eyebrow" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Users size={11} /> Connect
            </p>
            <h2 className="gx-dc-section-title">People You Might Know</h2>
            <p className="gx-dc-section-sub">Based on games in common with you</p>
          </div>
          <div className="gx-people-grid">
            {suggested.map((su) => (
              <SuggestedUserCard key={su.id} user={su} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
