"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Slot } from "@radix-ui/react-slot";
import * as Select from "@radix-ui/react-select";
import * as Separator from "@radix-ui/react-separator";
import { ArrowLeft, Star, Clock, Gamepad2, ChevronDown, BarChart3, TrendingUp } from "lucide-react";
import { api } from "@/lib/api";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: "bg-green-500",
  PLAYING: "bg-blue-500",
  WANT_TO_PLAY: "bg-violet-500",
  DROPPED: "bg-red-500",
};
const STATUS_LABELS: Record<string, string> = {
  COMPLETED: "Completed",
  PLAYING: "Playing",
  WANT_TO_PLAY: "Want to Play",
  DROPPED: "Dropped",
};

interface Stats {
  year: number;
  totalGames: number;
  statusCounts: Record<string, number>;
  genreBreakdown: [string, number][];
  avgRating: number | null;
  totalPlaytime: number;
  byMonth: number[];
  topRated: { name: string; rawgId: number; coverImage?: string; rating: number }[];
}

export default function StatsPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);
  const router = useRouter();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(String(currentYear));

  const yearOptions = Array.from({ length: 5 }, (_, i) => String(currentYear - i));

  const { data: stats, isLoading, isError } = useQuery<Stats>({
    queryKey: ["user-stats", username, year],
    queryFn: () => api.get(`/api/users/${username}/stats?year=${year}`).then((r) => r.data),
  });

  const maxMonth = stats ? Math.max(...stats.byMonth, 1) : 1;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Slot
          role="link"
          tabIndex={0}
          className="inline-flex items-center gap-1.5 text-gray-400 hover:text-white text-sm transition-colors cursor-pointer outline-none"
          onClick={() => router.push(`/user/${username}`)}
          onKeyDown={(e: React.KeyboardEvent) => {
            if (e.key === "Enter" || e.key === " ") router.push(`/user/${username}`);
          }}
        >
          <div className="inline-flex items-center gap-1.5">
            <ArrowLeft size={16} />
            {username}
          </div>
        </Slot>

        <Select.Root value={year} onValueChange={setYear}>
          <Select.Trigger className="flex items-center gap-1.5 bg-white/5 backdrop-blur-sm border border-white/8 hover:border-gray-600 rounded-lg px-3 py-1.5 text-sm text-gray-300 outline-none transition-colors">
            <Select.Value>{year}</Select.Value>
            <Select.Icon><ChevronDown size={14} className="text-gray-500" /></Select.Icon>
          </Select.Trigger>
          <Select.Portal>
            <Select.Content className="bg-white/5 backdrop-blur-sm border border-white/15 rounded-xl p-1 shadow-xl z-50" position="popper" sideOffset={4}>
              <Select.Viewport>
                {yearOptions.map((y) => (
                  <Select.Item key={y} value={y} className="px-3 py-2 text-sm text-gray-300 hover:bg-white/8 rounded-lg outline-none cursor-pointer data-highlighted:bg-white/8 data-[state=checked]:text-white">
                    <Select.ItemText>{y}</Select.ItemText>
                  </Select.Item>
                ))}
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>
      </div>

      <div className="flex items-center gap-3">
        <BarChart3 size={22} className="text-violet-400" />
        <h1 className="text-2xl font-bold">{year} in Review</h1>
      </div>

      {isLoading && <div className="text-gray-500 text-sm py-16 text-center">Loading stats...</div>}
      {isError && <div className="text-gray-500 text-sm py-16 text-center">Could not load stats.</div>}

      {stats && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/5 backdrop-blur-sm border border-white/8 rounded-xl p-4 text-center">
              <div className="flex items-center justify-center gap-1 text-violet-400 mb-1">
                <Gamepad2 size={16} />
                <span className="text-2xl font-bold">{stats.totalGames}</span>
              </div>
              <p className="text-gray-500 text-xs">Games logged</p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm border border-white/8 rounded-xl p-4 text-center">
              <div className="flex items-center justify-center gap-1 text-yellow-400 mb-1">
                <Star size={16} fill="currentColor" />
                <span className="text-2xl font-bold">{stats.avgRating ?? "—"}</span>
              </div>
              <p className="text-gray-500 text-xs">Avg rating</p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm border border-white/8 rounded-xl p-4 text-center">
              <div className="flex items-center justify-center gap-1 text-green-400 mb-1">
                <Clock size={16} />
                <span className="text-2xl font-bold">{stats.totalPlaytime}</span>
              </div>
              <p className="text-gray-500 text-xs">Hours played</p>
            </div>
          </div>

          {stats.totalGames === 0 ? (
            <div className="text-center py-16 text-gray-500 bg-white/5 backdrop-blur-sm border border-white/8 rounded-2xl">
              <Gamepad2 size={40} className="mx-auto mb-3 opacity-30" />
              <p>No activity in {year}.</p>
            </div>
          ) : (
            <>
              {/* Activity by month */}
              <div className="bg-white/5 backdrop-blur-sm border border-white/8 rounded-2xl p-6">
                <h2 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
                  <TrendingUp size={15} className="text-violet-400" />
                  Activity by month
                </h2>
                <div className="flex items-end gap-1.5 h-28">
                  {stats.byMonth.map((count, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full flex items-end justify-center" style={{ height: "80px" }}>
                        <div
                          className="w-full bg-violet-600 rounded-t opacity-80 hover:opacity-100 transition-opacity"
                          style={{ height: `${Math.max((count / maxMonth) * 80, count > 0 ? 4 : 0)}px` }}
                          title={`${count} activities`}
                        />
                      </div>
                      <span className="text-gray-600 text-[10px]">{MONTHS[i]}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status breakdown */}
              {Object.keys(stats.statusCounts).length > 0 && (
                <div className="bg-white/5 backdrop-blur-sm border border-white/8 rounded-2xl p-6">
                  <h2 className="text-sm font-semibold text-gray-300 mb-4">Status breakdown</h2>
                  <div className="space-y-3">
                    {Object.entries(stats.statusCounts).map(([status, count]) => (
                      <div key={status} className="flex items-center gap-3">
                        <span className="text-gray-400 text-xs w-24 shrink-0">
                          {STATUS_LABELS[status] ?? status}
                        </span>
                        <div className="flex-1 bg-white/8 rounded-full h-2">
                          <div
                            className={`${STATUS_COLORS[status] ?? "bg-gray-500"} rounded-full h-2 transition-all`}
                            style={{ width: `${(count / stats.totalGames) * 100}%` }}
                          />
                        </div>
                        <span className="text-gray-400 text-xs w-6 text-right shrink-0">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Genre breakdown */}
              {stats.genreBreakdown.length > 0 && (
                <div className="bg-white/5 backdrop-blur-sm border border-white/8 rounded-2xl p-6">
                  <h2 className="text-sm font-semibold text-gray-300 mb-4">Top genres</h2>
                  <div className="space-y-3">
                    {stats.genreBreakdown.map(([genre, count]) => (
                      <div key={genre} className="flex items-center gap-3">
                        <span className="text-gray-400 text-xs w-28 shrink-0 truncate">{genre}</span>
                        <div className="flex-1 bg-white/8 rounded-full h-2">
                          <div
                            className="bg-violet-500 rounded-full h-2 transition-all"
                            style={{ width: `${(count / stats.genreBreakdown[0][1]) * 100}%` }}
                          />
                        </div>
                        <span className="text-gray-400 text-xs w-6 text-right shrink-0">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Top rated */}
              {stats.topRated.length > 0 && (
                <div className="bg-white/5 backdrop-blur-sm border border-white/8 rounded-2xl p-6">
                  <h2 className="text-sm font-semibold text-gray-300 mb-4">Top rated this year</h2>
                  <div className="space-y-3">
                    {stats.topRated.map((g, i) => (
                      <div key={g.rawgId}>
                        <Slot
                          role="link"
                          tabIndex={0}
                          className="flex items-center gap-3 cursor-pointer outline-none group"
                          onClick={() => router.push(`/game/${g.rawgId}`)}
                          onKeyDown={(e: React.KeyboardEvent) => {
                            if (e.key === "Enter" || e.key === " ") router.push(`/game/${g.rawgId}`);
                          }}
                        >
                          <div className="flex items-center gap-3 w-full">
                            <span className="text-gray-600 text-sm w-4 shrink-0">{i + 1}</span>
                            {g.coverImage ? (
                              <img src={g.coverImage} alt={g.name} loading="lazy" decoding="async" className="w-10 h-12 object-cover rounded-lg shrink-0" />
                            ) : (
                              <div className="w-10 h-12 bg-white/8 rounded-lg shrink-0 flex items-center justify-center">
                                <Gamepad2 size={14} className="text-gray-600" />
                              </div>
                            )}
                            <span className="text-sm text-gray-300 group-hover:text-white transition-colors truncate flex-1">
                              {g.name}
                            </span>
                            <div className="flex items-center gap-1 text-yellow-400 shrink-0">
                              <Star size={13} fill="currentColor" />
                              <span className="text-sm font-bold">{g.rating}</span>
                            </div>
                          </div>
                        </Slot>
                        {i < stats.topRated.length - 1 && <Separator.Root className="h-px bg-white/8 mt-3" />}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
