"use client";

import { useQuery } from "@tanstack/react-query";
import { TrendingUp } from "lucide-react";
import { Heading, Flex } from "@radix-ui/themes";
import { Activity } from "@/lib/types";
import { getGlobalFeedService } from "@/services/activity.service";
import ActivityCard from "@/components/ActivityCard";
import ErrorBoundary from "@/components/ErrorBoundary";

const FIVE_MINUTES = 5 * 60 * 1000;

export default function GlobalActivity() {
  const { data: global = [] } = useQuery<Activity[]>({
    queryKey: ["feed-global"],
    queryFn: () => getGlobalFeedService(),
    staleTime: FIVE_MINUTES,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });

  return (
    <Flex direction="column" gap="4">
      <div className="flex items-center h-10">
        <Heading size="4" as="h2" className="flex items-center gap-2">
          <TrendingUp size={18} className="text-violet-400" />
          Global Activity
        </Heading>
      </div>
      <ErrorBoundary>
        {global.slice(0, 8).map((a) => (
          <ActivityCard key={a.id} activity={a} />
        ))}
      </ErrorBoundary>
    </Flex>
  );
}
