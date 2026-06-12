"use client";

import { use, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Star, Users, Tag, BookOpen, Clock, Globe, Monitor, Building2,
  ChevronDown, ChevronUp, UserCheck, ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
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

function metacriticClass(score: number) {
  if (score >= 75) return "gx-mc-green";
  if (score >= 50) return "gx-mc-yellow";
  return "gx-mc-red";
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
    <div className="gx-game-page">
      <div className="gx-game-hero" style={{ minHeight: 280 }}>
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
    <div className="gx-game-page">

      {/* ── HERO ── */}
      <div className="gx-game-hero">
        {game.coverImage && (
          <div className="gx-game-hero-bg" style={{ backgroundImage: `url(${game.coverImage})` }} />
        )}
        <div className="gx-game-hero-overlay" />
        {game.coverImage && (
          <div className="gx-game-hero-cover">
            <img src={game.coverImage} alt={game.name} />
          </div>
        )}
        <div className="gx-game-hero-inner">
          <div className="gx-game-hero-left">
            {(game.releaseYear || game.genres.length > 0) && (
              <p className="gx-eyebrow" style={{ marginBottom: 8 }}>
                {[game.releaseYear, ...game.genres.slice(0, 2)].filter(Boolean).join(" · ")}
              </p>
            )}
            <h1 className="gx-game-name">{game.name}</h1>

            {/* Scores */}
            <div className="gx-game-scores">
              {game.rawgRating != null && (
                <div className="gx-score-box">
                  <span className="gx-score-val gx-score-val-yellow">
                    {game.rawgRating.toFixed(1)}
                  </span>
                  <span className="gx-score-lbl">RAWG</span>
                </div>
              )}
              {game.rawgRating != null && (
                <div className="gx-score-divider" />
              )}
              <div className="gx-score-box">
                <span className="gx-score-val gx-score-val-amber">
                  {game.community.avgRating ?? "—"}
                </span>
                <span className="gx-score-lbl">
                  Community{game.community.ratingCount > 0 ? ` · ${game.community.ratingCount}` : ""}
                </span>
              </div>
              <div className="gx-score-divider" />
              <div className="gx-score-box">
                <span className="gx-score-val gx-score-val-teal">{totalInLibrary}</span>
                <span className="gx-score-lbl">In Libraries</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="gx-game-hero-actions">
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
                  <button className="gx-btn-ghost">
                    <BookOpen size={14} /> Update Entry
                  </button>
                }
              />
            ) : (
              <AddGameModal
                preselectedGame={game}
                trigger={
                  <button className="gx-btn-primary">
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
            <div className="gx-my-entry">
              <p className="gx-my-entry-label">My Entry</p>
              <div className="gx-my-entry-row">
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
            <div className="gx-section-card">
              <p className="gx-section-card-title">About</p>
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
            <div className="gx-section-card">
              <p className="gx-section-card-title" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <UserCheck size={11} /> Friends Playing · {friendEntries.length}
              </p>
              <div className="gx-friend-grid">
                {friendEntries.map((fe) => (
                  <Link key={fe.id} href={`/user/${fe.user.username}`} className="gx-friend-card">
                    <Avatar src={fe.user.avatar} username={fe.user.username} size="sm" />
                    <div style={{ minWidth: 0 }}>
                      <p className="gx-friend-name">{fe.user.username}</p>
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
          <div className="gx-reviews-bar">
            <p className="gx-section-label">Reviews</p>
            <Link href={`/game/${rawgId}/reviews`} className="gx-link" style={{ display: "flex", alignItems: "center", gap: 4 }}>
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
            <div className="gx-section-card">
              <p className="gx-section-card-title">Game Info</p>

              {/* Metacritic + ESRB + playtime row */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
                {game.metacritic && (
                  <div className={`gx-mc-badge ${metacriticClass(game.metacritic)}`}>
                    <span className="gx-mc-score">{game.metacritic}</span>
                    <span className="gx-mc-label">Metacritic</span>
                  </div>
                )}
                {game.esrbRating && (
                  <div className="gx-mc-badge" style={{ borderColor: "var(--gx-border-md)", color: "var(--gx-text-2)" }}>
                    <span className="gx-mc-score" style={{ fontSize: 16 }}>{game.esrbRating}</span>
                    <span className="gx-mc-label">ESRB</span>
                  </div>
                )}
              </div>

              {/* Info rows */}
              {game.avgPlaytime != null && (
                <div className="gx-info-row">
                  <span className="gx-info-key" style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <Clock size={11} /> Avg. Play
                  </span>
                  <span className="gx-info-val">~{game.avgPlaytime}h</span>
                </div>
              )}
              {(game.platforms?.length ?? 0) > 0 && (
                <div className="gx-info-row">
                  <span className="gx-info-key" style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <Monitor size={11} /> Platforms
                  </span>
                  <div className="gx-info-val" style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {game.platforms!.map((p) => (
                      <span key={p} className="gx-genre-pill">{p}</span>
                    ))}
                  </div>
                </div>
              )}
              {(game.developers?.length ?? 0) > 0 && (
                <div className="gx-info-row">
                  <span className="gx-info-key" style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <Building2 size={11} /> {game.developers!.length === 1 ? "Dev" : "Devs"}
                  </span>
                  <span className="gx-info-val">{game.developers!.join(", ")}</span>
                </div>
              )}
              {(game.publishers?.length ?? 0) > 0 && (
                <div className="gx-info-row">
                  <span className="gx-info-key" style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <Building2 size={11} /> Publisher
                  </span>
                  <span className="gx-info-val">{game.publishers!.join(", ")}</span>
                </div>
              )}
              {game.website && (
                <div style={{ marginTop: 12 }}>
                  <a
                    href={game.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="gx-btn-ghost"
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
            <div className="gx-section-card">
              <p className="gx-section-card-title">Community Status</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {Object.entries(game.community.statusCounts).map(([status, count]) => (
                  <div key={status} className="gx-status-row">
                    <span className="gx-status-key">{status.replaceAll("_", " ")}</span>
                    <div className="gx-status-track">
                      <div
                        className="gx-status-fill"
                        style={{ width: `${(count / totalInLibrary) * 100}%` }}
                      />
                    </div>
                    <span className="gx-status-count">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Genre tags */}
          {game.genres.length > 0 && (
            <div className="gx-section-card">
              <p className="gx-section-card-title" style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <Tag size={10} /> Genres
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {game.genres.map((g) => (
                  <span key={g} className="gx-genre-pill">{g}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
