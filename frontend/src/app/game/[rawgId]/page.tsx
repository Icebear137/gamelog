"use client";

import { use, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Star, Users, Tag, BookOpen, Clock, Globe, Monitor, Building2, ChevronDown, ChevronUp, UserCheck } from "lucide-react";
import Link from "next/link";
import { Text, Heading, Flex } from "@radix-ui/themes";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { getGameService, getGameFriendsService, getGameActivitiesService } from "@/services/game.service";
import { GameEntry, GameStatus, Activity } from "@/lib/types";
import * as Separator from "@radix-ui/react-separator";
import Avatar from "@/components/Avatar";
import AddGameModal from "@/components/AddGameModal";
import AddToListModal from "@/components/AddToListModal";
import StatusBadge from "@/components/StatusBadge";
import ActivityCard from "@/components/ActivityCard";
import ErrorBoundary from "@/components/ErrorBoundary";
import MarkdownReview from "@/components/MarkdownReview";
import { GameTagsSection } from "./_components/GameTagsSection";
import { PlaythroughsSection } from "./_components/PlaythroughsSection";

interface GameDetail {
  id: string;
  rawgId: number;
  name: string;
  coverImage?: string;
  genres: string[];
  releaseYear?: number;
  rawgRating?: number;
  description?: string;
  platforms?: string[];
  developers?: string[];
  publishers?: string[];
  website?: string;
  metacritic?: number;
  esrbRating?: string;
  avgPlaytime?: number;
  community: {
    avgRating: number | null;
    ratingCount: number;
    statusCounts: Record<string, number>;
  };
}

function metacriticColor(score: number) {
  if (score >= 75) return "text-green-400 border-green-400/40 bg-green-400/10";
  if (score >= 50) return "text-yellow-400 border-yellow-400/40 bg-yellow-400/10";
  return "text-red-400 border-red-400/40 bg-red-400/10";
}

