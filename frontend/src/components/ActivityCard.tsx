"use client";

import { memo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Slot } from "@radix-ui/react-slot";
import { Heart, MessageCircle, Star, Clock } from "lucide-react";
import { Activity, ActivityType } from "@/lib/types";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import Avatar from "./Avatar";
import StatusBadge from "./StatusBadge";
import MarkdownReview from "./MarkdownReview";
import { formatDistanceToNow } from "@/lib/utils";

const activityLabel: Record<ActivityType, string> = {
  STARTED: "started playing",
  COMPLETED: "completed",
  DROPPED: "dropped",
  RATED: "rated",
  ADDED_TO_WISHLIST: "added to wishlist",
};

interface Props {
  activity: Activity;
}

export default memo(function ActivityCard({ activity }: Props) {
  const { user } = useAuth();
  const router = useRouter();
  const [liked, setLiked] = useState(activity.likedByMe);
  const [likeCount, setLikeCount] = useState(activity._count.likes);
  const pending = useRef(false);

  async function toggleLike() {
    if (!user || pending.current) return;
    pending.current = true;
    try {
      if (liked) {
        const res = await api.delete(`/api/activities/${activity.id}/like`);
        setLiked(false);
        setLikeCount(res.data.count);
      } else {
        const res = await api.post(`/api/activities/${activity.id}/like`);
        setLiked(true);
        setLikeCount(res.data.count);
      }
    } catch {
    } finally {
      pending.current = false;
    }
  }

  const { gameEntry } = activity;
  const game = gameEntry.game;

  return (
    <article className="bg-white/5 backdrop-blur-sm border border-white/8 rounded-xl p-4 hover:border-white/15 transition-colors">
      <div className="flex gap-3">
        <Slot
          role="link"
          tabIndex={0}
          className="cursor-pointer outline-none shrink-0"
          onClick={() => router.push(`/user/${activity.user.username}`)}
          onKeyDown={(e: React.KeyboardEvent) => {
            if (e.key === "Enter" || e.key === " ") router.push(`/user/${activity.user.username}`);
          }}
        >
          <div>
            <Avatar src={activity.user.avatar} username={activity.user.username} />
          </div>
        </Slot>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1 text-sm">
            <Slot
              role="link"
              tabIndex={0}
              className="cursor-pointer outline-none"
              onClick={() => router.push(`/user/${activity.user.username}`)}
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === "Enter" || e.key === " ") router.push(`/user/${activity.user.username}`);
              }}
            >
              <span className="font-semibold text-white hover:text-violet-400 transition-colors">
                {activity.user.username}
              </span>
            </Slot>
            <span className="text-gray-400">{activityLabel[activity.type]}</span>
            <Slot
              role="link"
              tabIndex={0}
              className="cursor-pointer outline-none"
              onClick={() => router.push(`/game/${game.rawgId}`)}
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === "Enter" || e.key === " ") router.push(`/game/${game.rawgId}`);
              }}
            >
              <span className="font-semibold text-violet-400 hover:text-violet-300 transition-colors truncate">
                {game.name}
              </span>
            </Slot>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{formatDistanceToNow(activity.createdAt)}</p>

          <div className="mt-3 flex gap-3">
            {game.coverImage && (
              <Slot
                role="link"
                tabIndex={0}
                className="cursor-pointer outline-none shrink-0"
                onClick={() => router.push(`/game/${game.rawgId}`)}
                onKeyDown={(e: React.KeyboardEvent) => {
                  if (e.key === "Enter" || e.key === " ") router.push(`/game/${game.rawgId}`);
                }}
              >
                <div>
                  <img
                    src={game.coverImage}
                    alt={game.name}
                    loading="lazy"
                    decoding="async"
                    className="w-16 h-20 object-cover rounded-lg"
                  />
                </div>
              </Slot>
            )}
            <div className="flex flex-col gap-2 items-start">
              <StatusBadge status={gameEntry.status} />
              {gameEntry.rating && (
                <div className="flex items-center gap-1 text-yellow-400 text-sm">
                  <Star size={14} fill="currentColor" />
                  <span className="font-bold">{gameEntry.rating}</span>
                  <span className="text-gray-500">/10</span>
                </div>
              )}
              {gameEntry.playtime && (
                <div className="flex items-center gap-1 text-gray-400 text-xs">
                  <Clock size={12} />
                  <span>{gameEntry.playtime}h played</span>
                </div>
              )}
              {gameEntry.review && (
                <MarkdownReview text={gameEntry.review} className="text-gray-300 text-sm line-clamp-3" />
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 mt-3">
            <button
              onClick={toggleLike}
              className={`flex items-center gap-1.5 text-sm transition-colors ${liked ? "text-red-400" : "text-gray-500 hover:text-red-400"}`}
            >
              <Heart size={16} fill={liked ? "currentColor" : "none"} />
              <span>{likeCount}</span>
            </button>
            <Slot
              role="link"
              tabIndex={0}
              className="cursor-pointer outline-none"
              onClick={() => router.push(`/activity/${activity.id}`)}
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === "Enter" || e.key === " ") router.push(`/activity/${activity.id}`);
              }}
            >
              <div className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-violet-400 transition-colors">
                <MessageCircle size={16} />
                <span>{activity._count.comments}</span>
              </div>
            </Slot>
          </div>
        </div>
      </div>
    </article>
  );
});

