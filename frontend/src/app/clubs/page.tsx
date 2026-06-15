"use client";

import { useState, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  Users, Plus, Search, Tag, X, Gamepad2,
  MessageSquare, Heart, ChevronRight, Clock,
  Flame, Crown, Swords,
} from "lucide-react";
import Link from "next/link";
import clsx from "clsx";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { dispatchToast } from "@/lib/toast";
import { gx } from "@/lib/gx-styles";
import { formatDistanceToNow } from "@/lib/utils";
import { ClubFeedPost } from "@/lib/types";
import Avatar from "@/components/Avatar";

/* ── local recipes ────────────────────────────────────────────────────────── */
const clubLabel =
  "block text-[10px] font-bold tracking-[0.1em] uppercase text-gx-text-3 mb-[5px]";
const clubInput =
  "w-full bg-gx-surface-2 border border-gx-border rounded-[10px] px-3 py-[9px] text-[13px] text-gx-text-1 " +
  "outline-none transition-colors focus:border-gx-amber/30 placeholder:text-gx-text-3";

type FeedSort = "recent" | "popular";

/* ── types ───────────────────────────────────────────────────────────────── */
interface Club {
  id: string;
  name: string;
  description?: string;
  avatar?: string | null;
  genre?: string;
  isMember: boolean;
  game?: { rawgId: number; name: string; coverImage?: string };
  creator: { id: string; username: string; avatar?: string };
  _count: { members: number; posts: number };
}

interface GameOption {
  id: string;
  rawgId: number;
  name: string;
  coverImage?: string | null;
}

