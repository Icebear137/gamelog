"use client";

import clsx from "clsx";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { TrendingUp, Gamepad2, Flame, Plus } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getTrendingGamesService } from "@/services/game.service";
import AddGameModal from "@/components/AddGameModal";
import { gx } from "@/lib/gx-styles";
import type { TrendingGame } from "@/app/discover/_components/TrendingGameCard";

const ONE_HOUR = 60 * 60_000;

function StoryCard({ game, rank }: { game: TrendingGame; rank: number }) {
  const router = useRouter();

  return (
    <div
      className={clsx(
        "relative h-[180px] w-[116px] shrink-0 cursor-pointer overflow-hidden rounded-[13px] border-[1.5px] bg-gx-surface-2 outline-none",
        "[transition:border-color_0.2s,translate_0.2s,box-shadow_0.2s]",
        "hover:-translate-y-1 hover:border-gx-amber focus-visible:-translate-y-1 focus-visible:border-gx-amber focus-visible:shadow-[0_8px_24px_rgba(232,147,42,0.15)]",
        rank === 1
          ? "border-gx-amber/35 hover:shadow-[0_8px_28px_rgba(232,147,42,0.25)]"
          : "border-gx-border hover:shadow-[0_8px_24px_rgba(232,147,42,0.15)]"
      )}
      onClick={() => router.push(`/game/${game.rawgId}`)}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") router.push(`/game/${game.rawgId}`);
      }}
    >
      {game.coverImage ? (
        <img src={game.coverImage} alt={game.name} className="block h-full w-full object-cover" loading="lazy" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-white/3 text-gx-text-3">
          <Gamepad2 size={22} />
        </div>
      )}

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,transparent_38%,rgba(5,7,12,0.92)_100%)]" />

      <div
        className={clsx(
          "absolute top-2 left-2 flex h-[22px] min-w-[22px] items-center justify-center rounded-[7px] px-[5px] text-[11px] font-extrabold tracking-[-0.02em] backdrop-blur-[6px]",
          rank === 1
            ? "bg-gx-amber text-gx-navy shadow-[0_0_10px_rgba(232,147,42,0.5)]"
            : rank <= 3
              ? "bg-[rgba(148,163,184,0.75)] text-gx-navy"
              : "bg-black/68 text-gx-text-1"
        )}
      >
        {rank}
      </div>

      {rank === 1 && (
        <div className="absolute top-2 right-[7px] flex items-center gap-0.5 rounded-[5px] bg-black/70 px-1.5 py-0.5 text-[9px] font-bold tracking-[0.06em] text-gx-amber backdrop-blur-[4px]">
          <Flame size={8} />
          HOT
        </div>
      )}

      <p className="absolute right-0 bottom-0 left-0 line-clamp-2 px-2 pt-1.5 pb-2 text-[11px] leading-[1.35] font-semibold text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.8)]">
        {game.name}
      </p>
    </div>
  );
}

export default function TrendingSection() {
  const { user } = useAuth();

  const { data: trending = [], isLoading } = useQuery<TrendingGame[]>({
    queryKey: ["trending"],
    queryFn: getTrendingGamesService,
    staleTime: ONE_HOUR,
  });

  if (!isLoading && trending.length === 0) return null;

  return (
    <section className="mb-4 rounded-[14px] border border-gx-border p-4">
      <div className="mb-3.5 flex items-center gap-2">
        <span className="h-[7px] w-[7px] shrink-0 animate-story-pulse rounded-full bg-[#4ade80]" />
        <span className={gx.eyebrow} style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <TrendingUp size={10} />
          Trending This Week
        </span>
      </div>

      <div className="flex gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {user && (
          <AddGameModal
            trigger={
              <div
                className={clsx(
                  "relative flex h-[180px] w-[116px] shrink-0 cursor-pointer flex-col items-center justify-end overflow-hidden rounded-[13px] border-[1.5px] border-dashed border-gx-amber/40 bg-gx-amber/4 outline-none",
                  "[transition:border-color_0.2s,background_0.2s,translate_0.2s]",
                  "hover:-translate-y-1 hover:border-gx-amber hover:bg-gx-amber/8 focus-visible:-translate-y-1 focus-visible:border-gx-amber focus-visible:bg-gx-amber/8"
                )}
                role="button"
                tabIndex={0}
              >
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,rgba(232,147,42,0.12)_0%,transparent_65%)]" />
                <div className="absolute top-1/2 left-1/2 flex h-[42px] w-[42px] -translate-x-1/2 -translate-y-[60%] items-center justify-center rounded-full bg-gx-amber text-gx-navy shadow-[0_0_0_4px_rgba(232,147,42,0.18),0_4px_14px_rgba(232,147,42,0.35)]">
                  <Plus size={18} strokeWidth={2.5} className="pointer-events-none" />
                </div>
                <p className="relative z-[1] px-2 pt-2 pb-3 text-center text-[11px] font-semibold text-gx-text-2">Add Game</p>
              </div>
            }
          />
        )}

        {isLoading &&
          Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="h-[180px] w-[116px] shrink-0 animate-[gx-shimmer_1.6s_ease-in-out_infinite] rounded-[13px] border border-gx-border bg-white/4"
            />
          ))}

        {trending.slice(0, 10).map((game, i) => (
          <StoryCard key={game.id} game={game} rank={i + 1} />
        ))}
      </div>
    </section>
  );
}
