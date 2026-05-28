"use client";

import { useQuery } from "@tanstack/react-query";
import { TrendingUp } from "lucide-react";
import { api } from "@/lib/api";
import { Activity } from "@/lib/types";
import ActivityCard from "@/components/ActivityCard";
import ErrorBoundary from "@/components/ErrorBoundary";

const FIVE_MINUTES = 5 * 60 * 1000;

export default function GlobalActivity() {
  const { data: global = [] } = useQuery<Activity[]>({
    queryKey: ["feed-global"],
    queryFn: () => api.get("/api/feed/global").then((r) => r.data),
    staleTime: FIVE_MINUTES,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <TrendingUp size={18} className="text-violet-400" />
        Global Activity
      </h2>
      <ErrorBoundary>
        {global.slice(0, 8).map((a) => (
          <ActivityCard key={a.id} activity={a} />
        ))}
      </ErrorBoundary>
    </div>
  );
}
