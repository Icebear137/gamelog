"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { gx } from "@/lib/gx-styles";
import { getRecommendationsService } from "@/services/game.service";
import RecommendedGameCard, {
  type RecommendedGame,
} from "@/app/discover/_components/RecommendedGameCard";

const FIVE_MIN = 5 * 60_000;

export default function RecommendedSection() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());

  const { data: recs = [] } = useQuery<RecommendedGame[]>({
    queryKey: ["recommendations"],
    queryFn: getRecommendationsService,
    enabled: !!user,
    staleTime: FIVE_MIN,
  });

  const handleDismiss = useCallback((rawgId: number) => {
    setDismissed((prev) => new Set([...prev, rawgId]));
  }, []);

  const visible = recs.filter((g) => !dismissed.has(g.rawgId)).slice(0, 4);

  if (!user || visible.length === 0) return null;

  return (
    <section>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <p className={gx.eyebrow} style={{ display: "flex", alignItems: "center", gap: 5, margin: 0 }}>
          <Sparkles size={10} /> Picked For You
        </p>
        <h2
          style={{
            fontFamily: "\"Bebas Neue\", sans-serif",
            fontSize: 18, letterSpacing: "0.04em",
            color: "var(--gx-text-1)", margin: 0,
          }}
        >
          Recommended
        </h2>
      </div>
      <div className="grid grid-cols-2 gap-2.5 max-[540px]:grid-cols-1">
        {visible.map((g) => (
          <RecommendedGameCard key={g.rawgId} game={g} onDismiss={handleDismiss} />
        ))}
      </div>
    </section>
  );
}
