"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Slot } from "@radix-ui/react-slot";
import { Gamepad2, Settings, Globe, Lock, EyeOff, GitCompare, MessageCircle } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { getUserService, getUserGamesService, getUserReviewsService, getUserActivitiesService, followUserService, unfollowUserService } from "@/services/user.service";
import { useAuth } from "@/lib/auth-context";
import { dispatchToast } from "@/lib/toast";
import { User, Activity, GameEntry, GameStatus, GameListPreview, GameReview } from "@/lib/types";
import Avatar from "@/components/Avatar";
import ActivityCard from "@/components/ActivityCard";
import StatusBadge from "@/components/StatusBadge";
import ErrorBoundary from "@/components/ErrorBoundary";
import YearlyChallengeCard from "./_components/YearlyChallengeCard";
import AchievementsSection from "./_components/AchievementsSection";
import { ReviewCard } from "@/components/ReviewCard";

export default function UserProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);
  const { user: me } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();

  const { data: profile, isLoading } = useQuery<User>({
    queryKey: ["profile", username],
    queryFn: () => getUserService(username),
  });

  const canSeeContent = profile && (!profile.isPrivate || me?.id === profile.id || profile.isFollowing);

  const { data: games = [] } = useQuery<GameEntry[]>({
    queryKey: ["user-games", username],
    queryFn: () => getUserGamesService(username),
    enabled: !!canSeeContent,
  });

  const { data: activities = [] } = useQuery<Activity[]>({
    queryKey: ["user-activities", username],
    queryFn: () => getUserActivitiesService(username),
    enabled: !!canSeeContent,
  });

  const { data: lists = [] } = useQuery<GameListPreview[]>({
    queryKey: ["user-lists", username],
    queryFn: () => api.get(`/api/users/${username}/lists`).then((r) => r.data),
    enabled: !!profile,
  });

  const reviewsQueryKey = ["user-reviews", username];
  const { data: reviews = [] } = useQuery<GameReview[]>({
    queryKey: reviewsQueryKey,
    queryFn: () => getUserReviewsService(username),
    enabled: !!canSeeContent,
  });

  const followMutation = useMutation({
    mutationFn: (following: boolean) =>
      following ? unfollowUserService(username) : followUserService(username),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile", username] });
      qc.invalidateQueries({ queryKey: ["user-games", username] });
      qc.invalidateQueries({ queryKey: ["user-activities", username] });
    },
  });

  if (isLoading) return (
    <div className="gx-user-page">
      <div className="gx-user-header">
        <div className="gx-user-banner" />
        <div className="gx-user-header-body" style={{ height: 120 }} />
      </div>
    </div>
  );
  if (!profile) return (
    <p style={{ padding: "64px 0", textAlign: "center", color: "var(--gx-text-2)", fontSize: 14 }}>
      User not found
    </p>
  );

  const isMe = me?.id === profile.id;
  const recentGames = games.slice(0, 6);

  return (
    <div className="gx-user-page">

      {/* ── PROFILE HEADER ── */}
      <div className="gx-user-header">
        <div className="gx-user-banner" />
        <div className="gx-user-header-body">

          {/* Avatar */}
          <div className="gx-user-avatar-wrap">
            <Avatar src={profile.avatar} username={profile.username} size="lg" />
          </div>

          {/* Name + bio + socials */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h1 className="gx-user-name">{profile.username}</h1>
                {profile.isPrivate && <Lock size={13} color="var(--gx-text-3)" />}
              </div>
              {profile.bio && <p className="gx-user-bio">{profile.bio}</p>}
              {(profile.steamId || profile.discordTag) && (
                <div className="gx-user-socials">
                  {profile.steamId && (
                    <span className="gx-user-social">
                      <Globe size={10} /> Steam: {profile.steamId}
                    </span>
                  )}
                  {profile.discordTag && (
                    <span className="gx-user-social">Discord: {profile.discordTag}</span>
                  )}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
              {isMe ? (
                <Link href="/settings" className="gx-btn-ghost" style={{ fontSize: 12, padding: "7px 14px" }}>
                  <Settings size={13} /> Edit Profile
                </Link>
              ) : (
                me && (
                  <>
                    <button
                      onClick={() => followMutation.mutate(!!profile.isFollowing)}
                      disabled={followMutation.isPending}
                      className={`gx-follow-btn ${profile.isFollowing ? "gx-follow-inactive" : "gx-follow-active"}`}
                    >
                      {profile.isFollowing ? "Following" : "Follow"}
                    </button>
                    <Link
                      href={`/user/${username}/compare`}
                      className="gx-btn-ghost"
                      style={{ fontSize: 12, padding: "7px 12px" }}
                    >
                      <GitCompare size={12} /> Compare
                    </Link>
                    <button
                      className="gx-btn-ghost"
                      style={{ fontSize: 12, padding: "7px 12px" }}
                      onClick={async () => {
                        try {
                          const { data } = await api.post("/api/messages/conversations", { recipientId: profile.id });
                          router.push(`/messages/${data.id}`);
                        } catch {
                          dispatchToast("Could not open conversation", "error");
                        }
                      }}
                    >
                      <MessageCircle size={12} /> Message
                    </button>
                  </>
                )
              )}
            </div>
          </div>

          {/* Stats row */}
          <div className="gx-user-stats">
            <div className="gx-user-stat">
              <span className="gx-user-stat-val">{profile._count.gameEntries}</span>
              <span className="gx-user-stat-lbl">Games</span>
            </div>
            <Link href={`/user/${username}/followers`} className="gx-user-stat gx-user-stat-link">
              <span className="gx-user-stat-val">{profile._count.followers}</span>
              <span className="gx-user-stat-lbl">Followers</span>
            </Link>
            <Link href={`/user/${username}/following`} className="gx-user-stat gx-user-stat-link">
              <span className="gx-user-stat-val">{profile._count.following}</span>
              <span className="gx-user-stat-lbl">Following</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── YEARLY CHALLENGE ── */}
      <YearlyChallengeCard username={username} isMe={isMe} />

      {/* ── ACHIEVEMENTS ── */}
      <AchievementsSection username={username} isMe={isMe} />

      {/* ── PRIVATE GATE ── */}
      {profile.isPrivate && !canSeeContent && (
        <div className="gx-private-gate">
          <EyeOff size={38} color="var(--gx-text-3)" style={{ margin: "0 auto 12px" }} />
          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--gx-text-1)", marginBottom: 4 }}>
            This profile is private
          </p>
          <p style={{ fontSize: 13, color: "var(--gx-text-2)" }}>
            Follow this user to see their library and activity.
          </p>
        </div>
      )}

      {canSeeContent && (
        <>
          {/* ── RECENT GAMES ── */}
          {recentGames.length > 0 && (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <p className="gx-section-label">Recent Games</p>
                {games.length > 6 && (
                  <Link href={`/user/${username}/games`} className="gx-link">
                    All {games.length} games →
                  </Link>
                )}
              </div>
              <div className="gx-cover-grid">
                {recentGames.map((entry) => (
                  <div
                    key={entry.id}
                    className="gx-cover-item"
                    role="link"
                    tabIndex={0}
                    onClick={() => router.push(`/game/${entry.game.rawgId}`)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") router.push(`/game/${entry.game.rawgId}`); }}
                  >
                    {entry.game.coverImage ? (
                      <img src={entry.game.coverImage} alt={entry.game.name} loading="lazy" decoding="async" />
                    ) : (
                      <div className="gx-cover-item-empty">
                        <Gamepad2 size={18} color="var(--gx-text-3)" />
                      </div>
                    )}
                    <div className="gx-cover-badge">
                      <StatusBadge status={entry.status as GameStatus} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── LISTS ── */}
          {lists.length > 0 && (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <p className="gx-section-label">Lists</p>
                {isMe && <Link href="/lists" className="gx-link">Manage →</Link>}
              </div>
              <div className="gx-list-grid">
                {lists.slice(0, 4).map((list) => {
                  const covers = list.entries.slice(0, 4).map((e) => e.game.coverImage).filter(Boolean);
                  return (
                    <div
                      key={list.id}
                      className="gx-list-card"
                      role="link"
                      tabIndex={0}
                      onClick={() => router.push(`/lists/${list.id}`)}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") router.push(`/lists/${list.id}`); }}
                    >
                      <div className="gx-list-covers">
                        {Array.from({ length: 4 }).map((_, i) =>
                          covers[i] ? (
                            <div key={i} className="gx-list-cover-cell">
                              <img src={covers[i]!} alt="" />
                            </div>
                          ) : (
                            <div key={i} className="gx-list-cover-empty">
                              <Gamepad2 size={11} color="var(--gx-text-3)" />
                            </div>
                          )
                        )}
                      </div>
                      <div className="gx-list-meta">
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <p className="gx-list-name">{list.name}</p>
                          {list.isPublic ? (
                            <Globe size={10} color="var(--gx-text-3)" />
                          ) : (
                            <Lock size={10} color="var(--gx-text-3)" />
                          )}
                        </div>
                        <p className="gx-list-count">{list._count.entries} game{list._count.entries !== 1 ? "s" : ""}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── REVIEWS ── */}
          {reviews.length > 0 && (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <p className="gx-section-label">Reviews</p>
                <Link href={`/user/${username}/reviews`} className="gx-link">All reviews →</Link>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {reviews.slice(0, 3).map((r) => (
                  <ReviewCard key={r.id} review={r} showGame queryKey={reviewsQueryKey} />
                ))}
                {reviews.length > 3 && (
                  <p style={{ fontSize: 12, textAlign: "center", color: "var(--gx-text-3)" }}>
                    {reviews.length - 3} more review{reviews.length - 3 !== 1 ? "s" : ""}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── RECENT ACTIVITY ── */}
          {activities.length > 0 && (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <p className="gx-section-label">Recent Activity</p>
                <Slot
                  role="link"
                  tabIndex={0}
                  className="gx-link"
                  style={{ cursor: "pointer" }}
                  onClick={() => router.push(`/user/${username}/stats`)}
                  onKeyDown={(e: React.KeyboardEvent) => {
                    if (e.key === "Enter" || e.key === " ") router.push(`/user/${username}/stats`);
                  }}
                >
                  <span>View Stats →</span>
                </Slot>
              </div>
              <ErrorBoundary>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {activities.map((a) => (
                    <ActivityCard key={a.id} activity={a} />
                  ))}
                </div>
              </ErrorBoundary>
            </div>
          )}
        </>
      )}
    </div>
  );
}
