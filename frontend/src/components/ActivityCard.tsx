"use client";

import { memo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Heart, MessageCircle, Star, Clock, Gamepad2 } from "lucide-react";
import { Activity, ActivityType } from "@/lib/types";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import Avatar from "./Avatar";
import StatusBadge from "./StatusBadge";
import MarkdownReview from "./MarkdownReview";
import { formatDistanceToNow } from "@/lib/utils";

const VERB: Record<ActivityType, string> = {
  STARTED:           "started playing",
  COMPLETED:         "completed",
  DROPPED:           "dropped",
  RATED:             "rated",
  ADDED_TO_WISHLIST: "wishlisted",
};

interface Props {
  activity: Activity;
}

function arePropsEqual(prev: Props, next: Props) {
  const a = prev.activity;
  const b = next.activity;
  return (
    a.id === b.id &&
    a._count.likes === b._count.likes &&
    a._count.comments === b._count.comments &&
    a.likedByMe === b.likedByMe
  );
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
      // silently ignore
    } finally {
      pending.current = false;
    }
  }

  const { gameEntry } = activity;
  const game = gameEntry.game;

  return (
    <article className="hm-activity-card">
      {/* ── Cover panel ── */}
      <div
        className="hm-activity-cover cursor-pointer"
        role="link"
        tabIndex={0}
        onClick={() => router.push(`/game/${game.rawgId}`)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") router.push(`/game/${game.rawgId}`);
        }}
      >
        {game.coverImage ? (
          <>
            <img src={game.coverImage} alt={game.name} loading="lazy" decoding="async" />
            <div className="hm-activity-cover-shade" />
          </>
        ) : (
          <div className="hm-activity-cover-empty">
            <Gamepad2 size={22} color="rgba(255,255,255,0.15)" />
          </div>
        )}
      </div>

      {/* ── Content ── */}
      <div className="hm-activity-body">
        {/* Row 1: avatar + user + verb + time */}
        <div className="hm-activity-header">
          <button
            className="shrink-0"
            onClick={() => router.push(`/user/${activity.user.username}`)}
            aria-label={`View ${activity.user.username}'s profile`}
          >
            <Avatar src={activity.user.avatar} username={activity.user.username} size="xs" />
          </button>
          <button
            className="hm-activity-user"
            onClick={() => router.push(`/user/${activity.user.username}`)}
          >
            {activity.user.username}
          </button>
          <span className="hm-activity-verb">{VERB[activity.type]}</span>
          <span className="hm-activity-time">{formatDistanceToNow(activity.createdAt)}</span>
        </div>

        {/* Row 2: game name */}
        <button
          className="hm-activity-game"
          onClick={() => router.push(`/game/${game.rawgId}`)}
        >
          {game.name}
        </button>

        {/* Row 3: status + rating + playtime */}
        <div className="hm-activity-stats">
          <StatusBadge status={gameEntry.status} />
          {gameEntry.rating && (
            <span className="hm-activity-rating">
              <Star size={11} fill="currentColor" />
              {gameEntry.rating}
              <span className="hm-activity-rating-denom">/10</span>
            </span>
          )}
          {gameEntry.playtime && (
            <span className="hm-activity-playtime">
              <Clock size={11} />
              {gameEntry.playtime}h
            </span>
          )}
        </div>

        {/* Row 4: review snippet */}
        {gameEntry.review && (
          <MarkdownReview text={gameEntry.review} className="hm-activity-review" />
        )}

        {/* Row 5: footer actions */}
        <div className="hm-activity-footer">
          <button
            onClick={toggleLike}
            className={`hm-like-btn${liked ? " liked" : ""}`}
            aria-label={liked ? "Unlike" : "Like"}
          >
            <Heart size={13} fill={liked ? "currentColor" : "none"} />
            {likeCount}
          </button>
          <button
            className="hm-comment-btn"
            onClick={() => router.push(`/activity/${activity.id}`)}
            aria-label="View comments"
          >
            <MessageCircle size={13} />
            {activity._count.comments}
          </button>
        </div>
      </div>
    </article>
  );
}, arePropsEqual);