/* ── util ────────────────────────────────────────────────────────────────── */
function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/* ── GamePicker ──────────────────────────────────────────────────────────── */
function GamePicker({ selected, onSelect }: {
  selected: GameOption | null;
  onSelect: (g: GameOption | null) => void;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [dropRect, setDropRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const { data: results = [], isFetching } = useQuery<GameOption[]>({
    queryKey: ["game-search-club", q],
    queryFn: () => api.get(`/api/games/search?q=${encodeURIComponent(q)}`).then(r => r.data),
    enabled: q.trim().length >= 2,
    staleTime: 60_000,
  });

  function openDrop() {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (rect) setDropRect({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    setOpen(true);
  }

  function pick(g: GameOption) { onSelect(g); setQ(g.name); setOpen(false); }

  return (
    <div ref={wrapRef}>
      <label className={clubLabel}>Linked game (optional)</label>
      <div className="flex items-center gap-2">
        {selected?.coverImage && (
          <img src={selected.coverImage} alt={selected.name} className="w-6.5 h-8.5 object-cover rounded-sm shrink-0" />
        )}
        <input
          value={q}
          onChange={e => { setQ(e.target.value); onSelect(null); openDrop(); }}
          onFocus={() => { if (q.length >= 2 && !selected) openDrop(); }}
          placeholder="Search game…"
          className={clsx(clubInput, "flex-1")}
        />
        {selected && (
          <button onClick={() => { onSelect(null); setQ(""); setOpen(false); }}
            className="p-1.25 text-gx-text-3 bg-transparent border-none cursor-pointer hover:text-gx-text-1 transition-colors">
            <X size={13} />
          </button>
        )}
      </div>

      {open && !selected && q.length >= 2 && dropRect && typeof window !== "undefined" && createPortal(
        <>
          <div className="fixed inset-0 z-200" onClick={() => setOpen(false)} />
          <div style={{
            position: "fixed", top: dropRect.top, left: dropRect.left, width: dropRect.width,
            zIndex: 201, background: "var(--gx-surface-2)", border: "1px solid rgba(255,255,255,0.11)",
            borderRadius: 10, overflow: "hidden", boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
            maxHeight: 200, overflowY: "auto",
          }}>
            {isFetching && <p className="px-3 py-2 text-[12px] text-gx-text-3">Searching…</p>}
            {!isFetching && results.length === 0 && <p className="px-3 py-2 text-[12px] text-gx-text-3">No games found</p>}
            {results.map(g => (
              <button key={g.rawgId} onClick={() => pick(g)}
                className="w-full flex items-center gap-2.5 px-3 py-2 bg-transparent border-none cursor-pointer text-left transition-colors hover:bg-white/5">
                {g.coverImage
                  ? <img src={g.coverImage} alt={g.name} className="w-5 h-7 object-cover rounded-[3px] shrink-0" />
                  : <Gamepad2 size={13} className="text-gx-text-3 shrink-0" />}
                <span className="text-[12px] text-gx-text-2 truncate">{g.name}</span>
              </button>
            ))}
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

/* ── CreateClubModal ─────────────────────────────────────────────────────── */
function CreateClubModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const router = useRouter();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [genre, setGenre] = useState("");
  const [linkedGame, setLinkedGame] = useState<GameOption | null>(null);

  const mutation = useMutation({
    mutationFn: () => api.post("/api/clubs", {
      name: name.trim(),
      description: desc.trim() || undefined,
      genre: genre.trim() || undefined,
      rawgId: linkedGame?.rawgId || undefined,
    }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["clubs"] });
      router.push(`/clubs/${res.data.id}`);
      onClose();
    },
    onError: (err: any) => dispatchToast(err?.response?.data?.error ?? "Failed", "error"),
  });

  if (!user) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/72"
      onClick={onClose}
    >
      <div
        className="w-full max-w-95 bg-gx-surface border border-gx-border-md rounded-[18px] overflow-hidden shadow-[0_24px_64px_rgba(0,0,0,0.6)]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4.5 py-3.5 border-b border-gx-border">
          <h3 className="text-[15px] font-bold text-gx-text-1 m-0">Create Club</h3>
          <button onClick={onClose} className="p-1.25 text-gx-text-3 bg-transparent border-none cursor-pointer rounded-md transition-colors hover:text-gx-text-1">
            <X size={14} />
          </button>
        </div>
        <div className="px-4.5 py-4 flex flex-col gap-3">
          <div>
            <label className={clubLabel}>Club name *</label>
            <input value={name} onChange={e => setName(e.target.value)} maxLength={80}
              placeholder="e.g. Elden Ring Fan Club" className={clubInput} />
          </div>
          <div>
            <label className={clubLabel}>Description</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} maxLength={500} rows={2}
              placeholder="What is this club about?" className={clsx(clubInput, "resize-none")} />
          </div>
          <div>
            <label className={clubLabel}>Genre / Topic</label>
            <input value={genre} onChange={e => setGenre(e.target.value)} maxLength={40}
              placeholder="e.g. RPG, Action, Horror…" className={clubInput} />
          </div>
          <GamePicker selected={linkedGame} onSelect={setLinkedGame} />
          <button
            onClick={() => mutation.mutate()}
            disabled={!name.trim() || mutation.isPending}
            className={clsx(gx.btnPrimary, "w-full justify-center")}
          >
            {mutation.isPending ? "Creating…" : "Create Club"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── LEFT panel — club discovery ─────────────────────────────────────────── */
function LeftPanel({
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
                  <Link
                    href={`/clubs/${club.id}`}
                    className="block truncate text-[12px] font-bold text-gx-text-1 no-underline transition-colors group-hover:text-gx-amber"
                  >
                    {club.name}
                  </Link>
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

/* ── FeedPostCard ────────────────────────────────────────────────────────── */
function FeedPostCard({ post }: { post: ClubFeedPost }) {
  const preview = stripHtml(post.body);
  return (
    <article className="bg-gx-surface border border-gx-border rounded-[14px] px-4.5 py-4 transition-colors hover:border-gx-border-md flex flex-col gap-3">
      <Link href={`/clubs/${post.clubId}`} className="inline-flex items-center gap-1.5 w-fit no-underline group">
        <div className="w-4 h-4 rounded-full overflow-hidden bg-gx-surface-2 border border-gx-amber/30 shrink-0 flex items-center justify-center">
          {post.club.avatar
            ? <img src={post.club.avatar} alt={post.club.name} className="w-full h-full object-cover" />
            : <Users size={8} className="text-gx-amber" />}
        </div>
        <span className="text-[10px] font-bold text-gx-amber tracking-[0.08em] uppercase transition-colors group-hover:text-[#f5a33a]">
          {post.club.name}
        </span>
      </Link>

      <div className="flex items-center gap-2">
        <Avatar src={post.user.avatar} username={post.user.username} size="sm" />
        <div>
          <Link href={`/user/${post.user.username}`}
            className="text-[12px] font-bold text-gx-text-1 no-underline hover:text-gx-amber transition-colors">
            {post.user.username}
          </Link>
          <p className="text-[10px] text-gx-text-3 m-0 mt-px">{formatDistanceToNow(post.createdAt)}</p>
        </div>
      </div>

      {preview && (
        <p className="text-[13px] text-gx-text-2 leading-[1.6] line-clamp-3 m-0">{preview}</p>
      )}

      <div className="flex items-center gap-4 pt-2.5 border-t border-gx-border">
        <span className="flex items-center gap-1 text-[11px] text-gx-text-3">
          <Heart size={11} />{post._count.likes}
        </span>
        <span className="flex items-center gap-1 text-[11px] text-gx-text-3">
          <MessageSquare size={11} />{post._count.comments}
        </span>
        <Link href={`/clubs/${post.clubId}`}
          className="ml-auto text-[11px] text-gx-text-3 hover:text-gx-amber transition-colors no-underline">
          View →
        </Link>
      </div>
    </article>
  );
}

/* ── CENTER feed ─────────────────────────────────────────────────────────── */
function CenterFeed({ user, myClubs }: { user: any; myClubs: Club[] }) {
  const [sort, setSort] = useState<FeedSort>("recent");

  const { data: feedPosts = [], isLoading, isError } = useQuery<ClubFeedPost[]>({
    queryKey: ["clubs-feed", sort],
    queryFn: () => api.get(`/api/clubs/feed?sort=${sort}`).then(r => r.data),
    enabled: !!user && myClubs.length > 0,
    staleTime: 2 * 60_000,
    retry: 1,
  });

  return (
    <section className="flex flex-col gap-4 min-w-0">
      <div className="flex items-center justify-between">
        <div>
          <p className={gx.eyebrow}>Your</p>
          <h2 className="font-bebas text-[22px] tracking-[0.04em] text-gx-text-1 mt-0.5 leading-none">Club Feed</h2>
        </div>
        {user && myClubs.length > 0 && (
          <div className="flex gap-0.75 bg-gx-surface border border-gx-border rounded-xl p-0.75">
            {([
              { key: "recent" as FeedSort, icon: <Clock size={11} />, label: "Recent" },
              { key: "popular" as FeedSort, icon: <Flame size={11} />, label: "Popular" },
            ]).map(o => (
              <button
                key={o.key}
                onClick={() => setSort(o.key)}
                data-active={sort === o.key}
                className="inline-flex items-center gap-1 px-3 py-1.25 rounded-[9px] text-[11px] font-semibold bg-transparent border-none cursor-pointer transition-[background,color] whitespace-nowrap data-[active=true]:bg-gx-amber data-[active=true]:text-gx-ink not-data-[active=true]:text-gx-text-2 not-data-[active=true]:hover:text-gx-text-1 not-data-[active=true]:hover:bg-white/4"
              >
                {o.icon}{o.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {!user && (
        <div className="bg-gx-surface border border-gx-border rounded-[14px] px-5 py-10 text-center">
          <Swords size={30} className="mx-auto mb-3 text-gx-amber opacity-40" />
          <p className="text-[14px] font-bold text-gx-text-1 m-0 mb-1">Join the Clubs Community</p>
          <p className="text-[12px] text-gx-text-3 m-0">Sign in to see posts from your clubs.</p>
        </div>
      )}

      {user && myClubs.length === 0 && (
        <div className="bg-gx-surface border border-gx-border rounded-[14px] px-5 py-10 text-center">
          <Users size={30} className="mx-auto mb-3 text-gx-text-3 opacity-25" />
          <p className="text-[14px] font-bold text-gx-text-1 m-0 mb-1">No clubs joined yet</p>
          <p className="text-[12px] text-gx-text-3 m-0">Join clubs from the left panel to see their posts here.</p>
        </div>
      )}

      {isLoading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-37.5 rounded-[14px] bg-gx-surface border border-gx-border opacity-30 animate-pulse" />
          ))}
        </div>
      )}

      {isError && user && myClubs.length > 0 && (
        <div className="bg-gx-surface border border-gx-border rounded-[14px] px-5 py-8 text-center">
          <p className="text-[12px] text-gx-text-3 m-0">Could not load club feed. Visit individual clubs to see posts.</p>
        </div>
      )}

      {!isLoading && !isError && feedPosts.length === 0 && user && myClubs.length > 0 && (
        <div className="bg-gx-surface border border-gx-border rounded-[14px] px-5 py-10 text-center">
          <MessageSquare size={28} className="mx-auto mb-3 text-gx-text-3 opacity-25" />
          <p className="text-[12px] text-gx-text-3 m-0">No posts yet in your clubs. Be the first!</p>
        </div>
      )}

      {feedPosts.length > 0 && (
        <div className="flex flex-col gap-3">
          {feedPosts.map(post => <FeedPostCard key={post.id} post={post} />)}
        </div>
      )}
    </section>
  );
}

/* ── RIGHT panel — actions & my clubs ───────────────────────────────────── */
function RightPanel({
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

/* ── Main page ───────────────────────────────────────────────────────────── */
export default function ClubsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);

  const { data: clubs = [], isLoading } = useQuery<Club[]>({
    queryKey: ["clubs"],
    queryFn: () => api.get("/api/clubs").then(r => r.data),
    staleTime: 2 * 60_000,
  });

  const joinMutation = useMutation({
    mutationFn: ({ id, joined }: { id: string; joined: boolean }) =>
      joined ? api.delete(`/api/clubs/${id}/join`) : api.post(`/api/clubs/${id}/join`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clubs"] }),
    onError: (err: any) => dispatchToast(err?.response?.data?.error ?? "Failed", "error"),
  });

  const myClubs = clubs.filter(c => c.isMember);

  return (
    <div className="grid grid-cols-[240px_1fr_232px] gap-5 items-start px-4 py-6">
      {creating && <CreateClubModal onClose={() => setCreating(false)} />}

      <LeftPanel
        clubs={clubs}
        isLoading={isLoading}
        search={search}
        setSearch={setSearch}
        onJoin={(id, joined) => joinMutation.mutate({ id, joined })}
        user={user}
      />

      <CenterFeed user={user} myClubs={myClubs} />

      <RightPanel
        user={user}
        myClubs={myClubs}
        allClubs={clubs}
        onCreateClub={() => setCreating(true)}
      />
    </div>
  );
}
