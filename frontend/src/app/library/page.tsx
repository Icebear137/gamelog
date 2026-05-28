"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Star, Clock, Gamepad2, Pencil, Trash2, Trophy, BarChart3, ChevronDown, Monitor } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { GameEntry, GamePlatform, GameStatus } from "@/lib/types";
import { dispatchToast } from "@/lib/toast";
import StatusBadge from "@/components/StatusBadge";
import AddGameModal from "@/components/AddGameModal";
import * as Tabs from "@radix-ui/react-tabs";
import * as Select from "@radix-ui/react-select";

const TABS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "PLAYING", label: "Playing" },
  { value: "COMPLETED", label: "Completed" },
  { value: "WANT_TO_PLAY", label: "Want to Play" },
  { value: "DROPPED", label: "Dropped" },
];

const SORT_OPTIONS = [
  { value: "updated", label: "Recently Updated" },
  { value: "added", label: "Date Added" },
  { value: "name-asc", label: "Name A → Z" },
  { value: "name-desc", label: "Name Z → A" },
  { value: "rating-desc", label: "Rating (High → Low)" },
  { value: "playtime-desc", label: "Playtime (High → Low)" },
];

function sortEntries(entries: GameEntry[], sort: string): GameEntry[] {
  return [...entries].sort((a, b) => {
    switch (sort) {
      case "name-asc": return a.game.name.localeCompare(b.game.name);
      case "name-desc": return b.game.name.localeCompare(a.game.name);
      case "rating-desc": return (b.rating ?? 0) - (a.rating ?? 0);
      case "playtime-desc": return (b.playtime ?? 0) - (a.playtime ?? 0);
      case "added": return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      default: return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    }
  });
}

export default function LibraryPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [sort, setSort] = useState("updated");
  const [genreFilter, setGenreFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  const { data: entries = [], isLoading } = useQuery<GameEntry[]>({
    queryKey: ["my-entries"],
    queryFn: () => api.get("/api/entries/me").then((r) => r.data),
    enabled: !!user,
  });

  const allGenres = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => e.game.genres?.forEach((g) => set.add(g)));
    return Array.from(set).sort();
  }, [entries]);

  const allPlatforms = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => { if (e.platform) set.add(e.platform); });
    return Array.from(set).sort() as GamePlatform[];
  }, [entries]);

  const filteredEntries = useMemo(() => {
    let result = entries;
    if (genreFilter !== "all") {
      result = result.filter((e) => e.game.genres?.includes(genreFilter));
    }
    if (platformFilter !== "all") {
      result = result.filter((e) => e.platform === platformFilter);
    }
    return result;
  }, [entries, genreFilter, platformFilter]);

  if (loading || !user) return null;

  const completed = entries.filter((e) => e.status === "COMPLETED").length;
  const totalPlaytime = entries.reduce((sum, e) => sum + (e.playtime ?? 0), 0);
  const ratedEntries = entries.filter((e) => e.rating != null);
  const avgRating =
    ratedEntries.length > 0
      ? (ratedEntries.reduce((sum, e) => sum + e.rating!, 0) / ratedEntries.length).toFixed(1)
      : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold">My Library</h1>
        <AddGameModal />
      </div>

      {entries.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-white/5 backdrop-blur-sm border border-white/8 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-white">{entries.length}</p>
            <p className="text-gray-500 text-xs mt-0.5">Total Games</p>
          </div>
          <div className="bg-white/5 backdrop-blur-sm border border-white/8 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-green-400 mb-0.5">
              <Trophy size={14} />
              <p className="text-2xl font-bold">{completed}</p>
            </div>
            <p className="text-gray-500 text-xs">Completed</p>
          </div>
          <div className="bg-white/5 backdrop-blur-sm border border-white/8 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-blue-400 mb-0.5">
              <Clock size={14} />
              <p className="text-2xl font-bold">{totalPlaytime}</p>
            </div>
            <p className="text-gray-500 text-xs">Hours Played</p>
          </div>
          <div className="bg-white/5 backdrop-blur-sm border border-white/8 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-yellow-400 mb-0.5">
              <BarChart3 size={14} />
              <p className="text-2xl font-bold">{avgRating ?? "—"}</p>
            </div>
            <p className="text-gray-500 text-xs">Avg Rating</p>
          </div>
        </div>
      )}

      <Tabs.Root defaultValue="all">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <Tabs.List className="flex gap-1 bg-white/5 backdrop-blur-sm border border-white/8 rounded-xl p-1 w-fit">
            {TABS.map((t) => (
              <Tabs.Trigger
                key={t.value}
                value={t.value}
                className="px-3 py-1.5 text-sm rounded-lg text-gray-400 data-[state=active]:bg-violet-600 data-[state=active]:text-white transition-colors whitespace-nowrap"
              >
                {t.label}
              </Tabs.Trigger>
            ))}
          </Tabs.List>

          <div className="flex gap-2 flex-wrap">
            {allPlatforms.length > 0 && (
              <RadixSelect
                value={platformFilter}
                onValueChange={setPlatformFilter}
                options={[{ value: "all", label: "All Platforms" }, ...allPlatforms.map((p) => ({ value: p, label: p }))]}
                placeholder="Platform"
              />
            )}
            {allGenres.length > 0 && (
              <RadixSelect
                value={genreFilter}
                onValueChange={setGenreFilter}
                options={[{ value: "all", label: "All Genres" }, ...allGenres.map((g) => ({ value: g, label: g }))]}
                placeholder="Genre"
              />
            )}
            <RadixSelect
              value={sort}
              onValueChange={setSort}
              options={SORT_OPTIONS}
              placeholder="Sort by"
            />
          </div>
        </div>

        {TABS.map((t) => {
          const tabEntries = t.value === "all"
            ? filteredEntries
            : filteredEntries.filter((e) => e.status === t.value);
          return (
            <Tabs.Content key={t.value} value={t.value}>
              <GameGrid entries={sortEntries(tabEntries, sort)} loading={isLoading} />
            </Tabs.Content>
          );
        })}
      </Tabs.Root>
    </div>
  );
}

