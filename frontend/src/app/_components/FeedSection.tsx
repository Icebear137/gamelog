"use client";

import { useMemo, useEffect, useRef } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { Gamepad2, Loader2, ArrowUp, Rss, Plus } from "lucide-react";
import { Activity } from "@/lib/types";
import { getFeedService } from "@/services/activity.service";
import { useRealtimeStore } from "@/lib/stores/realtime";
import ActivityCard from "@/components/ActivityCard";
import AddGameModal from "@/components/AddGameModal";
import ErrorBoundary from "@/components/ErrorBoundary";

const FIVE_MINUTES = 5 * 60 * 1000;

export default function FeedSection() {
  const qc = useQueryClient();
  const feedHasNew = useRealtimeStore((s) => s.feedHasNew);
  const newFeedCount = useRealtimeStore((s) => s.newFeedCount);
  const clearFeedNew = useRealtimeStore((s) => s.clearFeedNew);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery<Activity[]>({
      queryKey: ["feed"],
      queryFn: ({ pageParam }) => getFeedService(pageParam as number),
      initialPageParam: 1,
      getNextPageParam: (lastPage, pages) =>
        lastPage.length === 20 ? pages.length + 1 : undefined,
      staleTime: FIVE_MINUTES,
    });

  function handleLoadNew() {
    clearFeedNew();
    qc.resetQueries({ queryKey: ["feed"] });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const feed = useMemo(() => data?.pages.flat() ?? [], [data]);

  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="hm-section-head">
        <h2 className="hm-section-label">
          <Rss size={16} className="text-violet-400" />
          Following Feed
        </h2>
        <AddGameModal />
      </div>

      {/* New posts banner */}
      {feedHasNew && (
        <button className="hm-new-banner" onClick={handleLoadNew}>
          <ArrowUp size={14} />
          {newFeedCount > 1 ? `${newFeedCount} new posts` : "New post"} — click to refresh
        </button>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="hm-loader">
          <Loader2 size={16} className="animate-spin" />
          Loading feed…
        </div>
      )}

      {/* Empty */}
      {!isLoading && feed.length === 0 && (
        <div className="hm-empty">
          <Gamepad2 size={36} color="rgba(255,255,255,0.12)" />
          <p>Nothing here yet.</p>
          <p style={{ fontSize: 12 }}>Follow some players or add games to your library!</p>
        </div>
      )}

      {/* Feed */}
      <ErrorBoundary>
        {feed.map((a) => (
          <ActivityCard key={a.id} activity={a} />
        ))}
      </ErrorBoundary>

      <div ref={sentinelRef} className="h-1" />

      {isFetchingNextPage && (
        <div className="hm-fetch-more">
          <Loader2 size={14} className="animate-spin" />
          Loading more…
        </div>
      )}
    </div>
  );
}
