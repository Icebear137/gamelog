"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Clock, Trophy, BarChart3, Download } from "lucide-react";
import { EnvConstant } from "@/constant";
import { getMyEntriesService } from "@/services/entry.service";
import { useAuth } from "@/lib/auth-context";
import { GameEntry, GamePlatform } from "@/lib/types";
import { useState } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { RadixSelect } from "@/components/ui";
import AddGameModal from "@/components/AddGameModal";
import { GameGrid } from "./_components/GameGrid";
import { Text, Heading, Flex, Grid } from "@radix-ui/themes";

const TABS = [
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
    queryFn: () => getMyEntriesService(),
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
    if (genreFilter !== "all") result = result.filter((e) => e.game.genres?.includes(genreFilter));
    if (platformFilter !== "all") result = result.filter((e) => e.platform === platformFilter);
    return result;
  }, [entries, genreFilter, platformFilter]);

  if (loading || !user) return null;

  const completed = entries.filter((e) => e.status === "COMPLETED").length;
  const totalPlaytime = entries.reduce((sum, e) => sum + (e.playtime ?? 0), 0);
  const ratedEntries = entries.filter((e) => e.rating != null);
  const avgRating = ratedEntries.length > 0
    ? (ratedEntries.reduce((sum, e) => sum + e.rating!, 0) / ratedEntries.length).toFixed(1)
    : null;

  return (
    <div>
      <Flex align="center" justify="between" className="mb-5">
        <Heading size="6">My Library</Heading>
        <Flex gap="2" align="center">
          <ExportButton />
          <AddGameModal />
        </Flex>
      </Flex>

      {entries.length > 0 && (
        <Grid columns={{ initial: "2", sm: "4" }} gap="3" className="mb-6">
          {[
            { value: entries.length, label: "Total Games", color: "text-white" },
            { value: completed, label: "Completed", color: "text-green-400", icon: <Trophy size={14} /> },
            { value: totalPlaytime, label: "Hours Played", color: "text-blue-400", icon: <Clock size={14} /> },
            { value: avgRating ?? "—", label: "Avg Rating", color: "text-yellow-400", icon: <BarChart3 size={14} /> },
          ].map(({ value, label, color, icon }) => (
            <div key={label} className="bg-white/5 backdrop-blur-sm border border-white/8 rounded-xl p-3 text-center">
              <Flex align="center" justify="center" gap="1" className={`${color} mb-0.5`}>
                {icon}
                <Text as="p" size="6" weight="bold">{value}</Text>
              </Flex>
              <Text as="p" size="1" color="gray">{label}</Text>
            </div>
          ))}
        </Grid>
      )}

      <Tabs.Root defaultValue="all">
        <Flex align="center" justify="between" className="flex-wrap gap-3 mb-4">
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

          <Flex gap="2" className="flex-wrap">
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
            <RadixSelect value={sort} onValueChange={setSort} options={SORT_OPTIONS} placeholder="Sort by" />
          </Flex>
        </Flex>

        {TABS.map((t) => {
          const tabEntries = t.value === "all" ? filteredEntries : filteredEntries.filter((e) => e.status === t.value);
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

// ── Export button ─────────────────────────────────────────────────────────────

function ExportButton() {
  const [open, setOpen] = useState(false);

  function download(format: "csv" | "json") {
    const token = localStorage.getItem("token");
    const url   = `${EnvConstant.API_URL}/api/entries/export?format=${format}`;
    const a     = document.createElement("a");
    a.href      = url;
    // Pass token via fetch to get the file, then create blob URL
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob())
      .then((blob) => {
        a.href     = URL.createObjectURL(blob);
        a.download = `gamelog-library.${format}`;
        a.click();
        URL.revokeObjectURL(a.href);
      });
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-gray-400 bg-white/5 border border-white/10 hover:border-white/20 hover:text-white transition-colors"
        title="Export library"
      >
        <Download size={14} />
        Export
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 bg-zinc-950 border border-white/10 rounded-xl overflow-hidden shadow-xl min-w-36">
            <button
              onClick={() => download("csv")}
              className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-white/8 transition-colors"
            >
              Download CSV
            </button>
            <button
              onClick={() => download("json")}
              className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-white/8 transition-colors"
            >
              Download JSON
            </button>
          </div>
        </>
      )}
    </div>
  );
}
