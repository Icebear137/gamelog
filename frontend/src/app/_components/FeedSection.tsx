"use client";

import { useMemo, useEffect, useRef } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { Gamepad2, Loader2, ArrowUp } from "lucide-react";
import { Text, Heading, Flex, Box } from "@radix-ui/themes";
import { api } from "@/lib/api";
import { Activity } from "@/lib/types";
import { useRealtimeStore } from "@/lib/stores/realtime";
import ActivityCard from "@/components/ActivityCard";
import AddGameModal from "@/components/AddGameModal";
import ErrorBoundary from "@/components/ErrorBoundary";

const FIVE_MINUTES = 5 * 60 * 1000;

export default function FeedSection() {
  const qc = useQueryClient();
  const { feedHasNew, newFeedCount, clearFeedNew } = useRealtimeStore();

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery<Activity[]>({
      queryKey: ["feed"],
      queryFn: ({ pageParam }) =>
        api.get(`/api/feed?page=${pageParam}`).then((r) => r.data),
      initialPageParam: 1,
      getNextPageParam: (lastPage, pages) =>
        lastPage.length === 20 ? pages.length + 1 : undefined,
      staleTime: FIVE_MINUTES,
    });

  function handleLoadNew() {
    clearFeedNew();
    // Reset to page 1 and refetch fresh
    qc.resetQueries({ queryKey: ["feed"] });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const feed = useMemo(() => data?.pages.flat() ?? [], [data]);

  // Sentinel div — khi nào nó vào viewport thì tự động load trang tiếp
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
      { rootMargin: "200px" } // trigger 200px trước khi chạm đáy
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <Flex direction="column" gap="4">
      <div className="flex items-center justify-between h-10">
        <Heading size="4" as="h2">Following Feed</Heading>
        <AddGameModal />
      </div>

      {/* Real-time "new posts" banner */}
      {feedHasNew && (
        <button
          onClick={handleLoadNew}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-600/15 border border-violet-600/40 text-violet-400 text-sm font-medium hover:bg-violet-600/25 transition-colors animate-pulse"
        >
          <ArrowUp size={15} />
          {newFeedCount > 1 ? `${newFeedCount} new posts` : "New post"} — click to load
        </button>
      )}

      {isLoading && <Text as="p" size="2" color="gray">Loading feed...</Text>}

      {!isLoading && feed.length === 0 && (
        <Box className="text-center py-16">
          <Gamepad2 size={40} className="mx-auto mb-3 opacity-30 text-gray-500" />
          <Text as="p" size="2" color="gray">Nothing here yet. Follow some players or add games to your library!</Text>
        </Box>
      )}

      <ErrorBoundary>
        {feed.map((a) => (
          <ActivityCard key={a.id} activity={a} />
        ))}
      </ErrorBoundary>

      {/* Sentinel — invisible div, trigger load khi scroll đến */}
      <div ref={sentinelRef} className="h-1" />

      {isFetchingNextPage && (
        <Flex align="center" justify="center" gap="2" py="4">
          <Loader2 size={15} className="animate-spin text-gray-500" />
          <Text size="2" color="gray">Loading more...</Text>
        </Flex>
      )}
    </Flex>
  );
}
