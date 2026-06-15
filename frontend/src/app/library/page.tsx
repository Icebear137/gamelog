"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Clock, Trophy, BarChart3, Download, Gamepad2 } from "lucide-react";
import clsx from "clsx";
import { gx } from "@/lib/gx-styles";
import { EnvConstant } from "@/constant";
import { getMyEntriesService } from "@/services/entry.service";
import { useAuth } from "@/lib/auth-context";
import { GameEntry, GamePlatform } from "@/lib/types";
import * as Tabs from "@radix-ui/react-tabs";
import { RadixSelect } from "@/components/ui";
import AddGameModal from "@/components/AddGameModal";
import { GameGrid } from "./_components/GameGrid";

const TABS = [
  { value: "all",           label: "All"          },
  { value: "PLAYING",       label: "Playing"      },
  { value: "COMPLETED",     label: "Completed"    },
  { value: "WANT_TO_PLAY",  label: "Want to Play" },
  { value: "DROPPED",       label: "Dropped"      },
];

const SORT_OPTIONS = [
  { value: "updated",       label: "Recently Updated"    },
  { value: "added",         label: "Date Added"          },
  { value: "name-asc",      label: "Name A → Z"          },
  { value: "name-desc",     label: "Name Z → A"          },
  { value: "rating-desc",   label: "Rating (High → Low)" },
  { value: "playtime-desc", label: "Playtime (High → Low)" },
];

function sortEntries(entries: GameEntry[], sort: string): GameEntry[] {
  return [...entries].sort((a, b) => {
    switch (sort) {
      case "name-asc":      return a.game.name.localeCompare(b.game.name);
      case "name-desc":     return b.game.name.localeCompare(a.game.name);
      case "rating-desc":   return (b.rating ?? 0) - (a.rating ?? 0);
      case "playtime-desc": return (b.playtime ?? 0) - (a.playtime ?? 0);
      case "added":         return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      default:              return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
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

  const completed     = entries.filter((e) => e.status === "COMPLETED").length;
  const totalPlaytime = entries.reduce((sum, e) => sum + (e.playtime ?? 0), 0);
  const ratedEntries  = entries.filter((e) => e.rating != null);
  const avgRating = ratedEntries.length > 0
    ? (ratedEntries.reduce((sum, e) => sum + e.rating!, 0) / ratedEntries.length).toFixed(1)
    : null;

  const STATS = [
    { icon: <Gamepad2 size={14} color="var(--gx-text-2)" />, value: entries.length,       label: "Total Games",  color: "var(--gx-text-1)" },
    { icon: <Trophy   size={14} color="var(--gx-green)"   />, value: completed,            label: "Completed",    color: "var(--gx-green)"  },
    { icon: <Clock    size={14} color="var(--gx-teal)"    />, value: totalPlaytime,         label: "Hours Played", color: "var(--gx-teal)"   },
    { icon: <BarChart3 size={14} color="#F59E0B"          />, value: avgRating ?? "—",     label: "Avg Rating",   color: "#F59E0B"           },
  ];

  return (
    <div className="flex flex-col gap-5">

      {/* ── HEADER ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 className={gx.sectionLabel} style={{ fontSize: 24 }}>My Library</h1>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <ExportButton />
          <AddGameModal />
        </div>
      </div>

      {/* ── STATS ── */}
      {entries.length > 0 && (
        <div className="grid grid-cols-4 gap-2.5 max-[480px]:grid-cols-2">
          {STATS.map(({ icon, value, label, color }) => (
            <div key={label} className="bg-gx-surface border border-gx-border rounded-xl px-4 py-3.5 text-center">
              <div className="mb-1">{icon}</div>
              <p className="font-bebas text-[28px] leading-none text-gx-text-1" style={{ color }}>{value}</p>
              <p className="text-[9px] font-bold tracking-widest uppercase text-gx-text-3 mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── TABS + FILTERS ── */}
      <Tabs.Root defaultValue="all">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
          <Tabs.List className="flex gap-1 bg-gx-surface border border-gx-border rounded-xl p-1 w-fit">
            {TABS.map((t) => (
              <Tabs.Trigger
                key={t.value}
                value={t.value}
                className={clsx(
                  "px-3.5 py-[7px] rounded-[9px] text-xs font-semibold text-gx-text-2",
                  "cursor-pointer bg-transparent border-none whitespace-nowrap transition-colors",
                  "data-[state=active]:bg-gx-amber data-[state=active]:text-gx-ink",
                  "data-[state=inactive]:hover:text-gx-text-1",
                )}
              >
                {t.label}
              </Tabs.Trigger>
            ))}
          </Tabs.List>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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

/* ── Export button ── */
function ExportButton() {
  const [open, setOpen] = useState(false);

  function download(format: "csv" | "json") {
    const token = localStorage.getItem("token");
    const url   = `${EnvConstant.API_URL}/api/entries/export?format=${format}`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob())
      .then((blob) => {
        const a     = document.createElement("a");
        a.href      = URL.createObjectURL(blob);
        a.download  = `gamelog-library.${format}`;
        a.click();
        URL.revokeObjectURL(a.href);
      });
    setOpen(false);
  }

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={gx.btnGhost}
        style={{ fontSize: 12, padding: "7px 12px" }}
      >
        <Download size={13} /> Export
      </button>
      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 10 }} onClick={() => setOpen(false)} />
          <div style={{
            position: "absolute", right: 0, top: "calc(100% + 6px)", zIndex: 20,
            background: "var(--gx-surface-2)", border: "1px solid var(--gx-border-md)",
            borderRadius: 10, overflow: "hidden", boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            minWidth: 140,
          }}>
            {(["csv", "json"] as const).map((fmt) => (
              <button
                key={fmt}
                onClick={() => download(fmt)}
                style={{
                  width: "100%", textAlign: "left", padding: "10px 16px",
                  fontSize: 13, color: "var(--gx-text-1)", background: "none", border: "none",
                  cursor: "pointer", transition: "background 0.12s",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--gx-surface-3)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
              >
                Download {fmt.toUpperCase()}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
