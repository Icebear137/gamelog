"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { Star, Users, Tag, BookOpen } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { GameEntry, GameStatus, Activity } from "@/lib/types";
import * as Separator from "@radix-ui/react-separator";
import AddGameModal from "@/components/AddGameModal";
import AddToListModal from "@/components/AddToListModal";
import StatusBadge from "@/components/StatusBadge";
import ActivityCard from "@/components/ActivityCard";
import ErrorBoundary from "@/components/ErrorBoundary";
import MarkdownReview from "@/components/MarkdownReview";

interface GameDetail {
  id: string;
  rawgId: number;
  name: string;
  coverImage?: string;
  genres: string[];
  releaseYear?: number;
  rawgRating?: number;
  community: {
    avgRating: number | null;
    ratingCount: number;
    statusCounts: Record<string, number>;
  };
}

export default function GamePage({ params }: { params: Promise<{ rawgId: string }> }) {
  const { rawgId } = use(params);
  const { user } = useAuth();

  const { data: game, isLoading } = useQuery<GameDetail>({
    queryKey: ["game", rawgId],
    queryFn: () => api.get(`/api/games/${rawgId}`).then((r) => r.data),
  });

  const { data: myEntries = [] } = useQuery<GameEntry[]>({
    queryKey: ["my-entries"],
    queryFn: () => api.get("/api/entries/me").then((r) => r.data),
    enabled: !!user,
  });

  const { data: communityActivities = [] } = useQuery<Activity[]>({
    queryKey: ["game-activities", rawgId],
    queryFn: () => api.get(`/api/games/${rawgId}/activities`).then((r) => r.data),
    enabled: !!game,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });

  if (isLoading) return <div className="text-gray-500 py-16 text-center">Loading...</div>;
  if (!game) return <div className="text-gray-500 py-16 text-center">Game not found</div>;

  const myEntry = myEntries.find((e) => e.game.rawgId === parseInt(rawgId));
  const totalInLibrary = Object.values(game.community.statusCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white/5 backdrop-blur-sm border border-white/8 rounded-2xl overflow-hidden">
        {game.coverImage && (
          <div className="relative h-52 overflow-hidden">
            <img src={game.coverImage} alt={game.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-linear-to-t from-gray-900 via-gray-900/40 to-transparent" />
          </div>
        )}
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">{game.name}</h1>
              {game.releaseYear && <p className="text-gray-400 text-sm mt-1">{game.releaseYear}</p>}
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
          </div>

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
                  <span className="text-gray-400 text-xs">{myEntry.playtime}h played</span>
                )}
                {myEntry.review && (
                  <MarkdownReview text={myEntry.review} className="w-full text-gray-400 text-sm line-clamp-2" />
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white/5 backdrop-blur-sm border border-white/8 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-1 text-yellow-400 mb-1">
            <Star size={16} fill="currentColor" />
            <span className="text-xl font-bold">{game.rawgRating?.toFixed(1) ?? "—"}</span>
          </div>
          <p className="text-gray-500 text-xs">RAWG Rating</p>
        </div>
        <div className="bg-white/5 backdrop-blur-sm border border-white/8 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-1 text-violet-400 mb-1">
            <Star size={16} fill="currentColor" />
            <span className="text-xl font-bold">{game.community.avgRating ?? "—"}</span>
          </div>
          <p className="text-gray-500 text-xs">Community ({game.community.ratingCount})</p>
        </div>
        <div className="bg-white/5 backdrop-blur-sm border border-white/8 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-1 text-green-400 mb-1">
            <Users size={16} />
            <span className="text-xl font-bold">{totalInLibrary}</span>
          </div>
          <p className="text-gray-500 text-xs">In Libraries</p>
        </div>
      </div>

      {totalInLibrary > 0 && (
        <div className="bg-white/5 backdrop-blur-sm border border-white/8 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-gray-300 mb-3">Community Status</h2>
          <div className="space-y-2">
            {Object.entries(game.community.statusCounts).map(([status, count]) => (
              <div key={status} className="flex items-center gap-3">
                <span className="text-gray-400 text-xs w-28">{status.replaceAll("_", " ")}</span>
                <div className="flex-1 bg-white/8 rounded-full h-2">
                  <div
                    className="bg-violet-600 rounded-full h-2 transition-all"
                    style={{ width: `${(count / totalInLibrary) * 100}%` }}
                  />
                </div>
                <span className="text-gray-400 text-xs w-6 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Reviews</h2>
        <Link
          href={`/game/${rawgId}/reviews`}
          className="text-sm text-violet-400 hover:text-violet-300 transition-colors"
        >
          See all reviews →
        </Link>
      </div>

      {communityActivities.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold">Recent Activity</h2>
          <ErrorBoundary>
            {communityActivities.map((a) => (
              <ActivityCard key={a.id} activity={a} />
            ))}
          </ErrorBoundary>
        </div>
      )}
    </div>
  );
}
