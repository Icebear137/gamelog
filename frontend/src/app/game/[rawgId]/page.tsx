"use client";

import { use, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Star, Users, Tag, BookOpen, Clock, Globe, Monitor, Building2,
  ChevronDown, ChevronUp, UserCheck, ArrowRight,
} from "lucide-react";
import Link from "next/link";
import clsx from "clsx";
import { api } from "@/lib/api";
import { gx } from "@/lib/gx-styles";
import { useAuth } from "@/lib/auth-context";
import { getGameService, getGameFriendsService, getGameActivitiesService } from "@/services/game.service";
import { GameEntry, GameStatus, Activity } from "@/lib/types";
import Avatar from "@/components/Avatar";
import AddGameModal from "@/components/AddGameModal";
import AddToListModal from "@/components/AddToListModal";
import StatusBadge from "@/components/StatusBadge";
import ActivityCard from "@/components/ActivityCard";
import ErrorBoundary from "@/components/ErrorBoundary";
import MarkdownReview from "@/components/MarkdownReview";
import { GameTagsSection } from "./_components/GameTagsSection";
import { PlaythroughsSection } from "./_components/PlaythroughsSection";
import { GameMediaGallery } from "./_components/GameMediaGallery";

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

/* Local Tailwind recipes (converted from _page-game.css) */
const c = {
  hero: "relative rounded-[18px] overflow-hidden min-h-[300px] flex items-end bg-gx-surface",
  scoreBox: "flex flex-col gap-[3px]",
  scoreVal: "font-bebas text-[30px] leading-none",
  scoreLbl: "text-[9px] font-bold tracking-[0.1em] uppercase text-gx-text-3",
  scoreDivider: "w-px h-[34px] bg-gx-border-md",
  infoRow: "flex items-start gap-3.5 py-[9px] border-b border-gx-border last:border-b-0",
  infoKey: "w-[100px] shrink-0 text-[11px] text-gx-text-3 pt-px",
  infoVal: "text-[12px] text-gx-text-2 leading-[1.5] flex-1",
  mcBadge: "inline-flex flex-col items-center px-3.5 py-2 rounded-[10px] border-2 min-w-[56px]",
  mcScore: "font-bebas text-[24px] leading-none",
  mcLabel: "text-[9px] font-bold tracking-[0.08em] uppercase opacity-70 mt-px",
} as const;

