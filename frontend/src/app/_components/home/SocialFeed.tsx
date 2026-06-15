"use client";

import { useMemo, useEffect, useRef } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, ArrowUp, Newspaper } from "lucide-react";
import type { FeedItem } from "@/lib/types";
import { getPostFeedService } from "@/services/post.service";
import { useRealtimeStore } from "@/lib/stores/realtime";
import PostComposer from "./PostComposer";
import PostCard from "./PostCard";

const FIVE_MINUTES = 5 * 60_000;

export default function SocialFeed() {
  const qc = useQueryClient();
  const feedHasNew  = useRealtimeStore((s) => s.feedHasNew);
  const newFeedCount = useRealtimeStore((s) => s.newFeedCount);
  const clearFeedNew = useRealtimeStore((s) => s.clearFeedNew);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery<FeedItem[]>({
      queryKey: ["post-feed"],
      queryFn: ({ pageParam }) => getPostFeedService(pageParam as number),
      initialPageParam: 1,
      getNextPageParam: (lastPage, pages) =>
        lastPage.length === 20 ? pages.length + 1 : undefined,
      staleTime: FIVE_MINUTES,
    });

  function handleLoadNew() {
    clearFeedNew();
    qc.resetQueries({ queryKey: ["post-feed"] });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const posts = useMemo<FeedItem[]>(() => data?.pages.flat() ?? [], [data]);

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
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div className="flex flex-col gap-3">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <h2 className="flex items-center gap-1.5 text-[13px] font-semibold tracking-[0.04em] uppercase text-gx-text-2">
          <Newspaper size={15} />
          Social Feed
        </h2>
      </div>

      {/* Composer */}
      <PostComposer />

      {/* New posts banner */}
      {feedHasNew && (
        <button
          className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-lg cursor-pointer bg-gx-amber/12 text-gx-amber text-[12px] font-semibold transition-colors hover:bg-gx-amber/20"
          onClick={handleLoadNew}
        >
          <ArrowUp size={13} />
          {newFeedCount > 1 ? `${newFeedCount} new posts` : "New post"} — tap to refresh
        </button>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div className="flex items-center gap-1.5 text-[12px] text-gx-text-3 py-3">
          <Loader2 size={16} className="animate-spin" />
          Loading feed…
        </div>
      )}

      {/* Empty state */}
      {!isLoading && posts.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-10 text-center text-gx-text-2 text-[14px]">
          <Newspaper size={36} opacity={0.15} />
          <p>Nothing here yet.</p>
          <p style={{ fontSize: 12, opacity: 0.6 }}>
            Be the first to post, or follow more players to see their updates.
          </p>
        </div>
      )}

      {/* Post list */}
      <div className="flex flex-col gap-2.5">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>

      <div ref={sentinelRef} style={{ height: 4 }} />

      {isFetchingNextPage && (
        <div className="flex items-center gap-1.5 text-[12px] text-gx-text-3 py-3">
          <Loader2 size={14} className="animate-spin" />
          Loading more…
        </div>
      )}
    </div>
  );
}
