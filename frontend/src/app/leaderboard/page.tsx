"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Trophy, Gamepad2, MessageSquare, Heart, Crown, Medal } from "lucide-react";
import { Heading, Text, Flex, Box } from "@radix-ui/themes";
import { api } from "@/lib/api";
import Avatar from "@/components/Avatar";

type Period   = "week" | "month" | "alltime";
type Category = "games" | "reviews" | "likes";

interface LeaderboardEntry {
  rank: number;
  score: number;
  user: { id: string; username: string; avatar?: string };
}

const PERIODS: { key: Period; label: string }[] = [
  { key: "week",    label: "This Week" },
  { key: "month",   label: "This Month" },
  { key: "alltime", label: "All Time" },
];

const CATEGORIES: { key: Category; label: string; icon: React.ReactNode; unit: string }[] = [
  { key: "games",   label: "Most Completed", icon: <Gamepad2 size={14} />,    unit: "game" },
  { key: "reviews", label: "Most Reviews",   icon: <MessageSquare size={14} />, unit: "review" },
  { key: "likes",   label: "Most Liked",     icon: <Heart size={14} />,         unit: "like" },
];

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Crown   size={18} className="text-yellow-400" />;
  if (rank === 2) return <Medal   size={18} className="text-gray-300" />;
  if (rank === 3) return <Medal   size={18} className="text-amber-600" />;
  return <span className="text-sm font-bold text-gray-500 w-4.5 text-center">{rank}</span>;
}

export default function LeaderboardPage() {
  const [period,   setPeriod]   = useState<Period>("week");
  const [category, setCategory] = useState<Category>("games");

  const { data: entries = [], isLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ["leaderboard", period, category],
    queryFn:  () => api.get(`/api/feed/leaderboard?period=${period}&category=${category}`).then((r) => r.data),
    staleTime: 5 * 60_000,
  });

  const currentCat = CATEGORIES.find((c) => c.key === category)!;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <Box>
        <Heading size="6" className="flex items-center gap-2">
          <Trophy size={22} className="text-yellow-400" />
          Leaderboard
        </Heading>
        <Text as="p" size="2" color="gray" className="mt-1">
          Top players in the GameLog community.
        </Text>
      </Box>

      {/* Filters */}
      <Flex direction="column" gap="3">
        {/* Period tabs */}
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                period === p.key
                  ? "bg-violet-600 text-white"
                  : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Category tabs */}
        <div className="flex gap-1">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              onClick={() => setCategory(c.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                category === c.key
                  ? "bg-violet-600/20 text-violet-300 border border-violet-500/40"
                  : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-transparent"
              }`}
            >
              {c.icon}
              {c.label}
            </button>
          ))}
        </div>
      </Flex>

      {/* Table */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/8 rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-white/6">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3.5 animate-pulse">
                <div className="w-5 h-5 bg-white/10 rounded" />
                <div className="w-8 h-8 bg-white/10 rounded-full" />
                <div className="flex-1 h-3 bg-white/10 rounded w-32" />
                <div className="h-3 bg-white/10 rounded w-16" />
              </div>
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="py-16 text-center">
            <Trophy size={36} className="mx-auto mb-3 opacity-20 text-gray-500" />
            <Text as="p" size="2" color="gray">No data yet for this period.</Text>
          </div>
        ) : (
          <div className="divide-y divide-white/6">
            {entries.map((e) => (
              <Link
                key={e.user.id}
                href={`/user/${e.user.username}`}
                className={`flex items-center gap-4 px-5 py-3.5 hover:bg-white/5 transition-colors ${
                  e.rank <= 3 ? "bg-white/3" : ""
                }`}
              >
                {/* Rank */}
                <div className="w-5 flex justify-center shrink-0">
                  <RankIcon rank={e.rank} />
                </div>

                {/* Avatar + name */}
                <Avatar src={e.user.avatar} username={e.user.username} size="sm" />
                <Text
                  as="span"
                  size="2"
                  className={`flex-1 font-medium truncate ${e.rank === 1 ? "text-yellow-300" : e.rank <= 3 ? "text-white" : "text-gray-200"}`}
                >
                  {e.user.username}
                </Text>

                {/* Score */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`text-sm font-bold ${e.rank === 1 ? "text-yellow-400" : "text-violet-400"}`}>
                    {e.score}
                  </span>
                  <span className="text-xs text-gray-500">
                    {currentCat.unit}{e.score !== 1 ? "s" : ""}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
