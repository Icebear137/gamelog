"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Slot } from "@radix-ui/react-slot";
import * as Separator from "@radix-ui/react-separator";
import { Gamepad2, Settings, Globe, Lock, EyeOff, GitCompare, MessageCircle } from "lucide-react";
import Link from "next/link";
import { Text, Heading, Flex, Box } from "@radix-ui/themes";
import { api } from "@/lib/api";
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
    queryFn: () => api.get(`/api/users/${username}`).then((r) => r.data),
  });

  // Only fetch games/activities if profile is not private (or it's me)
  const canSeeContent = profile && (!profile.isPrivate || me?.id === profile.id || profile.isFollowing);

  const { data: games = [] } = useQuery<GameEntry[]>({
    queryKey: ["user-games", username],
    queryFn: () => api.get(`/api/users/${username}/games`).then((r) => r.data),
    enabled: !!canSeeContent,
  });

  const { data: activities = [] } = useQuery<Activity[]>({
    queryKey: ["user-activities", username],
    queryFn: () => api.get(`/api/users/${username}/activities`).then((r) => r.data),
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
    queryFn: () => api.get(`/api/users/${username}/reviews`).then((r) => r.data),
    enabled: !!profile,
  });

  const followMutation = useMutation({
    mutationFn: (following: boolean) =>
      following
        ? api.delete(`/api/users/${username}/follow`)
        : api.post(`/api/users/${username}/follow`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile", username] });
      qc.invalidateQueries({ queryKey: ["user-games", username] });
      qc.invalidateQueries({ queryKey: ["user-activities", username] });
    },
  });

  if (isLoading) return <Text as="p" size="2" color="gray" className="py-16 text-center">Loading...</Text>;
  if (!profile) return <Text as="p" size="2" color="gray" className="py-16 text-center">User not found</Text>;

  const isMe = me?.id === profile.id;
  const recentGames = games.slice(0, 6);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Profile header */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/8 rounded-2xl p-6">
        <Flex align="start" gap="4">
          <Avatar src={profile.avatar} username={profile.username} size="lg" />
          <Box flexGrow="1" minWidth="0">
            <Flex align="start" justify="between" gap="4">
              <div>
                <Flex align="center" gap="2">
                  <Heading size="6">{profile.username}</Heading>
                  {profile.isPrivate && (
                    <span title="Private profile">
                      <Lock size={14} className="text-gray-500" />
                    </span>
                  )}
                </Flex>
                {profile.bio && <Text as="p" size="2" color="gray" className="mt-1">{profile.bio}</Text>}
                <Flex className="flex-wrap gap-3 mt-2">
                  {profile.steamId && <Text as="span" size="1" color="gray">Steam: {profile.steamId}</Text>}
                  {profile.discordTag && <Text as="span" size="1" color="gray">Discord: {profile.discordTag}</Text>}
                </Flex>
              </div>
              {isMe ? (
                <Link
                  href="/settings"
                  className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-white/8 border border-white/15 text-gray-300 hover:border-gray-500 hover:text-white transition-colors"
                >
                  <Settings size={14} />
                  Edit Profile
                </Link>
              ) : (
                me && (
                  <Flex direction="column" gap="2" className="shrink-0">
                    <button
                      onClick={() => followMutation.mutate(!!profile.isFollowing)}
                      disabled={followMutation.isPending}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        profile.isFollowing
                          ? "bg-white/8 border border-white/15 text-gray-300 hover:border-red-700 hover:text-red-400"
                          : "bg-violet-600 hover:bg-violet-500 text-white"
                      }`}
                    >
                      {profile.isFollowing ? "Following" : "Follow"}
                    </button>
                    <Link
                      href={`/user/${username}/compare`}
                      className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-white/8 border border-white/15 text-gray-300 hover:border-violet-600 hover:text-violet-400 transition-colors"
                    >
                      <GitCompare size={14} />
                      Compare
                    </Link>
                    <button
                      onClick={async () => {
                        try {
                          const { data } = await api.post("/api/messages/conversations", {
                            recipientId: profile.id,
                          });
                          router.push(`/messages/${data.id}`);
                        } catch {
                          dispatchToast("Could not open conversation", "error");
                        }
                      }}
                      className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-white/8 border border-white/15 text-gray-300 hover:border-violet-600 hover:text-violet-400 transition-colors"
                    >
                      <MessageCircle size={14} />
                      Message
                    </button>
                  </Flex>
                )
              )}
            </Flex>

            <Flex gap="4" className="mt-4">
              <div className="text-center">
                <Text as="p" size="2" weight="medium" className="font-bold text-white">{profile._count.gameEntries}</Text>
                <Text as="p" size="1" color="gray">Games</Text>
              </div>
              <Link href={`/user/${username}/followers`} className="text-center hover:opacity-80 transition-opacity">
                <Text as="p" size="2" weight="medium" className="font-bold text-white">{profile._count.followers}</Text>
                <Text as="p" size="1" color="gray">Followers</Text>
              </Link>
              <Link href={`/user/${username}/following`} className="text-center hover:opacity-80 transition-opacity">
                <Text as="p" size="2" weight="medium" className="font-bold text-white">{profile._count.following}</Text>
                <Text as="p" size="1" color="gray">Following</Text>
              </Link>
            </Flex>
          </Box>
        </Flex>
      </div>

      {/* Yearly challenge */}
      <YearlyChallengeCard username={username} isMe={isMe} />

      {/* Achievements */}
      <AchievementsSection username={username} isMe={isMe} />

      {/* Private gate */}
      {profile.isPrivate && !canSeeContent && (
        <div className="text-center py-16 text-gray-500 bg-white/5 backdrop-blur-sm border border-white/8 rounded-2xl">
          <EyeOff size={40} className="mx-auto mb-3 opacity-30" />
          <Text as="p" size="2" className="font-medium text-gray-300">This profile is private</Text>
          <Text as="p" size="2" className="mt-1">Follow this user to see their library and activity.</Text>
        </div>
      )}

      {canSeeContent && (
        <>
          {/* Recent games */}
          {recentGames.length > 0 && (
            <div>
              <Heading size="4" as="h2" className="mb-3">Recent Games</Heading>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {recentGames.map((entry) => (
                  <Slot
                    key={entry.id}
                    role="link"
                    tabIndex={0}
                    className="group cursor-pointer outline-none"
                    onClick={() => router.push(`/game/${entry.game.rawgId}`)}
                    onKeyDown={(e: React.KeyboardEvent) => {
                      if (e.key === "Enter" || e.key === " ") router.push(`/game/${entry.game.rawgId}`);
                    }}
                  >
                    <div className="relative rounded-lg overflow-hidden bg-white/5 backdrop-blur-sm border border-white/8 group-hover:border-violet-700 transition-colors">
                      {entry.game.coverImage ? (
                        <img
                          src={entry.game.coverImage}
                          alt={entry.game.name}
                          loading="lazy"
                          decoding="async"
                          className="w-full aspect-3/4 object-cover"
                        />
                      ) : (
                        <div className="w-full aspect-3/4 bg-white/8 flex items-center justify-center">
                          <Gamepad2 size={20} className="text-gray-600" />
                        </div>
                      )}
                      <div className="absolute bottom-0 inset-x-0 p-1">
                        <StatusBadge status={entry.status as GameStatus} />
                      </div>
                    </div>
                  </Slot>
                ))}
              </div>
              {games.length > 6 && (
                <Link href={`/user/${username}/games`} className="block text-center text-violet-400 text-sm mt-3 hover:text-violet-300">
                  View all {games.length} games →
                </Link>
              )}
            </div>
          )}

          {/* Lists */}
          {lists.length > 0 && (
            <div>
              <Heading size="4" as="h2" className="mb-3">Lists</Heading>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {lists.slice(0, 4).map((list) => {
                  const covers = list.entries.slice(0, 4).map((e) => e.game.coverImage).filter(Boolean);
                  return (
                    <Slot
                      key={list.id}
                      role="link"
                      tabIndex={0}
                      className="group cursor-pointer outline-none"
                      onClick={() => router.push(`/lists/${list.id}`)}
                      onKeyDown={(e: React.KeyboardEvent) => {
                        if (e.key === "Enter" || e.key === " ") router.push(`/lists/${list.id}`);
                      }}
                    >
                      <div className="bg-white/5 backdrop-blur-sm border border-white/8 group-hover:border-violet-700 rounded-xl overflow-hidden transition-colors">
                        <div className="grid grid-cols-4 h-16">
                          {covers.length > 0
                            ? covers.map((src, i) => (
                                <img key={i} src={src!} alt="" className="w-full h-full object-cover" />
                              ))
                            : Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="bg-white/8 flex items-center justify-center">
                                  <Gamepad2 size={12} className="text-gray-600" />
                                </div>
                              ))}
                          {covers.length > 0 &&
                            covers.length < 4 &&
                            Array.from({ length: 4 - covers.length }).map((_, i) => (
                              <div key={i} className="bg-white/8 flex items-center justify-center">
                                <Gamepad2 size={12} className="text-gray-600" />
                              </div>
                            ))}
                        </div>
                        <div className="px-3 py-2">
                          <Flex align="center" className="gap-1.5">
                            <Text as="span" size="2" truncate className="font-medium text-white group-hover:text-violet-300 transition-colors">
                              {list.name}
                            </Text>
                            {list.isPublic ? (
                              <Globe size={11} className="text-gray-500 shrink-0" />
                            ) : (
                              <Lock size={11} className="text-gray-500 shrink-0" />
                            )}
                          </Flex>
                          <Text as="p" size="1" color="gray">
                            {list._count.entries} game{list._count.entries !== 1 ? "s" : ""}
                          </Text>
                        </div>
                      </div>
                    </Slot>
                  );
                })}
              </div>
              {isMe && (
                <Link href="/lists" className="block text-center text-violet-400 text-sm mt-3 hover:text-violet-300">
                  Manage all lists →
                </Link>
              )}
            </div>
          )}

          {/* Reviews */}
          {reviews.length > 0 && (
            <Flex direction="column" gap="3">
              <Flex align="center" justify="between">
                <Heading size="4" as="h2">Reviews</Heading>
                <Link href={`/reviews`} className="text-sm text-violet-400 hover:text-violet-300 transition-colors">
                  All reviews →
                </Link>
              </Flex>
              {reviews.slice(0, 3).map((r) => (
                <ReviewCard key={r.id} review={r} showGame queryKey={reviewsQueryKey} />
              ))}
              {reviews.length > 3 && (
                <p className="text-sm text-center text-gray-500">
                  {reviews.length - 3} more review{reviews.length - 3 !== 1 ? "s" : ""} hidden
                </p>
              )}
            </Flex>
          )}

          {/* Recent activity */}
          {activities.length > 0 && (
            <Flex direction="column" gap="3">
              <Flex align="center" justify="between">
                <Heading size="4" as="h2">Recent Activity</Heading>
                <Slot
                  role="link"
                  tabIndex={0}
                  className="text-sm text-violet-400 hover:text-violet-300 cursor-pointer outline-none"
                  onClick={() => router.push(`/user/${username}/stats`)}
                  onKeyDown={(e: React.KeyboardEvent) => {
                    if (e.key === "Enter" || e.key === " ") router.push(`/user/${username}/stats`);
                  }}
                >
                  <span>View Stats →</span>
                </Slot>
              </Flex>
              <ErrorBoundary>
                {activities.map((a) => (
                  <ActivityCard key={a.id} activity={a} />
                ))}
              </ErrorBoundary>
            </Flex>
          )}
        </>
      )}
    </div>
  );
}
