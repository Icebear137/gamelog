"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Slot } from "@radix-ui/react-slot";
import { Gamepad2, Settings, Globe, Lock, EyeOff, GitCompare, MessageCircle, Camera } from "lucide-react";
import Link from "next/link";
import clsx from "clsx";
import { useRef } from "react";
import { api } from "@/lib/api";
import { gx } from "@/lib/gx-styles";
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

/* Local Tailwind recipes (converted from _page-user.css) */
const c = {
  header: "bg-gx-surface border border-gx-border rounded-[18px]",
  banner:
    "relative h-[180px] overflow-hidden rounded-t-[17px] " +
    "bg-[linear-gradient(135deg,#0D1A2E_0%,#0E2338_35%,#0A1820_65%,#080E16_100%)] " +
    "before:content-[''] before:absolute before:inset-0 " +
    "before:bg-[repeating-linear-gradient(-55deg,transparent,transparent_22px,rgba(232,147,42,0.025)_22px,rgba(232,147,42,0.025)_23px)] " +
    "after:content-[''] after:absolute after:bottom-0 after:inset-x-0 after:h-[60px] " +
    "after:bg-[linear-gradient(to_bottom,transparent,var(--color-gx-surface))]",
  headerBody: "relative px-[22px] pb-[22px]",
  stat: "flex flex-col gap-0.5",
  statVal: "font-bebas text-[22px] leading-none text-gx-text-1",
  statLbl: "text-[9px] font-bold tracking-[0.11em] uppercase text-gx-text-3",
  followBtn:
    "inline-flex items-center justify-center px-5 py-2 rounded-lg text-[13px] font-bold cursor-pointer transition-all duration-150",
  followActive: "bg-gx-amber text-gx-ink border-none hover:bg-[#f5a33a]",
  followInactive: "bg-transparent text-gx-text-2 border border-gx-border-md hover:border-gx-amber/30 hover:text-gx-text-1",
} as const;

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

  const bannerInputRef = useRef<HTMLInputElement | null>(null);

  const bannerMutation = useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append("banner", file);
      return api.post("/api/users/me/banner", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile", username] });
      dispatchToast("Banner updated", "success");
    },
    onError: (err: any) => {
      dispatchToast(err?.response?.data?.error ?? "Failed to upload banner", "error");
    },
  });

  const deleteBannerMutation = useMutation({
    mutationFn: () => api.delete("/api/users/me/banner"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile", username] });
      dispatchToast("Banner removed", "success");
    },
  });

  if (isLoading) return (
    <div className="flex flex-col gap-5">
      <div className={c.header}>
        <div className={c.banner} />
        <div className={c.headerBody} style={{ height: 120 }} />
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
    <div className="flex flex-col gap-5">

      {/* ── PROFILE HEADER ── */}
      <div className={c.header}>

        {/* Banner */}
        <div className={`${c.banner} group/banner`}>
          {profile.banner && (
            <img
              src={profile.banner}
              alt="Profile banner"
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
          {/* Edit controls — only visible to profile owner */}
          {isMe && (
            <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 opacity-0 group-hover/banner:opacity-100 transition-opacity z-10">
              <button
                onClick={() => bannerInputRef.current?.click()}
                disabled={bannerMutation.isPending}
                title="Upload banner"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.25 rounded-md text-[11px] font-medium bg-black/55 text-white backdrop-blur-sm border border-white/15 hover:bg-black/70 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Camera size={11} />
                {bannerMutation.isPending ? "Uploading…" : profile.banner ? "Change" : "Add banner"}
              </button>
              {profile.banner && (
                <button
                  onClick={() => deleteBannerMutation.mutate()}
                  disabled={deleteBannerMutation.isPending}
                  title="Remove banner"
                  className="px-2 py-1.25 rounded-md text-[11px] bg-black/55 text-red-400 backdrop-blur-sm border border-white/15 hover:bg-black/70 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Remove
                </button>
              )}
              <input
                ref={bannerInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) bannerMutation.mutate(file);
                  e.target.value = "";
                }}
              />
            </div>
          )}
        </div>

        <div className={c.headerBody}>

          {/* Avatar */}
          <div className="relative z-[2] w-17.5 h-17.5 rounded-[14px] overflow-hidden -mt-7 mb-2.5">
            <Avatar src={profile.avatar} username={profile.username} size="lg" />
          </div>

          {/* Name + bio + socials */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h1 className="font-bebas text-[26px] tracking-[0.04em] leading-none text-gx-text-1">{profile.username}</h1>
                {profile.isPrivate && <Lock size={13} color="var(--gx-text-3)" />}
              </div>
              {profile.bio && <p className="text-[13px] text-gx-text-2 mt-1 leading-[1.5]">{profile.bio}</p>}
              {(profile.steamId || profile.discordTag) && (
                <div className="flex flex-wrap gap-3.5 mt-[7px]">
                  {profile.steamId && (
                    <span className="flex items-center gap-1 text-[11px] text-gx-text-3">
                      <Globe size={10} /> Steam: {profile.steamId}
                    </span>
                  )}
                  {profile.discordTag && (
                    <span className="flex items-center gap-1 text-[11px] text-gx-text-3">Discord: {profile.discordTag}</span>
                  )}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
              {isMe ? (
                <Link href="/settings" className={gx.btnGhost} style={{ fontSize: 12, padding: "7px 14px" }}>
                  <Settings size={13} /> Edit Profile
                </Link>
              ) : (
                me && (
                  <>
                    <button
                      onClick={() => followMutation.mutate(!!profile.isFollowing)}
                      disabled={followMutation.isPending}
                      className={clsx(c.followBtn, profile.isFollowing ? c.followInactive : c.followActive)}
                    >
                      {profile.isFollowing ? "Following" : "Follow"}
                    </button>
                    <Link
                      href={`/user/${username}/compare`}
                      className={gx.btnGhost}
                      style={{ fontSize: 12, padding: "7px 12px" }}
                    >
                      <GitCompare size={12} /> Compare
                    </Link>
                    <button
                      className={gx.btnGhost}
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
          <div className="flex flex-wrap gap-6 mt-3.5 pt-3.5 border-t border-gx-border">
            <div className={clsx(c.stat, "cursor-default")}>
              <span className={c.statVal}>{profile._count.gameEntries}</span>
              <span className={c.statLbl}>Games</span>
            </div>
            <Link
              href={`/user/${username}/followers`}
              className={clsx(c.stat, "cursor-pointer transition-opacity duration-150 hover:opacity-75")}
            >
              <span className={c.statVal}>{profile._count.followers}</span>
              <span className={c.statLbl}>Followers</span>
            </Link>
            <Link
              href={`/user/${username}/following`}
              className={clsx(c.stat, "cursor-pointer transition-opacity duration-150 hover:opacity-75")}
            >
              <span className={c.statVal}>{profile._count.following}</span>
              <span className={c.statLbl}>Following</span>
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
        <div className="bg-gx-surface border border-gx-border rounded-[14px] px-6 py-12 text-center">
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
                <p className={gx.sectionLabel}>Recent Games</p>
                {games.length > 6 && (
                  <Link href={`/user/${username}/games`} className={gx.link}>
                    All {games.length} games →
                  </Link>
                )}
              </div>
              <div className="grid grid-cols-6 max-[640px]:grid-cols-3 gap-2">
                {recentGames.map((entry) => (
                  <div
                    key={entry.id}
                    className="relative rounded-lg overflow-hidden bg-gx-surface-2 border border-gx-border cursor-pointer transition-[border-color] duration-150 hover:border-gx-amber/30"
                    role="link"
                    tabIndex={0}
                    onClick={() => router.push(`/game/${entry.game.rawgId}`)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") router.push(`/game/${entry.game.rawgId}`); }}
                  >
                    {entry.game.coverImage ? (
                      <img
                        src={entry.game.coverImage}
                        alt={entry.game.name}
                        loading="lazy"
                        decoding="async"
                        className="block w-full aspect-[3/4] object-cover"
                      />
                    ) : (
                      <div className="w-full aspect-[3/4] flex items-center justify-center">
                        <Gamepad2 size={18} color="var(--gx-text-3)" />
                      </div>
                    )}
                    <div className="absolute bottom-0 inset-x-0 px-1.5 pt-1 pb-1.5">
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
                <p className={gx.sectionLabel}>Lists</p>
                {isMe && <Link href="/lists" className={gx.link}>Manage →</Link>}
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {lists.slice(0, 4).map((list) => {
                  const covers = list.entries.slice(0, 4).map((e) => e.game.coverImage).filter(Boolean);
                  return (
                    <div
                      key={list.id}
                      className="group bg-gx-surface border border-gx-border rounded-xl overflow-hidden cursor-pointer transition-[border-color] duration-150 hover:border-gx-amber/30"
                      role="link"
                      tabIndex={0}
                      onClick={() => router.push(`/lists/${list.id}`)}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") router.push(`/lists/${list.id}`); }}
                    >
                      <div className="grid grid-cols-4 h-[54px] overflow-hidden">
                        {Array.from({ length: 4 }).map((_, i) =>
                          covers[i] ? (
                            <div key={i} className="overflow-hidden">
                              <img src={covers[i]!} alt="" className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div key={i} className="bg-gx-surface-2 flex items-center justify-center h-full">
                              <Gamepad2 size={11} color="var(--gx-text-3)" />
                            </div>
                          )
                        )}
                      </div>
                      <div className="px-3 pt-2 pb-2.5">
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <p className="text-[12px] font-semibold text-gx-text-1 truncate transition-colors duration-150 group-hover:text-gx-amber">
                            {list.name}
                          </p>
                          {list.isPublic ? (
                            <Globe size={10} color="var(--gx-text-3)" />
                          ) : (
                            <Lock size={10} color="var(--gx-text-3)" />
                          )}
                        </div>
                        <p className="text-[10px] text-gx-text-3 mt-0.5">{list._count.entries} game{list._count.entries !== 1 ? "s" : ""}</p>
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
                <p className={gx.sectionLabel}>Reviews</p>
                <Link href={`/user/${username}/reviews`} className={gx.link}>All reviews →</Link>
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
                <p className={gx.sectionLabel}>Recent Activity</p>
                <Slot
                  role="link"
                  tabIndex={0}
                  className={gx.link}
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
