"use client";

import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Users, Plus, Search, Tag, X, Gamepad2 } from "lucide-react";
import Link from "next/link";
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

  function pick(g: GameOption) { onSelect(g); setQ(g.name); setOpen(false); }

  return (
    <div ref={wrapRef}>
      <label className="gx-club-label">Linked game (optional)</label>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {selected?.coverImage && (
          <img src={selected.coverImage} alt={selected.name} style={{ width: 26, height: 34, objectFit: "cover", borderRadius: 4, flexShrink: 0 }} />
        )}
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); onSelect(null); openDrop(); }}
          onFocus={() => { if (q.length >= 2 && !selected) openDrop(); }}
          placeholder="Search game…"
          className="gx-club-input"
          style={{ flex: 1 }}
        />
        {selected && (
          <button onClick={() => { onSelect(null); setQ(""); setOpen(false); }}
            style={{ padding: 5, color: "var(--gx-text-3)", background: "none", border: "none", cursor: "pointer" }}>
            <X size={13} />
          </button>
        )}
      </div>

      {open && !selected && q.length >= 2 && dropRect && typeof window !== "undefined" && createPortal(
        <>
          <div className="fixed inset-0 z-[200]" onClick={() => setOpen(false)} />
          <div style={{
            position: "fixed", top: dropRect.top, left: dropRect.left, width: dropRect.width,
            zIndex: 201, background: "var(--gx-surface-2)", border: "1px solid var(--gx-border-md)",
            borderRadius: 10, overflow: "hidden", boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
            maxHeight: 200, overflowY: "auto",
          }}>
            {isFetching && <p style={{ padding: "8px 12px", fontSize: 12, color: "var(--gx-text-3)" }}>Searching…</p>}
            {!isFetching && results.length === 0 && <p style={{ padding: "8px 12px", fontSize: 12, color: "var(--gx-text-3)" }}>No games found</p>}
            {results.map((g) => (
              <button key={g.rawgId} onClick={() => pick(g)} style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10,
                padding: "8px 12px", background: "none", border: "none", cursor: "pointer",
                textAlign: "left", transition: "background 0.1s",
              }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "none")}>
                {g.coverImage
                  ? <img src={g.coverImage} alt={g.name} style={{ width: 20, height: 27, objectFit: "cover", borderRadius: 3, flexShrink: 0 }} />
                  : <Gamepad2 size={13} style={{ color: "var(--gx-text-3)", flexShrink: 0 }} />}
                <span style={{ fontSize: 12, color: "var(--gx-text-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.name}</span>
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
    <div
      style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "rgba(0,0,0,0.72)" }}
      onClick={onClose}
    >
      <div
        style={{ width: "100%", maxWidth: 380, background: "var(--gx-surface)", border: "1px solid var(--gx-border-md)", borderRadius: 18, overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,0.6)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid var(--gx-border)" }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--gx-text-1)", margin: 0 }}>Create Club</h3>
          <button onClick={onClose} style={{ padding: 5, color: "var(--gx-text-3)", background: "none", border: "none", cursor: "pointer", borderRadius: 6, transition: "color 0.15s" }}>
            <X size={14} />
          </button>
        </div>
        <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label className="gx-club-label">Club name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="e.g. Elden Ring Fan Club" className="gx-club-input" />
          </div>
          <div>
            <label className="gx-club-label">Description</label>
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={500} rows={2} placeholder="What is this club about?"
              className="gx-club-input" style={{ resize: "none" }} />
          </div>
          <div>
            <label className="gx-club-label">Genre / Topic</label>
            <input value={genre} onChange={(e) => setGenre(e.target.value)} maxLength={40} placeholder="e.g. RPG, Action, Horror…" className="gx-club-input" />
          </div>
          <GamePicker selected={linkedGame} onSelect={setLinkedGame} />
          <button
            onClick={() => mutation.mutate()}
            disabled={!name.trim() || mutation.isPending}
            className="gx-btn-primary"
            style={{ width: "100%", justifyContent: "center" }}
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
  const [search, setSearch]     = useState("");
  const [creating, setCreating] = useState(false);

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
    <div className="gx-cl-page">
      {creating && <CreateClubModal onClose={() => setCreating(false)} />}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
        <div>
          <p className="gx-eyebrow" style={{ marginBottom: 4 }}>Community</p>
          <h1 className="gx-section-label" style={{ fontSize: 26, display: "flex", alignItems: "center", gap: 8 }}>
            <Users size={20} style={{ color: "var(--gx-amber)" }} />
            Game Clubs
          </h1>
          <p style={{ fontSize: 13, color: "var(--gx-text-2)", marginTop: 4 }}>
            Join communities built around games and genres.
          </p>
        </div>
        {user && (
          <button onClick={() => setCreating(true)} className="gx-btn-primary">
            <Plus size={14} /> Create Club
          </button>
        )}
      </div>

      {/* Search */}
      <div className="gx-cl-search">
        <Search size={13} className="gx-cl-search-icon" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search clubs…" className="gx-cl-search-input" />
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="gx-cl-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="gx-cl-card" style={{ height: 130, opacity: 0.35 }} />
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && clubs.length === 0 && (
        <div style={{ textAlign: "center", padding: "56px 24px", background: "var(--gx-surface)", border: "1px solid var(--gx-border)", borderRadius: 14 }}>
          <Users size={36} style={{ margin: "0 auto 10px", opacity: 0.18, color: "var(--gx-text-3)", display: "block" }} />
          <p style={{ fontSize: 13, color: "var(--gx-text-3)" }}>
            {search ? "No clubs match your search." : "No clubs yet. Be the first!"}
          </p>
        </div>
      )}

      {/* Clubs grid */}
      <div className="gx-cl-grid">
        {clubs.map((club) => (
          <div key={club.id} className="gx-cl-card">
            <div className="gx-cl-card-top">
              <div className="gx-cl-card-icon">
                {club.avatar ? (
                  <img src={club.avatar} alt={club.name} />
                ) : club.game?.coverImage ? (
                  <img src={club.game.coverImage} alt={club.game.name} />
                ) : (
                  <Users size={18} style={{ color: "var(--gx-amber)" }} />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Link href={`/clubs/${club.id}`} className="gx-cl-card-name">{club.name}</Link>
                {club.description && (
                  <p className="gx-cl-card-desc">{club.description}</p>
                )}
              </div>
            </div>

            <div className="gx-cl-card-foot">
              <div className="gx-cl-card-tags">
                {club.genre && (
                  <span className="gx-cl-card-genre"><Tag size={9} /> {club.genre}</span>
                )}
                <span className="gx-cl-card-members"><Users size={9} /> {club._count.members}</span>
              </div>
              {user && (
                <button
                  onClick={() => joinMutation.mutate({ id: club.id, joined: club.isMember })}
                  disabled={joinMutation.isPending}
                  className={`gx-cl-join-btn ${club.isMember ? "gx-cl-join-member" : "gx-cl-join-idle"}`}
                >
                  {club.isMember ? "Joined" : "Join"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
