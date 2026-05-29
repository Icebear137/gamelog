"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowLeft, GitCompare, Star, Users, Percent } from "lucide-react";
import { Slot } from "@radix-ui/react-slot";
import { Heading, Text, Flex, Box } from "@radix-ui/themes";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import Avatar from "@/components/Avatar";
import StatusBadge from "@/components/StatusBadge";
import { GameStatus } from "@/lib/types";

interface CompareResult {
  user: { username: string; avatar?: string };
  stats: {
    myTotal: number;
    theirTotal: number;
    sharedCount: number;
    overlapPercent: number;
    avgRatingDiff: number | null;
    ratedSharedCount: number;
  };
  sharedGames: {
    game: { id: string; rawgId: number; name: string; coverImage?: string; genres: string[] };
    me: { status: string; rating: number | null };
    them: { status: string; rating: number | null };
  }[];
}

export default function ComparePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);
  const { user: me } = useAuth();
  const router = useRouter();

  const { data, isLoading, error } = useQuery<CompareResult>({
    queryKey: ["compare", username],
    queryFn: () => api.get(`/api/users/${username}/compare`).then((r) => r.data),
    enabled: !!me,
    retry: false,
  });

  if (!me) {
    return (
      <div className="text-center py-16">
        <Text as="p" color="gray">Sign in to compare libraries.</Text>
      </div>
    );
  }

  if (isLoading) return <Text as="p" color="gray" className="py-16 text-center">Loading...</Text>;

  if (error) {
    return (
      <div className="text-center py-16 text-gray-500">
        <GitCompare size={40} className="mx-auto mb-3 opacity-30" />
        <Text as="p" weight="bold" color="gray">Cannot compare</Text>
        <Text as="p" size="2" color="gray" className="mt-1">{(error as any)?.response?.data?.error ?? "Something went wrong."}</Text>
      </div>
    );
  }

  if (!data) return null;

  const { stats, sharedGames } = data;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <Flex align="center" gap="3">
        <Slot
          role="link"
          tabIndex={0}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/8 transition-colors cursor-pointer outline-none"
          onClick={() => router.back()}
          onKeyDown={(e: React.KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") router.back(); }}
        >
          <div><ArrowLeft size={18} /></div>
        </Slot>
        <Flex align="center" gap="3">
          <Avatar src={me.avatar} username={me.username} size="sm" />
          <GitCompare size={18} className="text-violet-400 shrink-0" />
          <Avatar src={data.user.avatar} username={data.user.username} size="sm" />
          <div>
            <Heading size="4" as="h1">
              {me.username} <span className="text-gray-500">vs</span> {data.user.username}
            </Heading>
            <Text as="p" size="1" color="gray">Library comparison</Text>
          </div>
        </Flex>
      </Flex>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          icon={<Users size={16} className="text-violet-400" />}
          label="Your library"
          value={stats.myTotal}
          sub="games"
        />
        <StatCard
          icon={<Users size={16} className="text-sky-400" />}
          label={`${data.user.username}'s`}
          value={stats.theirTotal}
          sub="games"
        />
        <StatCard
          icon={<GitCompare size={16} className="text-green-400" />}
          label="Shared"
          value={stats.sharedCount}
          sub="games in common"
        />
        <StatCard
          icon={<Percent size={16} className="text-yellow-400" />}
          label="Overlap"
          value={`${stats.overlapPercent}%`}
          sub={stats.avgRatingDiff != null ? `avg ${stats.avgRatingDiff} rating diff` : "of libraries"}
        />
      </div>

      {/* Shared games */}
      {sharedGames.length === 0 ? (
        <div className="text-center py-16 bg-white/5 backdrop-blur-sm border border-white/8 rounded-2xl">
          <GitCompare size={40} className="mx-auto mb-3 opacity-30" />
          <Text as="p" weight="bold" color="gray">No games in common</Text>
          <Text as="p" size="2" color="gray" className="mt-1">You and {data.user.username} haven't logged any of the same games yet.</Text>
        </div>
      ) : (
        <div>
          <Heading size="3" as="h2" className="mb-3">
            {sharedGames.length} Shared Game{sharedGames.length !== 1 ? "s" : ""}
          </Heading>
          <div className="space-y-2">
            {sharedGames.map(({ game, me: myEntry, them }) => (
              <Slot
                key={game.id}
                role="link"
                tabIndex={0}
                className="cursor-pointer outline-none block"
                onClick={() => router.push(`/game/${game.rawgId}`)}
                onKeyDown={(e: React.KeyboardEvent) => {
                  if (e.key === "Enter" || e.key === " ") router.push(`/game/${game.rawgId}`);
                }}
              >
                <div className="flex items-center gap-3 bg-white/5 backdrop-blur-sm border border-white/8 hover:border-white/15 rounded-xl p-3 transition-colors">
                  {game.coverImage ? (
                    <img src={game.coverImage} alt={game.name} className="w-10 h-12 object-cover rounded-lg shrink-0" />
                  ) : (
                    <div className="w-10 h-12 bg-white/8 rounded-lg shrink-0" />
                  )}

                  <Box flexGrow="1" minWidth="0">
                    <Text as="p" size="2" weight="bold" className="truncate">{game.name}</Text>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {game.genres.slice(0, 2).map((g) => (
                        <span key={g} className="text-xs text-gray-600 bg-white/8 px-1.5 py-0.5 rounded-full">{g}</span>
                      ))}
                    </div>
                  </Box>

                  {/* My entry */}
                  <div className="shrink-0 text-right space-y-1">
                    <div className="flex items-center gap-1 justify-end">
                      <span className="text-xs text-gray-500">{me.username}</span>
                    </div>
                    <StatusBadge status={myEntry.status as GameStatus} />
                    {myEntry.rating != null && (
                      <div className="flex items-center gap-0.5 justify-end text-yellow-400 text-xs">
                        <Star size={10} fill="currentColor" />
                        <span className="font-bold">{myEntry.rating}</span>
                      </div>
                    )}
                  </div>

                  <div className="w-px h-10 bg-gray-700 shrink-0" />

                  {/* Their entry */}
                  <div className="shrink-0 text-right space-y-1">
                    <div className="flex items-center gap-1 justify-end">
                      <span className="text-xs text-gray-500">{data.user.username}</span>
                    </div>
                    <StatusBadge status={them.status as GameStatus} />
                    {them.rating != null && (
                      <div className="flex items-center gap-0.5 justify-end text-yellow-400 text-xs">
                        <Star size={10} fill="currentColor" />
                        <span className="font-bold">{them.rating}</span>
                      </div>
                    )}
                  </div>
                </div>
              </Slot>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub: string;
}) {
  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/8 rounded-xl p-4 text-center">
      <Flex align="center" justify="center" gap="1" className="mb-1">{icon}</Flex>
      <Text as="p" size="5" weight="bold">{value}</Text>
      <Text as="p" size="1" color="gray" weight="medium" className="mt-0.5">{label}</Text>
      <Text as="p" size="1" color="gray" className="mt-0.5">{sub}</Text>
    </div>
  );
}
