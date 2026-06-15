"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import clsx from "clsx";
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
    <div className={`relative rounded-full p-0.75 inline-block ${ringClass}`}>
      {src ? (
        <img src={src} alt={username} className="rounded-full block object-cover bg-gx-surface-2" style={{ width: size, height: size }} />
      ) : (
        <div className="rounded-full flex items-center justify-center font-bold text-gx-text-1 uppercase bg-gx-surface-2" style={{ width: size, height: size, fontSize: size * 0.3 }}>
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
    <div className="flex flex-col gap-0 max-w-195 mx-auto">

      {/* Page header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--gx-text-1)", margin: "0 0 4px" }}>Leaderboard</h1>
        <p style={{ fontSize: 13, color: "var(--gx-text-2)", margin: 0 }}>
          See who&apos;s topping the charts in the community
        </p>
      </div>

      {/* Controls: categories LEFT | periods RIGHT */}
      <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
        <div className="flex gap-1.5 flex-wrap">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              onClick={() => setCategory(c.key)}
              data-active={category === c.key}
              className="inline-flex items-center gap-1.75 px-4 py-2 rounded-[30px] text-[12px] font-semibold bg-gx-surface border border-gx-border text-gx-text-2 cursor-pointer transition-all data-[active=true]:bg-gx-amber data-[active=true]:border-gx-amber data-[active=true]:text-gx-ink not-data-[active=true]:hover:text-gx-text-1 not-data-[active=true]:hover:border-gx-border-md"
            >
              {c.icon} {c.label}
            </button>
          ))}
        </div>
        <div className="flex gap-0.5">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              data-active={period === p.key}
              className="px-4 py-1.75 rounded-[30px] text-[12px] font-semibold bg-transparent border-none text-gx-text-2 cursor-pointer transition-[background,color] whitespace-nowrap data-[active=true]:bg-gx-amber data-[active=true]:text-gx-ink not-data-[active=true]:hover:text-gx-text-1"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-[12px] text-gx-text-3 mb-7">{currentCat.description}</p>

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
          <div className="flex items-start justify-center gap-12 px-10 pt-8 pb-10">
            {/* Rank 2 — left, lower */}
            {rank2 ? (
              <Link href={`/user/${rank2.user.username}`} className="flex flex-col items-center gap-1.5 no-underline group mt-5.5">
                <div style={{ position: "relative", display: "inline-block" }}>
                  <PodiumAvatar src={rank2.user.avatar} username={rank2.user.username} size={64} ringClass="border-[3px] border-[#6B7280]" />
                  <span className="absolute -bottom-px -right-px w-5.5 h-5.5 rounded-full flex items-center justify-center text-[11px] font-extrabold text-white border-2 border-gx-navy leading-none bg-[#6B7280]">2</span>
                </div>
                <p className="text-[13px] font-bold text-gx-text-1 whitespace-nowrap group-hover:text-gx-amber">{rank2.user.username}</p>
                <p className="font-bebas text-[26px] text-gx-text-1 leading-none">{rank2.score}</p>
              </Link>
            ) : <div />}

            {/* Rank 1 — center, highest */}
            {rank1 && (
              <Link href={`/user/${rank1.user.username}`} className="flex flex-col items-center gap-1.5 no-underline group">
                <div style={{ position: "relative", display: "inline-block" }}>
                  <PodiumAvatar src={rank1.user.avatar} username={rank1.user.username} size={80} ringClass="border-[3px] border-gx-amber" />
                  <span className="absolute -bottom-px -right-px w-5.5 h-5.5 rounded-full flex items-center justify-center text-[11px] font-extrabold border-2 border-gx-navy leading-none bg-gx-amber text-gx-ink">1</span>
                </div>
                <p className="text-[13px] font-bold text-gx-text-1 whitespace-nowrap group-hover:text-gx-amber">{rank1.user.username}</p>
                <p className="font-bebas text-[26px] text-gx-text-1 leading-none">{rank1.score}</p>
              </Link>
            )}

            {/* Rank 3 — right, lowest */}
            {rank3 ? (
              <Link href={`/user/${rank3.user.username}`} className="flex flex-col items-center gap-1.5 no-underline group mt-11">
                <div style={{ position: "relative", display: "inline-block" }}>
                  <PodiumAvatar src={rank3.user.avatar} username={rank3.user.username} size={64} ringClass="border-[3px] border-[#F43F5E]" />
                  <span className="absolute -bottom-px -right-px w-5.5 h-5.5 rounded-full flex items-center justify-center text-[11px] font-extrabold text-white border-2 border-gx-navy leading-none bg-[#F43F5E]">3</span>
                </div>
                <p className="text-[13px] font-bold text-gx-text-1 whitespace-nowrap group-hover:text-gx-amber">{rank3.user.username}</p>
                <p className="font-bebas text-[26px] text-gx-text-1 leading-none">{rank3.score}</p>
              </Link>
            ) : <div />}
          </div>

          {/* ── Table: rank 4+ ── */}
          {rest.length > 0 && (
            <div className="bg-gx-surface border border-gx-border rounded-[14px] overflow-hidden">
              {/* Column headers */}
              <div className="grid grid-cols-[40px_1fr_120px_100px] px-4.5 py-2.25 border-b border-gx-border text-[10px] font-bold tracking-widest uppercase text-gx-text-3">
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
                    className={clsx(
                      "grid grid-cols-[40px_1fr_120px_100px] items-center px-4.5 py-2.75 no-underline transition-colors border-b border-gx-border last:border-b-0 group",
                      isSelf
                        ? "bg-gx-teal/[0.07] hover:bg-gx-teal/12"
                        : "hover:bg-white/2.5",
                    )}
                  >
                    <span className="font-bebas text-[16px] text-gx-text-3 text-center">{e.rank}</span>

                    <div className="flex items-center gap-2.5 min-w-0">
                      <RowAvatar src={e.user.avatar} username={e.user.username} />
                      <div style={{ minWidth: 0 }}>
                        <p style={{ margin: 0, display: "flex", alignItems: "center" }}>
                          <span className={clsx(
                            "text-[13px] font-bold transition-colors truncate group-hover:text-gx-text-1",
                            isSelf ? "text-gx-teal" : "text-gx-text-2",
                          )}>{e.user.username}</span>
                          {isSelf && <span className="inline-flex px-1.75 py-0.5 rounded-[20px] text-[10px] font-bold bg-gx-teal/15 text-gx-teal ml-1.5">You</span>}
                        </p>
                        <p className="text-[11px] text-gx-text-3 whitespace-nowrap">@{e.user.username}</p>
                      </div>
                    </div>

                    <span className="font-bebas text-[17px] text-gx-text-2">{e.score}</span>
                    <span className="text-[13px] text-gx-text-3">
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
