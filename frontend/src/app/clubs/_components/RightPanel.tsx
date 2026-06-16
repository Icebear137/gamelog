"use client";

import { useMemo } from "react";
import { Users, Crown, ChevronRight, Tag, Plus } from "lucide-react";
import Link from "next/link";
import { gx } from "@/lib/gx-styles";

interface Club {
  id: string;
  name: string;
  description?: string;
  avatar?: string | null;
  genre?: string;
  isPrivate?: boolean;
  isMember: boolean;
  game?: { rawgId: number; name: string; coverImage?: string };
  creator: { id: string; username: string; avatar?: string };
  _count: { members: number; posts: number };
}

export function RightPanel({
  user, myClubs, allClubs, onCreateClub,
}: {
  user: any;
  myClubs: Club[];
  allClubs: Club[];
  onCreateClub: () => void;
}) {
  const genres = useMemo(() => {
    const map = new Map<string, number>();
    allClubs.forEach(c => { if (c.genre) map.set(c.genre, (map.get(c.genre) ?? 0) + 1); });
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 7);
  }, [allClubs]);

  return (
    <aside className="flex flex-col gap-4 sticky top-18">
      {user && (
        <button
          onClick={onCreateClub}
          className="w-full flex items-center justify-center gap-2 bg-gx-amber text-gx-ink text-[13px] font-bold rounded-xl py-3 border-none cursor-pointer transition-all hover:brightness-110 hover:shadow-[0_4px_24px_rgba(232,147,42,0.22)]"
        >
          <Plus size={14} /> Create Club
        </button>
      )}

      {user && myClubs.length > 0 && (
        <div className={gx.sectionCard}>
          <p className={gx.sectionCardTitle}>My Clubs</p>
          <div className="flex flex-col gap-0.5">
            {myClubs.slice(0, 7).map(club => (
              <Link
                key={club.id}
                href={`/clubs/${club.id}`}
                className="flex items-center gap-2 px-2 py-1.5 -mx-2 rounded-lg no-underline transition-colors hover:bg-white/4 group"
              >
                <div className="w-5 h-5 rounded-[5px] overflow-hidden bg-gx-surface-2 border border-gx-border shrink-0">
                  {club.avatar ? (
                    <img src={club.avatar} alt={club.name} className="w-full h-full object-cover" />
                  ) : club.game?.coverImage ? (
                    <img src={club.game.coverImage} alt={club.game.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gx-surface-3">
                      <Users size={9} className="text-gx-amber" />
                    </div>
                  )}
                </div>
                <span className="flex-1 truncate text-[12px] text-gx-text-2 transition-colors group-hover:text-gx-text-1">
                  {club.name}
                </span>
                {club.creator.id === user?.id && (
                  <Crown size={9} className="shrink-0 text-gx-amber opacity-60" />
                )}
                <ChevronRight size={10} className="shrink-0 text-gx-text-3 opacity-0 group-hover:opacity-60 transition-opacity" />
              </Link>
            ))}
            {myClubs.length > 7 && (
              <p className="text-[10px] text-gx-text-3 pt-1.5 m-0">+{myClubs.length - 7} more clubs</p>
            )}
          </div>
        </div>
      )}

      {genres.length > 0 && (
        <div className={gx.sectionCard}>
          <p className={gx.sectionCardTitle}>Trending Genres</p>
          <div className="flex flex-wrap gap-1.5">
            {genres.map(([genre, count]) => (
              <span
                key={genre}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[20px] text-[10px] font-semibold bg-gx-surface-2 border border-gx-border text-gx-text-2 hover:border-gx-amber/30 hover:text-gx-amber transition-colors cursor-default"
              >
                {genre}
                <span className="text-gx-text-3 font-normal">{count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className={gx.sectionCard}>
        <p className={gx.sectionCardTitle}>Overview</p>
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-gx-text-3 flex items-center gap-1.5">
              <Users size={11} /> All clubs
            </span>
            <span className="text-[13px] font-bold text-gx-text-1">{allClubs.length}</span>
          </div>
          {user && (
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-gx-text-3 flex items-center gap-1.5">
                <Crown size={11} className="text-gx-amber" /> Joined
              </span>
              <span className="text-[13px] font-bold text-gx-amber">{myClubs.length}</span>
            </div>
          )}
          {genres.length > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-gx-text-3 flex items-center gap-1.5">
                <Tag size={11} /> Genres
              </span>
              <span className="text-[13px] font-bold text-gx-text-1">{genres.length}</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