function metacriticClass(score: number) {
  if (score >= 75) return "border-[#22c55e] text-[#22c55e] bg-[#22c55e]/8";
  if (score >= 50) return "border-[#eab308] text-[#eab308] bg-[#eab308]/8";
  return "border-[#ef4444] text-[#ef4444] bg-[#ef4444]/8";
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
    staleTime: 5 * 60_000,
  });

  interface FriendEntry {
    id: string; status: string; rating?: number | null; playtime?: number | null;
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

  if (isLoading) return (
    <div className="flex flex-col gap-5">
      <div className={c.hero} style={{ minHeight: 280 }}>
        <div style={{ position: "absolute", inset: 0, background: "var(--gx-surface)" }} />
      </div>
    </div>
  );
  if (!game) return (
    <p style={{ padding: "64px 0", textAlign: "center", color: "var(--gx-text-2)", fontSize: 14 }}>
      Game not found
    </p>
  );

  const myEntry = myEntries.find((e) => e.game.rawgId === parseInt(rawgId));
  const totalInLibrary = Object.values(game.community.statusCounts).reduce((a, b) => a + b, 0);
  const descTrimmed = game.description && game.description.length > 480 && !showFullDesc
    ? game.description.slice(0, 480).trimEnd() + "…"
    : game.description;
  const hasInfoCard = game.metacritic || game.esrbRating || game.avgPlaytime || game.website
    || (game.platforms?.length ?? 0) > 0
    || (game.developers?.length ?? 0) > 0
    || (game.publishers?.length ?? 0) > 0;

  return (
    <div className="flex flex-col gap-5">

      {/* ── HERO ── */}
      <div className={c.hero}>
        {game.coverImage && (
          <div
            className="absolute inset-0 bg-cover bg-center blur-[20px] brightness-[0.3] scale-110"
            style={{ backgroundImage: `url(${game.coverImage})` }}
          />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(8,11,17,0.98)_0%,rgba(8,11,17,0.88)_50%,rgba(8,11,17,0.35)_100%)]" />
        {game.coverImage && (
          <div className="absolute right-0 top-0 bottom-0 w-[45%] pointer-events-none overflow-hidden">
            <img
              src={game.coverImage}
              alt={game.name}
              className="w-full h-full object-cover object-[center_top] opacity-45 [mask-image:linear-gradient(to_left,rgba(0,0,0,0.6)_0%,transparent_80%)]"
            />
          </div>
        )}
        <div className="relative z-[2] w-full px-8 py-7 flex items-end justify-between gap-5">
          <div className="flex-1 min-w-0">
            {(game.releaseYear || game.genres.length > 0) && (
              <p className={gx.eyebrow} style={{ marginBottom: 8 }}>
                {[game.releaseYear, ...game.genres.slice(0, 2)].filter(Boolean).join(" · ")}
              </p>
            )}
            <h1 className="font-bebas text-[clamp(28px,5vw,50px)] tracking-[0.02em] leading-none text-gx-text-1 mb-1.5">
              {game.name}
            </h1>

            {/* Scores */}
            <div className="flex items-center gap-[18px]">
              {game.rawgRating != null && (
                <div className={c.scoreBox}>
                  <span className={clsx(c.scoreVal, "text-[#F59E0B]")}>
                    {game.rawgRating.toFixed(1)}
                  </span>
                  <span className={c.scoreLbl}>RAWG</span>
                </div>
              )}
              {game.rawgRating != null && (
                <div className={c.scoreDivider} />
              )}
              <div className={c.scoreBox}>
                <span className={clsx(c.scoreVal, "text-gx-amber")}>
                  {game.community.avgRating ?? "—"}
                </span>
                <span className={c.scoreLbl}>
                  Community{game.community.ratingCount > 0 ? ` · ${game.community.ratingCount}` : ""}
                </span>
              </div>
              <div className={c.scoreDivider} />
              <div className={c.scoreBox}>
                <span className={clsx(c.scoreVal, "text-gx-teal")}>{totalInLibrary}</span>
                <span className={c.scoreLbl}>In Libraries</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-[9px] shrink-0">
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
                  <button className={gx.btnGhost}>
                    <BookOpen size={14} /> Update Entry
                  </button>
                }
              />
            ) : (
              <AddGameModal
                preselectedGame={game}
                trigger={
                  <button className={gx.btnPrimary}>
                    <BookOpen size={14} /> Add to Library
                  </button>
                }
              />
            )}
            {user && <AddToListModal rawgId={game.rawgId} gameName={game.name} />}
          </div>
        </div>
      </div>

      {/* ── TWO COLUMN LAYOUT ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5">

        {/* MAIN COLUMN */}
        <div className="flex flex-col gap-5">

          {/* Media gallery */}
          <GameMediaGallery rawgId={rawgId} coverFallback={game.coverImage} />

          {/* My entry bar */}
          {myEntry && (
            <div className="bg-gx-surface border border-gx-border border-l-[3px] border-l-gx-amber rounded-xl px-[18px] py-3.5">
              <p className="text-[9px] font-bold tracking-[0.13em] uppercase text-gx-amber mb-2">My Entry</p>
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge status={myEntry.status as GameStatus} />
                {myEntry.rating != null && (
                  <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "#F59E0B" }}>
                    <Star size={12} fill="currentColor" />
                    <span style={{ fontWeight: 700 }}>{myEntry.rating}/10</span>
                  </span>
                )}
                {myEntry.playtime != null && (
                  <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--gx-text-2)" }}>
                    <Clock size={11} />{myEntry.playtime}h played
                  </span>
                )}
                {myEntry.review && (
                  <div style={{ width: "100%", fontSize: 12, color: "var(--gx-text-2)", lineHeight: 1.5 }}>
                    <MarkdownReview text={myEntry.review} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Description */}
          {game.description && (
            <div className={gx.sectionCard}>
              <p className={gx.sectionCardTitle}>About</p>
              <p style={{ fontSize: 13, color: "var(--gx-text-2)", lineHeight: 1.7, whiteSpace: "pre-line" }}>
                {descTrimmed}
              </p>
              {game.description.length > 480 && (
                <button
                  onClick={() => setShowFullDesc((v) => !v)}
                  style={{
                    marginTop: 10, display: "flex", alignItems: "center", gap: 4,
                    fontSize: 11, color: "var(--gx-amber)", background: "none",
                    border: "none", cursor: "pointer", padding: 0,
                  }}
                >
                  {showFullDesc ? <><ChevronUp size={13} /> Show less</> : <><ChevronDown size={13} /> Show more</>}
                </button>
              )}
            </div>
          )}

          {/* Tags */}
          <GameTagsSection rawgId={rawgId} />

          {/* Playthroughs */}
          {myEntry && <PlaythroughsSection entryId={myEntry.id} />}

          {/* Friends playing */}
          {user && friendEntries.length > 0 && (
            <div className={gx.sectionCard}>
              <p className={gx.sectionCardTitle} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <UserCheck size={11} /> Friends Playing · {friendEntries.length}
              </p>
              <div className="flex flex-wrap gap-2">
                {friendEntries.map((fe) => (
                  <Link
                    key={fe.id}
                    href={`/user/${fe.user.username}`}
                    className="group flex items-center gap-[9px] bg-gx-surface border border-gx-border rounded-[10px] px-3 py-[9px] no-underline transition-[border-color] duration-150 hover:border-gx-amber/30"
                  >
                    <Avatar src={fe.user.avatar} username={fe.user.username} size="sm" />
                    <div style={{ minWidth: 0 }}>
                      <p className="text-[12px] font-semibold text-gx-text-1 transition-colors duration-150 group-hover:text-gx-amber">
                        {fe.user.username}
                      </p>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                        <StatusBadge status={fe.status as GameStatus} />
                        {fe.rating != null && (
                          <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: "#F59E0B" }}>
                            <Star size={10} fill="currentColor" />{fe.rating}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Reviews link */}
          <div className="flex items-center justify-between">
            <p className={gx.sectionLabel}>Reviews</p>
            <Link href={`/game/${rawgId}/reviews`} className={gx.link} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              See all <ArrowRight size={12} />
            </Link>
          </div>

          {/* Community activity */}
          {communityActivities.length > 0 && (
            <ErrorBoundary>
              <div className="flex flex-col gap-3">
                {communityActivities.map((a) => (
                  <ActivityCard key={a.id} activity={a} />
                ))}
              </div>
            </ErrorBoundary>
          )}
        </div>

        {/* SIDEBAR */}
        <div className="flex flex-col gap-4">

          {/* Game info */}
          {hasInfoCard && (
            <div className={gx.sectionCard}>
              <p className={gx.sectionCardTitle}>Game Info</p>

              {/* Metacritic + ESRB + playtime row */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
                {game.metacritic && (
                  <div className={clsx(c.mcBadge, metacriticClass(game.metacritic))}>
                    <span className={c.mcScore}>{game.metacritic}</span>
                    <span className={c.mcLabel}>Metacritic</span>
                  </div>
                )}
                {game.esrbRating && (
                  <div className={c.mcBadge} style={{ borderColor: "var(--gx-border-md)", color: "var(--gx-text-2)" }}>
                    <span className={c.mcScore} style={{ fontSize: 16 }}>{game.esrbRating}</span>
                    <span className={c.mcLabel}>ESRB</span>
                  </div>
                )}
              </div>

              {/* Info rows */}
              {game.avgPlaytime != null && (
                <div className={c.infoRow}>
                  <span className={c.infoKey} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <Clock size={11} /> Avg. Play
                  </span>
                  <span className={c.infoVal}>~{game.avgPlaytime}h</span>
                </div>
              )}
              {(game.platforms?.length ?? 0) > 0 && (
                <div className={c.infoRow}>
                  <span className={c.infoKey} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <Monitor size={11} /> Platforms
                  </span>
                  <div className={c.infoVal} style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {game.platforms!.map((p) => (
                      <span key={p} className={gx.genrePill}>{p}</span>
                    ))}
                  </div>
                </div>
              )}
              {(game.developers?.length ?? 0) > 0 && (
                <div className={c.infoRow}>
                  <span className={c.infoKey} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <Building2 size={11} /> {game.developers!.length === 1 ? "Dev" : "Devs"}
                  </span>
                  <span className={c.infoVal}>{game.developers!.join(", ")}</span>
                </div>
              )}
              {(game.publishers?.length ?? 0) > 0 && (
                <div className={c.infoRow}>
                  <span className={c.infoKey} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <Building2 size={11} /> Publisher
                  </span>
                  <span className={c.infoVal}>{game.publishers!.join(", ")}</span>
                </div>
              )}
              {game.website && (
                <div style={{ marginTop: 12 }}>
                  <a
                    href={game.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={gx.btnGhost}
                    style={{ fontSize: 12, padding: "7px 14px" }}
                  >
                    <Globe size={12} /> Official Site
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Community status */}
          {totalInLibrary > 0 && (
            <div className={gx.sectionCard}>
              <p className={gx.sectionCardTitle}>Community Status</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {Object.entries(game.community.statusCounts).map(([status, count]) => (
                  <div key={status} className="flex items-center gap-2.5">
                    <span className="text-[11px] text-gx-text-2 w-[110px] shrink-0">{status.replaceAll("_", " ")}</span>
                    <div className="flex-1 h-[3px] bg-white/[0.06] rounded-[2px]">
                      <div
                        className="h-[3px] rounded-[2px] bg-gx-amber transition-[width] duration-500"
                        style={{ width: `${(count / totalInLibrary) * 100}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-gx-text-3 w-[26px] text-right shrink-0">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Genre tags */}
          {game.genres.length > 0 && (
            <div className={gx.sectionCard}>
              <p className={gx.sectionCardTitle} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <Tag size={10} /> Genres
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {game.genres.map((g) => (
                  <span key={g} className={gx.genrePill}>{g}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
