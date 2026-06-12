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
    <div className="hm-pulse-item">
      <div className="hm-pulse-avatar">
        <button
          onClick={() => router.push(`/user/${user.username}`)}
          aria-label={`View ${user.username}`}
        >
          <Avatar src={user.avatar} username={user.username} size="xs" />
        </button>
      </div>
      <p className="hm-pulse-text">
        <button
          className="hm-pulse-username"
          onClick={() => router.push(`/user/${user.username}`)}
        >
          {user.username}
        </button>
        {" "}
        <span>{VERB[activity.type]}</span>
        {" "}
        <button
          className="hm-pulse-game"
          onClick={() => router.push(`/game/${game.rawgId}`)}
        >
          {game.name}
        </button>
        {gameEntry.rating && (
          <span className="hm-pulse-rating"> ★{gameEntry.rating}</span>
        )}
      </p>
      <span className="hm-pulse-meta">{formatDistanceToNow(activity.createdAt)}</span>
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
    <div className="hm-pulse-card">
      {/* Header */}
      <div className="hm-pulse-top">
        <h2 className="hm-section-label" style={{ fontSize: 17 }}>
          Global Pulse
        </h2>
        <div className="hm-pulse-live">
          <div className="hm-pulse-dot" />
          Live
        </div>
      </div>

      {/* Items */}
      <ErrorBoundary>
        <div className="hm-pulse-items">
          {global.slice(0, 10).map((a) => (
            <PulseItem key={a.id} activity={a} />
          ))}
          {global.length === 0 && (
            <div className="hm-empty" style={{ padding: "32px 16px" }}>
              No activity yet
            </div>
          )}
        </div>
      </ErrorBoundary>
    </div>
  );
}
