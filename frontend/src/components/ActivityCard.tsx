"use client";

import { memo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Heart, MessageCircle, Star, Clock, Gamepad2 } from "lucide-react";
import clsx from "clsx";
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
      // ignore
    } finally {
      pending.current = false;
    }
  }

  const { gameEntry } = activity;
  const game = gameEntry.game;

  return (
    <article
      className={clsx(
        "group relative flex overflow-hidden rounded-[10px]",
        "bg-gx-surface border border-gx-border",
        "transition-all duration-200",
        "hover:border-gx-border-md",
        // Amber left-glow on hover — the signature detail
        "hover:shadow-[inset_3px_0_0_rgba(232,147,42,0.40)]",
      )}
      style={{ minHeight: 110 }}
    >
      {/* ── Cover panel ─────────────────────────────────────── */}
      <div
        className="relative flex-shrink-0 cursor-pointer overflow-hidden"
        style={{ width: 104 }}
        onClick={() => router.push(`/game/${game.rawgId}`)}
        role="link"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") router.push(`/game/${game.rawgId}`);
        }}
      >
        {game.coverImage ? (
          <>
            <img
              src={game.coverImage}
              alt={game.name}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.05]"
            />
            {/* Seamless bleed — cover fades into card bg */}
            <div
              className="absolute inset-y-0 right-0 w-10 pointer-events-none"
              style={{ background: "linear-gradient(to right, transparent, #0D1220)" }}
            />
          </>
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: "var(--color-gx-surface-2)" }}
          >
            <Gamepad2 size={20} style={{ color: "var(--gx-text-3)" }} />
          </div>
        )}
      </div>

      {/* ── Content body ────────────────────────────────────── */}
      <div className="flex-1 flex flex-col justify-between px-3 py-2.5 min-w-0">

        {/* Row 1 — user meta */}
        <div className="flex items-center gap-1.5">
          <button
            className="shrink-0 bg-transparent border-none cursor-pointer p-0"
            onClick={() => router.push(`/user/${activity.user.username}`)}
            aria-label={`View ${activity.user.username}'s profile`}
          >
            <Avatar src={activity.user.avatar} username={activity.user.username} size="xs" />
          </button>
          <button
            className="text-[11px] font-bold text-gx-text-1 bg-transparent border-none cursor-pointer p-0 hover:text-gx-amber transition-colors truncate max-w-[90px]"
            onClick={() => router.push(`/user/${activity.user.username}`)}
          >
            {activity.user.username}
          </button>
          <span className="text-[11px] text-gx-text-3 truncate">{VERB[activity.type]}</span>
          <span className="text-[10px] text-gx-text-3 ml-auto shrink-0 pl-2">
            {formatDistanceToNow(activity.createdAt)}
          </span>
        </div>

        {/* Row 2 — game name (Bebas, large) */}
        <button
          className="font-bebas text-[20px] leading-none tracking-[0.03em] text-gx-text-1 bg-transparent border-none cursor-pointer p-0 text-left truncate hover:text-gx-amber transition-colors"
          onClick={() => router.push(`/game/${game.rawgId}`)}
        >
          {game.name}
        </button>

        {/* Row 3 — status + rating + playtime */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <StatusBadge status={gameEntry.status} />
          {gameEntry.rating != null && (
            <span className="inline-flex items-center gap-[3px] text-[11px] text-gx-amber font-semibold">
              <Star size={10} fill="currentColor" />
              {gameEntry.rating}
              <span className="text-gx-text-3 font-normal">/10</span>
            </span>
          )}
          {gameEntry.playtime != null && (
            <span className="inline-flex items-center gap-[3px] text-[11px] text-gx-text-3">
              <Clock size={10} />
              {gameEntry.playtime}h
            </span>
          )}
        </div>

        {/* Row 4 — review snippet (only if exists) */}
        {gameEntry.review && (
          <MarkdownReview
            text={gameEntry.review}
            className="text-[11px] text-gx-text-2 leading-[1.5] line-clamp-1"
          />
        )}

        {/* Row 5 — like + comment */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={toggleLike}
            aria-label={liked ? "Unlike" : "Like"}
            className={clsx(
              "inline-flex items-center gap-1 px-1.5 py-0.75 rounded text-[11px] bg-transparent border-none cursor-pointer transition-colors",
              liked
                ? "text-gx-red"
                : "text-gx-text-3 hover:text-gx-text-2"
            )}
          >
            <Heart size={11} fill={liked ? "currentColor" : "none"} />
            {likeCount > 0 && <span>{likeCount}</span>}
          </button>
          <button
            onClick={() => router.push(`/activity/${activity.id}`)}
            aria-label="View comments"
            className="inline-flex items-center gap-1 px-1.5 py-0.75 rounded text-[11px] text-gx-text-3 bg-transparent border-none cursor-pointer transition-colors hover:text-gx-amber"
          >
            <MessageCircle size={11} />
            {activity._count.comments > 0 && <span>{activity._count.comments}</span>}
          </button>
        </div>
      </div>
    </article>
  );
}, arePropsEqual);