export default function GamePage({ params }: { params: Promise<{ rawgId: string }> }) {
  const { rawgId } = use(params);
  const { user } = useAuth();
  const [showFullDesc, setShowFullDesc] = useState(false);

  const { data: game, isLoading } = useQuery<GameDetail>({
    queryKey: ["game", rawgId],
    queryFn: () => getGameService(parseInt(rawgId)),
  });

  const { data: myEntries = [] } = useQuery<GameEntry[]>({
    queryKey: ["my-entries"],
    queryFn: () => api.get("/api/entries/me").then((r) => r.data),
    enabled: !!user,
  });

  interface FriendEntry {
    id: string;
    status: string;
    rating?: number | null;
    playtime?: number | null;
    user: { id: string; username: string; avatar?: string };
  }

  const { data: friendEntries = [] } = useQuery<FriendEntry[]>({
    queryKey: ["game-friends", rawgId],
    queryFn: () => getGameFriendsService(parseInt(rawgId)),
    enabled: !!user && !!game,
    staleTime: 2 * 60_000,
  });

  const { data: communityActivities = [] } = useQuery<Activity[]>({
    queryKey: ["game-activities", rawgId],
    queryFn: () => getGameActivitiesService(parseInt(rawgId)),
    enabled: !!game,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });

  if (isLoading) return <Text as="p" size="2" color="gray" className="py-16 text-center">Loading...</Text>;
  if (!game) return <Text as="p" size="2" color="gray" className="py-16 text-center">Game not found</Text>;

  const myEntry = myEntries.find((e) => e.game.rawgId === parseInt(rawgId));
  const totalInLibrary = Object.values(game.community.statusCounts).reduce((a, b) => a + b, 0);

  const descTrimmed = game.description && game.description.length > 400 && !showFullDesc
    ? game.description.slice(0, 400).trimEnd() + "…"
    : game.description;

  const hasInfoCard = game.metacritic || game.esrbRating || game.avgPlaytime || game.website ||
    (game.platforms?.length ?? 0) > 0 || (game.developers?.length ?? 0) > 0 || (game.publishers?.length ?? 0) > 0;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* ── Header card ── */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/8 rounded-2xl overflow-hidden">
        {game.coverImage && (
          <div className="relative h-52 overflow-hidden">
            <img src={game.coverImage} alt={game.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-linear-to-t from-gray-900 via-gray-900/40 to-transparent" />
          </div>
        )}
        <div className="p-6">
          <Flex align="start" justify="between" gap="4">
            <div>
              <Heading size="6">{game.name}</Heading>
              {game.releaseYear && <Text as="p" size="2" color="gray" className="mt-1">{game.releaseYear}</Text>}
              <div className="flex flex-wrap gap-2 mt-3">
                {game.genres.map((g) => (
                  <span key={g} className="flex items-center gap-1 text-xs text-gray-400 bg-white/8 px-2 py-1 rounded-full">
                    <Tag size={11} />
                    {g}
                  </span>
                ))}
              </div>
            </div>
            <div className="shrink-0 flex flex-col gap-2">
              {myEntry ? (
                <AddGameModal
                  preselectedGame={game}
                  initialValues={{
                    status: myEntry.status as GameStatus,
                    rating: myEntry.rating,
                    review: myEntry.review,
                    playtime: myEntry.playtime,
                    platform: myEntry.platform,
                  }}
                  trigger={
                    <button className="flex items-center gap-2 bg-white/8 hover:bg-gray-700 border border-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                      <BookOpen size={15} />
                      Update Entry
                    </button>
                  }
                />
              ) : (
                <AddGameModal preselectedGame={game} />
              )}
              {user && <AddToListModal rawgId={game.rawgId} gameName={game.name} />}
            </div>
          </Flex>

          {/* Description */}
          {game.description && (
            <div className="mt-4">
              <Separator.Root className="h-px bg-white/8 mb-3" />
              <Text as="p" size="2" color="gray" className="leading-relaxed whitespace-pre-line">
                {descTrimmed}
              </Text>
              {game.description.length > 400 && (
                <button
                  onClick={() => setShowFullDesc((v) => !v)}
                  className="mt-1.5 flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors"
                >
                  {showFullDesc ? <><ChevronUp size={13} /> Show less</> : <><ChevronDown size={13} /> Show more</>}
                </button>
              )}
            </div>
          )}

          {/* My entry */}
          {myEntry && (
            <div className="mt-4">
              <Separator.Root className="h-px bg-white/8 mb-4" />
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge status={myEntry.status as GameStatus} />
                {myEntry.rating && (
                  <span className="flex items-center gap-1 text-yellow-400 text-sm">
                    <Star size={13} fill="currentColor" />
                    <span className="font-bold">{myEntry.rating}/10</span>
                  </span>
                )}
                {myEntry.playtime && (
                  <Text as="span" size="1" color="gray">{myEntry.playtime}h played</Text>
                )}
                {myEntry.review && (
                  <MarkdownReview text={myEntry.review} className="w-full text-gray-400 text-sm line-clamp-2" />
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Stats grid ── */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white/5 backdrop-blur-sm border border-white/8 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-1 text-yellow-400 mb-1">
            <Star size={16} fill="currentColor" />
            <span className="text-xl font-bold">{game.rawgRating?.toFixed(1) ?? "—"}</span>
          </div>
          <Text as="p" size="1" color="gray">RAWG Rating</Text>
        </div>
        <div className="bg-white/5 backdrop-blur-sm border border-white/8 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-1 text-violet-400 mb-1">
            <Star size={16} fill="currentColor" />
            <span className="text-xl font-bold">{game.community.avgRating ?? "—"}</span>
          </div>
          <Text as="p" size="1" color="gray">Community ({game.community.ratingCount})</Text>
        </div>
        <div className="bg-white/5 backdrop-blur-sm border border-white/8 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-1 text-green-400 mb-1">
            <Users size={16} />
            <span className="text-xl font-bold">{totalInLibrary}</span>
          </div>
          <Text as="p" size="1" color="gray">In Libraries</Text>
        </div>
      </div>

      {/* ── Game Info card ── */}
      {hasInfoCard && (
        <div className="bg-white/5 backdrop-blur-sm border border-white/8 rounded-xl p-4 space-y-3">
          <Heading size="2" as="h3" className="text-gray-300">Game Info</Heading>

          {/* Top row: Metacritic + ESRB + Avg playtime */}
          <div className="flex flex-wrap gap-3">
            {game.metacritic && (
              <div className={`flex flex-col items-center justify-center border rounded-lg px-4 py-2 min-w-18 ${metacriticColor(game.metacritic)}`}>
                <span className="text-xl font-bold leading-tight">{game.metacritic}</span>
                <span className="text-xs opacity-70 mt-0.5">Metacritic</span>
              </div>
            )}
            {game.esrbRating && (
              <div className="flex flex-col items-center justify-center border border-gray-600 rounded-lg px-4 py-2 min-w-18 text-gray-300">
                <span className="text-sm font-bold leading-tight">{game.esrbRating}</span>
                <span className="text-xs text-gray-500 mt-0.5">ESRB</span>
              </div>
            )}
            {game.avgPlaytime ? (
              <div className="flex items-center gap-2 text-sm text-gray-300 border border-white/10 rounded-lg px-4 py-2">
                <Clock size={14} className="text-gray-500" />
                <span>~{game.avgPlaytime}h avg. playtime</span>
              </div>
            ) : null}
            {game.website && (
              <a
                href={game.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-violet-400 hover:text-violet-300 border border-violet-400/30 hover:border-violet-400/60 rounded-lg px-4 py-2 transition-colors"
              >
                <Globe size={14} />
                Official Site
              </a>
            )}
          </div>

          {/* Platforms */}
          {(game.platforms?.length ?? 0) > 0 && (
            <div>
              <Separator.Root className="h-px bg-white/8 mb-3" />
              <Flex align="start" gap="3">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 shrink-0 pt-0.5 w-24">
                  <Monitor size={13} />
                  Platforms
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {game.platforms!.map((p) => (
                    <span key={p} className="text-xs text-gray-300 bg-white/8 px-2 py-0.5 rounded-full">{p}</span>
                  ))}
                </div>
              </Flex>
            </div>
          )}

          {/* Developers */}
          {(game.developers?.length ?? 0) > 0 && (
            <Flex align="start" gap="3">
              <div className="flex items-center gap-1.5 text-xs text-gray-500 shrink-0 pt-0.5 w-24">
                <Building2 size={13} />
                {game.developers!.length === 1 ? "Developer" : "Developers"}
              </div>
              <Text as="p" size="2" className="text-gray-300">{game.developers!.join(", ")}</Text>
            </Flex>
          )}

          {/* Publishers */}
          {(game.publishers?.length ?? 0) > 0 && (
            <Flex align="start" gap="3">
              <div className="flex items-center gap-1.5 text-xs text-gray-500 shrink-0 pt-0.5 w-24">
                <Building2 size={13} />
                {game.publishers!.length === 1 ? "Publisher" : "Publishers"}
              </div>
              <Text as="p" size="2" className="text-gray-300">{game.publishers!.join(", ")}</Text>
            </Flex>
          )}
        </div>
      )}

      {/* ── Tags ── */}
      <GameTagsSection rawgId={rawgId} />

      {/* ── Playthroughs (own runs) ── */}
      {myEntry && <PlaythroughsSection entryId={myEntry.id} />}

      {/* ── Community Status ── */}
      {totalInLibrary > 0 && (
        <div className="bg-white/5 backdrop-blur-sm border border-white/8 rounded-xl p-4">
          <Heading size="2" as="h3" className="text-gray-300 mb-3">Community Status</Heading>
          <Flex direction="column" gap="2">
            {Object.entries(game.community.statusCounts).map(([status, count]) => (
              <div key={status} className="flex items-center gap-3">
                <Text as="span" size="1" color="gray" className="w-28">{status.replaceAll("_", " ")}</Text>
                <div className="flex-1 bg-white/8 rounded-full h-2">
                  <div
                    className="bg-violet-600 rounded-full h-2 transition-all"
                    style={{ width: `${(count / totalInLibrary) * 100}%` }}
                  />
                </div>
                <Text as="span" size="1" color="gray" className="w-6 text-right">{count}</Text>
              </div>
            ))}
          </Flex>
        </div>
      )}

      {/* ── Friends playing this ── */}
      {user && friendEntries.length > 0 && (
        <div>
          <Flex align="center" gap="2" className="mb-3">
            <UserCheck size={16} className="text-violet-400" />
            <Heading size="4" as="h2">
              Friends{" "}
              <span className="text-gray-500 font-normal text-sm">({friendEntries.length})</span>
            </Heading>
          </Flex>
          <div className="flex flex-wrap gap-2">
            {friendEntries.map((fe) => (
              <Link
                key={fe.id}
                href={`/user/${fe.user.username}`}
                className="flex items-center gap-2.5 bg-white/5 hover:bg-white/10 border border-white/8 hover:border-violet-500/40 rounded-xl px-3 py-2 transition-colors group"
              >
                <Avatar src={fe.user.avatar} username={fe.user.username} size="sm" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white group-hover:text-violet-300 transition-colors truncate">
                    {fe.user.username}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <StatusBadge status={fe.status as GameStatus} />
                    {fe.rating != null && (
                      <span className="flex items-center gap-0.5 text-xs text-yellow-400">
                        <Star size={10} fill="currentColor" />
                        {fe.rating}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <Flex align="center" justify="between">
        <Heading size="4" as="h2">Reviews</Heading>
        <Link
          href={`/game/${rawgId}/reviews`}
          className="text-sm text-violet-400 hover:text-violet-300 transition-colors"
        >
          See all reviews →
        </Link>
      </Flex>

      {communityActivities.length > 0 && (
        <Flex direction="column" gap="3">
          <Heading size="4" as="h2">Recent Activity</Heading>
          <ErrorBoundary>
            {communityActivities.map((a) => (
              <ActivityCard key={a.id} activity={a} />
            ))}
          </ErrorBoundary>
        </Flex>
      )}
    </div>
  );
}