function RadixSelect({
  value, onValueChange, options, placeholder,
}: {
  value: string;
  onValueChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
}) {
  const current = options.find((o) => o.value === value);
  return (
    <Select.Root value={value} onValueChange={onValueChange}>
      <Select.Trigger className="flex items-center gap-1.5 bg-white/5 backdrop-blur-sm border border-white/8 hover:border-white/20 rounded-lg px-3 py-1.5 text-sm text-gray-300 outline-none transition-colors min-w-36">
        <Select.Value>{current?.label ?? placeholder}</Select.Value>
        <Select.Icon className="ml-auto">
          <ChevronDown size={14} className="text-gray-500" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-1 shadow-xl z-50"
          position="popper"
          sideOffset={4}
        >
          <Select.Viewport>
            {options.map((o) => (
              <Select.Item
                key={o.value}
                value={o.value}
                className="px-3 py-2 text-sm text-gray-300 hover:bg-white/8 rounded-lg outline-none cursor-pointer data-highlighted:bg-white/8 data-[state=checked]:text-white"
              >
                <Select.ItemText>{o.label}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}

function GameGrid({ entries, loading }: { entries: GameEntry[]; loading: boolean }) {
  if (loading) return <div className="text-gray-500 text-sm">Loading...</div>;
  if (entries.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        <Gamepad2 size={40} className="mx-auto mb-3 opacity-30" />
        <p>No games here yet.</p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {entries.map((entry) => (
        <GameCard key={entry.id} entry={entry} />
      ))}
    </div>
  );
}

function GameCard({ entry }: { entry: GameEntry }) {
  const qc = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/api/entries/${entry.game.rawgId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-entries"] });
      dispatchToast("Removed from library", "success");
    },
    onError: (err: any) => {
      dispatchToast(err?.response?.data?.error ?? "Failed to remove", "error");
    },
  });

  return (
    <div className="group relative">
      <Link href={`/game/${entry.game.rawgId}`}>
        <div className="relative rounded-xl overflow-hidden bg-white/5 backdrop-blur-sm border border-white/8 group-hover:border-violet-700 transition-colors">
          {entry.game.coverImage ? (
            <img src={entry.game.coverImage} alt={entry.game.name} loading="lazy" decoding="async" className="w-full aspect-3/4 object-cover" />
          ) : (
            <div className="w-full aspect-3/4 bg-white/8 flex items-center justify-center">
              <Gamepad2 size={32} className="text-gray-600" />
            </div>
          )}
          <div className="absolute bottom-0 inset-x-0 bg-linear-to-t from-black/90 via-black/50 to-transparent p-2">
            <StatusBadge status={entry.status as GameStatus} />
            {entry.rating && (
              <div className="flex items-center gap-1 text-yellow-400 text-xs mt-1">
                <Star size={11} fill="currentColor" />
                <span>{entry.rating}/10</span>
              </div>
            )}
            {entry.platform && (
              <div className="flex items-center gap-1 text-gray-300 text-xs mt-0.5">
                <Monitor size={10} />
                <span>{entry.platform}</span>
              </div>
            )}
          </div>
        </div>
        <p className="text-xs text-gray-300 mt-1.5 font-medium truncate group-hover:text-white transition-colors">
          {entry.game.name}
        </p>
      </Link>

      <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <AddGameModal
          preselectedGame={entry.game}
          initialValues={{
            status: entry.status as GameStatus,
            rating: entry.rating,
            review: entry.review,
            playtime: entry.playtime,
          }}
          trigger={
            <button
              className="bg-white/5 backdrop-blur-sm/80 backdrop-blur hover:bg-white/8 text-white p-1.5 rounded-lg transition-colors"
              title="Edit entry"
            >
              <Pencil size={11} />
            </button>
          }
        />
        <button
          onClick={() => deleteMutation.mutate()}
          disabled={deleteMutation.isPending}
          className="bg-white/5 backdrop-blur-sm/80 backdrop-blur hover:bg-red-900/80 text-white hover:text-red-400 p-1.5 rounded-lg transition-colors disabled:opacity-50"
          title="Remove from library"
        >
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  );
}

