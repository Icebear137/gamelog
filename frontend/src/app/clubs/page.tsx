"use client";

import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Users, Plus, Search, Tag, X, Gamepad2 } from "lucide-react";
import Link from "next/link";
import { Heading, Text, Flex, Box } from "@radix-ui/themes";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { dispatchToast } from "@/lib/toast";

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

interface GameOption { id: string; rawgId: number; name: string; coverImage?: string | null }

function GamePicker({ selected, onSelect }: {
  selected: GameOption | null;
  onSelect: (g: GameOption | null) => void;
}) {
  const [q, setQ]       = useState("");
  const [open, setOpen] = useState(false);
  const [dropRect, setDropRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const { data: results = [], isFetching } = useQuery<GameOption[]>({
    queryKey: ["game-search-club", q],
    queryFn: () => api.get(`/api/games/search?q=${encodeURIComponent(q)}`).then((r) => r.data),
    enabled: q.trim().length >= 2,
    staleTime: 60_000,
  });

  function openDrop() {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (rect) setDropRect({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    setOpen(true);
  }

  function pick(g: GameOption) {
    onSelect(g);
    setQ(g.name);
    setOpen(false);
  }

  return (
    <div ref={wrapRef}>
      <label className="text-xs text-gray-500 mb-1 block">Linked game (optional)</label>
      <div className="flex items-center gap-2">
        {selected?.coverImage && (
          <img src={selected.coverImage} alt={selected.name} className="w-7 h-9 object-cover rounded shrink-0" />
        )}
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); onSelect(null); openDrop(); }}
          onFocus={() => { if (q.length >= 2 && !selected) openDrop(); }}
          placeholder="Search game…"
          className="flex-1 bg-white/5 border border-white/10 focus:border-violet-500 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 outline-none transition-colors"
        />
        {selected && (
          <button onClick={() => { onSelect(null); setQ(""); setOpen(false); }} className="p-1.5 text-gray-500 hover:text-white transition-colors">
            <X size={13} />
          </button>
        )}
      </div>
      {open && !selected && q.length >= 2 && dropRect && typeof window !== "undefined" && createPortal(
        <>
          <div className="fixed inset-0 z-200" onClick={() => setOpen(false)} />
          <div style={{ position: "fixed", top: dropRect.top, left: dropRect.left, width: dropRect.width, zIndex: 201 }}
            className="bg-zinc-950 border border-white/10 rounded-xl overflow-hidden shadow-2xl max-h-52 overflow-y-auto">
            {isFetching && <p className="px-3 py-2 text-xs text-gray-500">Searching…</p>}
            {!isFetching && results.length === 0 && <p className="px-3 py-2 text-xs text-gray-500">No games found</p>}
            {results.map((g) => (
              <button key={g.rawgId} onClick={() => pick(g)}
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/8 transition-colors text-left">
                {g.coverImage
                  ? <img src={g.coverImage} alt={g.name} className="w-6 h-8 object-cover rounded shrink-0" />
                  : <Gamepad2 size={14} className="text-gray-600 shrink-0" />}
                <Text as="span" size="1" className="text-gray-200 truncate">{g.name}</Text>
              </button>
            ))}
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

function CreateClubModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const router = useRouter();
  const [name, setName]         = useState("");
  const [desc, setDesc]         = useState("");
  const [genre, setGenre]       = useState("");
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <Flex align="center" justify="between" className="px-4 py-3 border-b border-white/8">
          <Text size="2" weight="bold">Create Club</Text>
          <button onClick={onClose} className="p-1.5 text-gray-500 hover:text-white rounded-lg hover:bg-white/8 transition-colors"><X size={14} /></button>
        </Flex>
        <div className="p-4 space-y-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Club name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="e.g. Elden Ring Fan Club"
              className="w-full bg-white/5 border border-white/10 focus:border-violet-500 rounded-xl px-3 py-2 text-sm text-white outline-none transition-colors" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Description</label>
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={500} rows={2} placeholder="What is this club about?"
              className="w-full bg-white/5 border border-white/10 focus:border-violet-500 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 outline-none resize-none transition-colors" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Genre / Topic</label>
            <input value={genre} onChange={(e) => setGenre(e.target.value)} maxLength={40} placeholder="e.g. RPG, Action, Horror..."
              className="w-full bg-white/5 border border-white/10 focus:border-violet-500 rounded-xl px-3 py-2 text-sm text-white outline-none transition-colors" />
          </div>
          <GamePicker selected={linkedGame} onSelect={setLinkedGame} />
          <button
            onClick={() => mutation.mutate()}
            disabled={!name.trim() || mutation.isPending}
            className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-sm font-medium transition-colors"
          >
            {mutation.isPending ? "Creating…" : "Create Club"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ClubsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch]       = useState("");
  const [creating, setCreating]   = useState(false);

  const { data: clubs = [], isLoading } = useQuery<Club[]>({
    queryKey: ["clubs", search],
    queryFn: () => api.get(`/api/clubs${search ? `?q=${encodeURIComponent(search)}` : ""}`).then((r) => r.data),
    staleTime: 2 * 60_000,
  });

  const joinMutation = useMutation({
    mutationFn: ({ id, joined }: { id: string; joined: boolean }) =>
      joined ? api.delete(`/api/clubs/${id}/join`) : api.post(`/api/clubs/${id}/join`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clubs"] }),
    onError: (err: any) => dispatchToast(err?.response?.data?.error ?? "Failed", "error"),
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {creating && <CreateClubModal onClose={() => setCreating(false)} />}

      <Flex align="center" justify="between" className="flex-wrap gap-3">
        <Box>
          <Heading size="6" className="flex items-center gap-2">
            <Users size={22} className="text-violet-400" />
            Game Clubs
          </Heading>
          <Text as="p" size="2" color="gray" className="mt-1">
            Join communities built around games and genres.
          </Text>
        </Box>
        {user && (
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors"
          >
            <Plus size={15} /> Create Club
          </button>
        )}
      </Flex>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search clubs…"
          className="w-full bg-white/5 border border-white/10 hover:border-white/20 focus:border-violet-500 rounded-xl pl-8 pr-3 py-2 text-sm text-white placeholder-gray-500 outline-none transition-colors"
        />
      </div>

      {/* Clubs grid */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white/5 border border-white/8 rounded-2xl h-40 animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && clubs.length === 0 && (
        <div className="text-center py-20 bg-white/5 border border-white/8 rounded-2xl">
          <Users size={40} className="mx-auto mb-3 opacity-30 text-gray-500" />
          <Text as="p" size="2" color="gray">{search ? "No clubs match your search" : "No clubs yet. Be the first!"}</Text>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {clubs.map((club) => (
          <div key={club.id} className="bg-white/5 backdrop-blur-sm border border-white/8 hover:border-violet-700/50 rounded-2xl p-5 flex flex-col gap-3 transition-colors">
            <Flex align="start" gap="3">
              {club.avatar ? (
                <img src={club.avatar} alt={club.name} className="w-10 h-10 object-cover rounded-xl shrink-0" />
              ) : club.game?.coverImage ? (
                <img src={club.game.coverImage} alt={club.game.name} className="w-10 h-12 object-cover rounded-lg shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center shrink-0">
                  <Users size={18} className="text-violet-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <Link href={`/clubs/${club.id}`} className="font-semibold text-white hover:text-violet-300 transition-colors line-clamp-1">
                  {club.name}
                </Link>
                {club.description && (
                  <Text as="p" size="1" color="gray" className="mt-0.5 line-clamp-2">{club.description}</Text>
                )}
              </div>
            </Flex>

            <Flex align="center" justify="between" gap="2">
              <Flex align="center" gap="3">
                {club.genre && (
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <Tag size={10} /> {club.genre}
                  </span>
                )}
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <Users size={10} /> {club._count.members}
                </span>
              </Flex>
              {user && (
                <button
                  onClick={() => joinMutation.mutate({ id: club.id, joined: club.isMember })}
                  disabled={joinMutation.isPending}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    club.isMember
                      ? "bg-white/8 text-gray-400 hover:text-red-400 border border-white/10"
                      : "bg-violet-600/20 text-violet-300 border border-violet-500/30 hover:bg-violet-600/30"
                  }`}
                >
                  {club.isMember ? "Joined" : "Join"}
                </button>
              )}
            </Flex>
          </div>
        ))}
      </div>
    </div>
  );
}
