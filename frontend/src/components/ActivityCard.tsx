"use client";

import { memo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Slot } from "@radix-ui/react-slot";
import { Heart, MessageCircle, Star, Clock } from "lucide-react";
import { Text, Flex, Box } from "@radix-ui/themes";
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
    <article className="bg-white/5 backdrop-blur-sm border border-white/8 rounded-xl p-4 hover:border-white/15 transition-colors min-h-44">
      <Flex gap="3">
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

        <Box flexGrow="1" minWidth="0">
          <div className="flex items-center gap-1.5 text-sm min-w-0">
            <Slot
              role="link"
              tabIndex={0}
              className="cursor-pointer outline-none shrink-0"
              onClick={() => router.push(`/user/${activity.user.username}`)}
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === "Enter" || e.key === " ") router.push(`/user/${activity.user.username}`);
              }}
            >
              <span className="font-semibold text-white hover:text-violet-400 transition-colors">
                {activity.user.username}
              </span>
            </Slot>
            <Text as="span" size="2" color="gray" className="shrink-0">{activityLabel[activity.type]}</Text>
            <Slot
              role="link"
              tabIndex={0}
              className="cursor-pointer outline-none min-w-0"
              onClick={() => router.push(`/game/${game.rawgId}`)}
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === "Enter" || e.key === " ") router.push(`/game/${game.rawgId}`);
              }}
            >
              <span className="font-semibold text-violet-400 hover:text-violet-300 transition-colors truncate block">
                {game.name}
              </span>
            </Slot>
          </div>
          <Text as="p" size="1" color="gray" className="mt-0.5">{formatDistanceToNow(activity.createdAt)}</Text>

          <Flex gap="3" className="mt-3">
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
            <Flex direction="column" gap="2" align="start">
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
            </Flex>
          </Flex>

          <Flex align="center" gap="4" className="mt-3">
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
          </Flex>
        </Box>
      </Flex>
    </article>
  );
});

