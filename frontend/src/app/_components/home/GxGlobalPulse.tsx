"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Activity, ActivityType } from "@/lib/types";
import { getGlobalFeedService } from "@/services/activity.service";
import Avatar from "@/components/Avatar";
import { formatDistanceToNow } from "@/lib/utils";

const VERB: Record<ActivityType, string> = {
  STARTED:           "started",
  COMPLETED:         "completed",
  DROPPED:           "dropped",
  RATED:             "rated",
  ADDED_TO_WISHLIST: "wishlisted",
};

export default function GxGlobalPulse() {
  const router = useRouter();

  const { data: activities = [] } = useQuery<Activity[]>({
    queryKey: ["feed-global"],
    queryFn: () => getGlobalFeedService(),
    staleTime: 5 * 60_000,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-1.5 px-1 mb-1">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-pulse-blink" />
        <span className="font-bebas text-[15px] tracking-[0.07em] text-gx-text-1 m-0 p-0">
          Global Pulse
        </span>
        <span className="ml-auto text-[9px] font-bold tracking-widest text-[#4ade80]">
          LIVE
        </span>
      </div>

      {/* Items */}
      {activities.length === 0 && (
        <p className="text-[11px] text-gx-text-3 px-1 py-1.5">
          No activity yet
        </p>
      )}
      {activities.slice(0, 8).map((a) => (
        <div
          key={a.id}
          className="flex items-start gap-1.75 px-1 py-1.5 rounded-lg transition-colors hover:bg-gx-surface-2"
        >
          <button
            onClick={() => router.push(`/user/${a.user.username}`)}
            className="shrink-0 bg-none border-none cursor-pointer p-0"
          >
            <Avatar src={a.user.avatar} username={a.user.username} size="xs" />
          </button>
          <div className="flex-1 min-w-0 text-[11px] leading-normal text-gx-text-2">
            <button
              className="bg-none border-none cursor-pointer p-0 text-[11px] font-bold text-gx-text-1 transition-colors hover:text-gx-amber"
              onClick={() => router.push(`/user/${a.user.username}`)}
            >
              {a.user.username}
            </button>
            {" "}
            <span>{VERB[a.type]}</span>
            {" "}
            <button
              className="bg-none border-none cursor-pointer p-0 text-[11px] font-medium text-gx-teal transition-colors hover:underline"
              onClick={() => router.push(`/game/${a.gameEntry.game.rawgId}`)}
            >
              {a.gameEntry.game.name}
            </button>
            {a.gameEntry.rating != null && (
              <span className="font-bold text-gl-amber ml-0.75">★{a.gameEntry.rating}</span>
            )}
          </div>
          <span className="text-[10px] text-gx-text-3 whitespace-nowrap shrink-0 pt-px">
            {formatDistanceToNow(a.createdAt)}
          </span>
        </div>
      ))}
    </div>
  );
}
