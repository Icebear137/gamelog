"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MessageSquare, Clock, ThumbsUp } from "lucide-react";
import { GameReview } from "@/lib/types";
import { gx } from "@/lib/gx-styles";
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
    <div className="flex flex-col gap-5 max-w-170 mx-auto">
      {/* Header + sort */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
        <div>
          <p className={gx.eyebrow} style={{ marginBottom: 4 }}>Community</p>
          <h1 className={`${gx.sectionLabel} flex items-center gap-2`} style={{ fontSize: 26 }}>
            <MessageSquare size={20} style={{ color: "var(--gx-amber)" }} />
            Reviews
          </h1>
          <p style={{ fontSize: 13, color: "var(--gx-text-2)", marginTop: 4 }}>
            Recent reviews from the GameLog community.
          </p>
        </div>

        <div className="flex gap-1 bg-gx-surface border border-gx-border rounded-xl p-1 w-fit" style={{ flexShrink: 0 }}>
          {([
            { key: "recent"  as Sort, label: "Recent",       icon: <Clock size={12} /> },
            { key: "helpful" as Sort, label: "Most Helpful",  icon: <ThumbsUp size={12} /> },
          ]).map((o) => (
            <button
              key={o.key}
              onClick={() => setSort(o.key)}
              data-active={sort === o.key}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.75 rounded-lg text-[12px] font-semibold bg-transparent border-none text-gx-text-2 cursor-pointer transition-[background,color] whitespace-nowrap data-[active=true]:bg-gx-amber data-[active=true]:text-gx-ink not-data-[active=true]:hover:text-gx-text-1 not-data-[active=true]:hover:bg-white/4"
            >
              {o.icon} {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-gx-surface border border-gx-border rounded-[14px] px-5 py-4.5 transition-colors flex flex-col gap-2.5 hover:border-gx-border-md" style={{ height: 140, opacity: 0.35 }} />
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && reviews.length === 0 && (
        <div style={{ textAlign: "center", padding: "56px 24px", background: "var(--gx-surface)", border: "1px solid var(--gx-border)", borderRadius: 14 }}>
          <MessageSquare size={36} style={{ margin: "0 auto 10px", opacity: 0.18, color: "var(--gx-text-3)", display: "block" }} />
          <p style={{ fontSize: 13, color: "var(--gx-text-3)" }}>No reviews yet. Be the first!</p>
        </div>
      )}

      {/* Review list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {reviews.map((r) => (
          <ReviewCard key={r.id} review={r} showGame queryKey={queryKey} />
        ))}
      </div>
    </div>
  );
}
