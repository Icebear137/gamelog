"use client";

import { use, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { MessageSquare, ArrowLeft, Clock, ThumbsUp } from "lucide-react";
import Link from "next/link";
import { gx } from "@/lib/gx-styles";
import { GameReview } from "@/lib/types";
import { getGameService, getGameReviewsService } from "@/services/game.service";
import { ReviewCard } from "@/components/ReviewCard";

type Sort = "recent" | "helpful";
interface GameBasic { name: string; rawgId: number }

export default function GameReviewsPage({ params }: { params: Promise<{ rawgId: string }> }) {
  const { rawgId } = use(params);
  const router = useRouter();
  const [sort, setSort] = useState<Sort>("recent");

  const { data: game } = useQuery<GameBasic>({
    queryKey: ["game", rawgId],
    queryFn: () => getGameService(parseInt(rawgId)),
    staleTime: 5 * 60_000,
  });

  const queryKey = ["game-reviews", rawgId, sort];
  const { data: reviews = [], isLoading } = useQuery<GameReview[]>({
    queryKey,
    queryFn: () => getGameReviewsService(parseInt(rawgId), sort),
  });

  return (
    <div className="flex flex-col gap-5 max-w-170 mx-auto">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button className={gx.backBtn} onClick={() => router.back()}>
          <ArrowLeft size={14} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 className="gx-section-label" style={{ fontSize: 22, display: "flex", alignItems: "center", gap: 8 }}>
            <MessageSquare size={17} style={{ color: "var(--gx-amber)" }} />
            Reviews
            {reviews.length > 0 && (
              <span style={{ fontFamily: "inherit", fontSize: 13, color: "var(--gx-text-3)", fontWeight: 400, marginLeft: 4 }}>
                ({reviews.length})
              </span>
            )}
          </h1>
          {game && (
            <Link
              href={`/game/${rawgId}`}
              style={{ fontSize: 12, color: "var(--gx-text-3)", textDecoration: "none", transition: "color 0.15s" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--gx-amber)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--gx-text-3)")}
            >
              {game.name}
            </Link>
          )}
        </div>

        {/* Sort */}
        <div className="flex gap-1 bg-gx-surface border border-gx-border rounded-xl p-1 w-fit" style={{ flexShrink: 0 }}>
          {([
            { key: "recent"  as Sort, label: "Recent",  icon: <Clock size={11} /> },
            { key: "helpful" as Sort, label: "Helpful", icon: <ThumbsUp size={11} /> },
          ]).map((o) => (
            <button
              key={o.key}
              onClick={() => setSort(o.key)}
              data-active={sort === o.key}
              style={{ padding: "5px 12px", fontSize: 11 }}
              className="inline-flex items-center gap-1.5 rounded-lg font-semibold bg-transparent border-none text-gx-text-2 cursor-pointer transition-[background,color] whitespace-nowrap data-[active=true]:bg-gx-amber data-[active=true]:text-gx-ink not-data-[active=true]:hover:text-gx-text-1 not-data-[active=true]:hover:bg-white/4"
            >
              {o.icon} {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div style={{ textAlign: "center", padding: "32px 0", fontSize: 13, color: "var(--gx-text-3)" }}>
          Loading…
        </div>
      )}

      {/* Empty */}
      {!isLoading && reviews.length === 0 && (
        <div style={{ textAlign: "center", padding: "56px 24px", background: "var(--gx-surface)", border: "1px solid var(--gx-border)", borderRadius: 14 }}>
          <MessageSquare size={32} style={{ margin: "0 auto 10px", opacity: 0.18, color: "var(--gx-text-3)", display: "block" }} />
          <p style={{ fontSize: 13, color: "var(--gx-text-3)" }}>No reviews yet. Be the first to review this game.</p>
        </div>
      )}

      {/* Review list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {reviews.map((r) => (
          <ReviewCard key={r.id} review={r} queryKey={queryKey} />
        ))}
      </div>
    </div>
  );
}
