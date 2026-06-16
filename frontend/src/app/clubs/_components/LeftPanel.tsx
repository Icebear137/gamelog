"use client";

import { useMemo } from "react";
import { Users, Search, Tag, X, Lock } from "lucide-react";
import Link from "next/link";
import clsx from "clsx";
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

export function LeftPanel({
  clubs, isLoading, search, setSearch, onJoin, user,
}: {
  clubs: Club[];
  isLoading: boolean;
  search: string;
  setSearch: (v: string) => void;
  onJoin: (id: string, joined: boolean) => void;
  user: any;
}) {
  const filtered = useMemo(() =>
    clubs.filter(c =>
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.genre ?? "").toLowerCase().includes(search.toLowerCase())
    ), [clubs, search]);

  return (
    <aside className="flex flex-col gap-3.5 sticky top-18">
      <div>
        <p className={gx.eyebrow}>Browse</p>
        <h2 className="font-bebas text-[22px] tracking-[0.04em] text-gx-text-1 mt-0.5 leading-none">
          Game Clubs
        </h2>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gx-text-3 pointer-events-none" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search clubs…"
          className="w-full bg-gx-surface border border-gx-border rounded-xl py-2 pr-8 pl-8 text-[12px] text-gx-text-1 outline-none transition-colors hover:border-gx-border-md focus:border-gx-amber/30 placeholder:text-gx-text-3"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-gx-text-3 hover:text-gx-text-1 transition-colors bg-transparent border-none cursor-pointer"
          >
            <X size={10} />
          </button>
        )}
      </div>

      {/* Club list */}
      <div className="flex flex-col gap-1.5 max-h-[calc(100vh-240px)] overflow-y-auto">
        {isLoading && Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-gx-surface border border-gx-border opacity-30 animate-pulse" />
        ))}

        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-8">
            <Users size={22} className="mx-auto mb-2 text-gx-text-3 opacity-25" />
            <p className="text-[11px] text-gx-text-3">{search ? "No matches found" : "No clubs yet"}</p>
          </div>
        )}

        {filtered.map(club => {
          const coverArt = club.game?.coverImage || club.avatar;
          return (
            <div
              key={club.id}
              className="group relative overflow-hidden rounded-xl border border-gx-border transition-all hover:border-gx-amber/30 bg-gx-surface"
            >
              {coverArt && (
                <>
                  <img src={coverArt} alt="" className="absolute inset-0 w-full h-full object-cover scale-110 opacity-[0.18] blur-sm" />
                  <div className="absolute inset-0 bg-linear-to-r from-gx-surface/95 via-gx-surface/80 to-gx-surface/55" />
                </>
              )}
              <div className="relative flex items-center gap-2.5 px-3 py-2.5">
                <div className="w-8 h-8 rounded-[7px] overflow-hidden bg-gx-surface-2 border border-gx-border shrink-0">
                  {club.avatar ? (
                    <img src={club.avatar} alt={club.name} className="w-full h-full object-cover" />
                  ) : club.game?.coverImage ? (
                    <img src={club.game.coverImage} alt={club.game.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gx-surface-3">
                      <Users size={13} className="text-gx-amber" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 min-w-0">
                    <Link
                      href={`/clubs/${club.id}`}
                      className="truncate text-[12px] font-bold text-gx-text-1 no-underline transition-colors group-hover:text-gx-amber"
                    >
                      {club.name}
                    </Link>
                    {club.isPrivate && <Lock size={9} className="shrink-0 text-gx-amber opacity-70" />}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {club.genre && (
                      <span className="flex items-center gap-0.75 text-[10px] text-gx-text-3">
                        <Tag size={8} />{club.genre}
                      </span>
                    )}
                    <span className="flex items-center gap-0.75 text-[10px] text-gx-text-3">
                      <Users size={8} />{club._count.members}
                    </span>
                  </div>
                </div>
                {user && (
                  <button
                    onClick={e => { e.preventDefault(); onJoin(club.id, club.isMember); }}
                    className={clsx(
                      "shrink-0 w-9 h-6 rounded-[7px] text-[10px] font-bold border cursor-pointer transition-all flex items-center justify-center",
                      club.isMember
                        ? "bg-gx-amber/13 text-gx-amber border-gx-amber/30 hover:bg-gx-red/10 hover:text-gx-red hover:border-gx-red/30"
                        : "bg-transparent text-gx-text-2 border-gx-border hover:border-gx-amber/30 hover:text-gx-amber"
                    )}
                  >
                    {club.isMember ? "✓" : "+"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
