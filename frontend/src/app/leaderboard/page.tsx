"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Trophy, Gamepad2, MessageSquare, Heart } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

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

const CATEGORIES: { key: Category; label: string; icon: React.ReactNode; unit: string; description: string }[] = [
  { key: "games",   label: "Most Completed", icon: <Gamepad2 size={13} />,    unit: "game",   description: "Players who have completed the most games." },
  { key: "reviews", label: "Most Reviews",   icon: <MessageSquare size={13} />, unit: "review", description: "Players who have written the most reviews." },
  { key: "likes",   label: "Most Liked",     icon: <Heart size={13} />,         unit: "like",   description: "Players whose reviews have received the most helpful votes." },
];

// Circular avatar for podium slots
function PodiumAvatar({
  src, username, size, ringClass,
}: { src?: string; username: string; size: number; ringClass: string }) {
  const initials = username.slice(0, 2).toUpperCase();
  return (
    <div className={`gx-lb-avatar-ring ${ringClass}`}>
      {src ? (
        <img src={src} alt={username} className="gx-lb-avatar-img" style={{ width: size, height: size }} />
      ) : (
        <div className="gx-lb-avatar-fallback" style={{ width: size, height: size, fontSize: size * 0.3 }}>
          {initials}
        </div>
      )}
    </div>
  );
}

// Small avatar for table rows
function RowAvatar({ src, username }: { src?: string; username: string }) {
  return src ? (
    <img src={src} alt={username} style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
  ) : (
    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--gx-surface-2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "var(--gx-text-2)", flexShrink: 0 }}>
      {username.slice(0, 2).toUpperCase()}
    </div>
  );
}

export default function LeaderboardPage() {
  const { user: me } = useAuth();
  const [period,   setPeriod]   = useState<Period>("alltime");
  const [category, setCategory] = useState<Category>("games");

  const { data: entries = [], isLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ["leaderboard", period, category],
    queryFn:  () => api.get(`/api/feed/leaderboard?period=${period}&category=${category}`).then((r) => r.data),
    staleTime: 5 * 60_000,
  });

  const currentCat = CATEGORIES.find((c) => c.key === category)!;
  const [rank1, rank2, rank3, ...rest] = entries;

  return (
    <div className="gx-lb-page">

      {/* Page header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--gx-text-1)", margin: "0 0 4px" }}>Leaderboard</h1>
        <p style={{ fontSize: 13, color: "var(--gx-text-2)", margin: 0 }}>
          See who&apos;s topping the charts in the community
        </p>
      </div>

      {/* Controls: categories LEFT | periods RIGHT */}
      <div className="gx-lb-controls">
        <div className="gx-lb-cat-bar">
          {CATEGORIES.map((c) => (
            <button key={c.key} onClick={() => setCategory(c.key)} className="gx-lb-cat-btn" data-active={category === c.key}>
              {c.icon} {c.label}
            </button>
          ))}
        </div>
        <div className="gx-lb-period-bar">
          {PERIODS.map((p) => (
            <button key={p.key} onClick={() => setPeriod(p.key)} className="gx-lb-period-btn" data-active={period === p.key}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <p className="gx-lb-description">{currentCat.description}</p>

      {/* Loading */}
      {isLoading && (
        <div style={{ padding: "80px 0", textAlign: "center" }}>
          <Trophy size={32} style={{ margin: "0 auto 12px", opacity: 0.2, color: "var(--gx-text-3)", display: "block" }} />
          <p style={{ fontSize: 13, color: "var(--gx-text-3)" }}>Loading…</p>
        </div>
      )}

      {/* Empty */}
      {!isLoading && entries.length === 0 && (
        <div style={{ padding: "72px 24px", textAlign: "center", background: "var(--gx-surface)", border: "1px solid var(--gx-border)", borderRadius: 14 }}>
          <Trophy size={36} style={{ margin: "0 auto 12px", opacity: 0.15, color: "var(--gx-text-3)", display: "block" }} />
          <p style={{ fontSize: 13, color: "var(--gx-text-3)" }}>No data yet for this period.</p>
        </div>
      )}

      {!isLoading && entries.length > 0 && (
        <>
          {/* ── Podium: order = rank2 | rank1 | rank3 ── */}
          <div className="gx-lb-podium-stage">
            {/* Rank 2 — left, lower */}
            {rank2 ? (
              <Link href={`/user/${rank2.user.username}`} className={`gx-lb-podium-slot gx-lb-slot-2`}>
                <div style={{ position: "relative", display: "inline-block" }}>
                  <PodiumAvatar src={rank2.user.avatar} username={rank2.user.username} size={64} ringClass="gx-lb-ring-2" />
                  <span className="gx-lb-rank-badge gx-lb-badge-2">2</span>
                </div>
                <p className="gx-lb-podium-name">{rank2.user.username}</p>
                <p className="gx-lb-podium-score">{rank2.score}</p>
              </Link>
            ) : <div />}

            {/* Rank 1 — center, highest */}
            {rank1 && (
              <Link href={`/user/${rank1.user.username}`} className={`gx-lb-podium-slot gx-lb-slot-1`}>
                <div style={{ position: "relative", display: "inline-block" }}>
                  <PodiumAvatar src={rank1.user.avatar} username={rank1.user.username} size={80} ringClass="gx-lb-ring-1" />
                  <span className="gx-lb-rank-badge gx-lb-badge-1">1</span>
                </div>
                <p className="gx-lb-podium-name">{rank1.user.username}</p>
                <p className="gx-lb-podium-score">{rank1.score}</p>
              </Link>
            )}

            {/* Rank 3 — right, lowest */}
            {rank3 ? (
              <Link href={`/user/${rank3.user.username}`} className={`gx-lb-podium-slot gx-lb-slot-3`}>
                <div style={{ position: "relative", display: "inline-block" }}>
                  <PodiumAvatar src={rank3.user.avatar} username={rank3.user.username} size={64} ringClass="gx-lb-ring-3" />
                  <span className="gx-lb-rank-badge gx-lb-badge-3">3</span>
                </div>
                <p className="gx-lb-podium-name">{rank3.user.username}</p>
                <p className="gx-lb-podium-score">{rank3.score}</p>
              </Link>
            ) : <div />}
          </div>

          {/* ── Table: rank 4+ ── */}
          {rest.length > 0 && (
            <div className="gx-lb-table">
              {/* Column headers */}
              <div className="gx-lb-table-header">
                <span style={{ textAlign: "center" }}>#</span>
                <span>Player</span>
                <span>{currentCat.label}</span>
                <span>Total</span>
              </div>

              {rest.map((e) => {
                const isSelf = me?.id === e.user.id;
                return (
                  <Link
                    key={e.user.id}
                    href={`/user/${e.user.username}`}
                    className={`gx-lb-row ${isSelf ? "gx-lb-row-self" : ""}`}
                  >
                    <span className="gx-lb-row-num">{e.rank}</span>

                    <div className="gx-lb-row-player">
                      <RowAvatar src={e.user.avatar} username={e.user.username} />
                      <div style={{ minWidth: 0 }}>
                        <p style={{ margin: 0, display: "flex", alignItems: "center" }}>
                          <span className="gx-lb-row-name">{e.user.username}</span>
                          {isSelf && <span className="gx-lb-you-badge">You</span>}
                        </p>
                        <p className="gx-lb-row-handle">@{e.user.username}</p>
                      </div>
                    </div>

                    <span className="gx-lb-row-score">{e.score}</span>
                    <span className="gx-lb-row-count">
                      {e.score} {currentCat.unit}{e.score !== 1 ? "s" : ""}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </>
      )}

    </div>
  );
}
