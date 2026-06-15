"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Activity, ActivityType } from "@/lib/types";
import { getGlobalFeedService } from "@/services/activity.service";
import Avatar from "@/components/Avatar";
import { formatDistanceToNow } from "@/lib/utils";
import ErrorBoundary from "@/components/ErrorBoundary";

const FIVE_MINUTES = 5 * 60 * 1000;

const VERB: Record<ActivityType, string> = {
  STARTED:           "started",
  COMPLETED:         "completed",
  DROPPED:           "dropped",
  RATED:             "rated",
  ADDED_TO_WISHLIST: "wishlisted",
};

function PulseItem({ activity }: { activity: Activity }) {
  const router = useRouter();
  const { gameEntry, user } = activity;
  const game = gameEntry.game;

  return (
    <div className="flex items-center gap-2.25 px-4 py-2.25 transition-colors hover:bg-white/2.5">
      <div>
        <button
          onClick={() => router.push(`/user/${user.username}`)}
          aria-label={`View ${user.username}`}
        >
          <Avatar src={user.avatar} username={user.username} size="xs" />
        </button>
      </div>
      <p className="flex-1 min-w-0 font-outfit text-[12px] leading-[1.45] text-gl-subtext">
        <button
          className="font-semibold text-gl-text cursor-pointer transition-colors hover:text-gx-amber"
          onClick={() => router.push(`/user/${user.username}`)}
        >
          {user.username}
        </button>
        {" "}
        <span>{VERB[activity.type]}</span>
        {" "}
        <button
          className="text-gl-violet-light font-medium cursor-pointer transition-colors hover:underline hover:text-gx-amber"
          onClick={() => router.push(`/game/${game.rawgId}`)}
        >
          {game.name}
        </button>
        {gameEntry.rating && (
          <span className="font-bold text-gl-amber"> ★{gameEntry.rating}</span>
        )}
      </p>
      <span className="font-outfit text-[10px] text-gl-muted shrink-0 whitespace-nowrap">{formatDistanceToNow(activity.createdAt)}</span>
    </div>
  );
}

export default function GlobalActivity() {
  const { data: global = [] } = useQuery<Activity[]>({
    queryKey: ["feed-global"],
    queryFn: () => getGlobalFeedService(),
    staleTime: FIVE_MINUTES,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });

  return (
    <div className="bg-gl-surface border border-gl-border rounded-[14px] overflow-hidden sticky top-20 will-change-transform">
      {/* Header */}
      <div className="px-4 py-3.5 pb-3 border-b border-gl-border flex items-center justify-between">
        <h2 className="font-bebas text-[20px] tracking-[0.07em] text-gx-text-1 flex items-center gap-2.25 m-0" style={{ fontSize: 17 }}>
          Global Pulse
        </h2>
        <div className="flex items-center gap-1.5 font-outfit text-[10px] font-bold tracking-[0.14em] uppercase text-[#4ade80]">
          <div className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-pulse-blink" />
          Live
        </div>
      </div>

      {/* Items */}
      <ErrorBoundary>
        <div className="py-1">
          {global.slice(0, 10).map((a) => (
            <PulseItem key={a.id} activity={a} />
          ))}
          {global.length === 0 && (
            <div className="flex flex-col items-center justify-center py-14 px-4 gap-3 font-outfit text-sm text-gl-muted text-center" style={{ padding: "32px 16px" }}>
              No activity yet
            </div>
          )}
        </div>
      </ErrorBoundary>
    </div>
  );
}
