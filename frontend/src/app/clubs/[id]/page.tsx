"use client";

import { use, useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users, Tag, Heart, MessageCircle, Send, Trash2, ArrowLeft, X,
  UserPlus, UserMinus, TrendingUp, Clock, Smile, Pin, PinOff,
  Pencil, Check, Shield, UserX, UserCheck, MoreHorizontal,
  Crown, ChevronDown, Image as ImageIcon, Gamepad2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import DOMPurify from "dompurify";
import { Heading, Text, Flex } from "@radix-ui/themes";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { dispatchToast } from "@/lib/toast";
import { formatDistanceToNow } from "@/lib/utils";
import Avatar from "@/components/Avatar";
import { ClubRichEditor } from "@/components/ClubRichEditor";
import { getSocket } from "@/lib/socket-client";

type Sort = "newest" | "popular" | "trending";

const SORT_OPTIONS: { key: Sort; label: string; icon: React.ReactNode }[] = [
  { key: "newest",   label: "Newest",   icon: <Clock size={13} /> },
  { key: "popular",  label: "Popular",  icon: <Heart size={13} /> },
  { key: "trending", label: "Trending", icon: <TrendingUp size={13} /> },
];

const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥", "🎮", "👏"];

interface Reaction { id: string; emoji: string; userId: string }
interface ClubPost {
  id: string; body: string; createdAt: string; updatedAt: string;
  likedByMe: boolean;
  user: { id: string; username: string; avatar?: string };
  reactions: Reaction[];
  _count: { comments: number; likes: number; reactions: number };
}
interface ClubMember {
  id: string; role: string; isBanned: boolean; joinedAt: string;
  user: { id: string; username: string; avatar?: string; _count: { gameEntries: number } };
}
interface GameOption { id: string; rawgId: number; name: string; coverImage?: string | null }
interface ClubDetail {
  id: string; name: string; description?: string; genre?: string; avatar?: string | null;
  isMember: boolean; isBanned: boolean; myRole: string | null; pinnedPostId?: string | null;
  creator: { id: string; username: string; avatar?: string };
  game?: { rawgId: number; name: string; coverImage?: string } | null;
  members: ClubMember[];
  pinnedPost?: ClubPost | null;
  _count: { members: number; posts: number };
}

// ── Safe HTML renderer ────────────────────────────────────────────────────────
function PostBody({ html }: { html: string }) {
  const clean = typeof window !== "undefined" ? DOMPurify.sanitize(html) : html;
  return <div className="club-post-content text-sm text-gray-200 leading-relaxed" dangerouslySetInnerHTML={{ __html: clean }} />;
}

// ── Confirm inline ────────────────────────────────────────────────────────────
function InlineConfirm({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="flex items-center gap-2 text-xs bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-1.5">
      <span className="text-gray-300">{message}</span>
      <button onClick={onConfirm} className="text-red-400 font-medium hover:text-red-300 transition-colors">Delete</button>
      <button onClick={onCancel} className="text-gray-500 hover:text-white transition-colors">Cancel</button>
    </div>
  );
}

// ── Reaction bar ──────────────────────────────────────────────────────────────
function ReactionBar({ post, clubId, currentUserId, onUpdate }: {
  post: ClubPost; clubId: string; currentUserId?: string;
  onUpdate: (reactions: Reaction[]) => void;
}) {
  const [showPicker, setShowPicker] = useState(false);

  const mutation = useMutation({
    mutationFn: (emoji: string) => api.post(`/api/clubs/${clubId}/posts/${post.id}/reactions`, { emoji }),
    onSuccess: (res) => { onUpdate(res.data.reactions); setShowPicker(false); },
    onError: (err: any) => dispatchToast(err?.response?.data?.error ?? "Failed", "error"),
  });

  const grouped = REACTION_EMOJIS.reduce<Record<string, { count: number; mine: boolean }>>((acc, e) => {
    const matching = post.reactions.filter((r) => r.emoji === e);
    if (matching.length > 0) acc[e] = { count: matching.length, mine: matching.some((r) => r.userId === currentUserId) };
    return acc;
  }, {});

  return (
    <div className="flex items-center gap-1.5 flex-wrap relative">
      {Object.entries(grouped).map(([emoji, { count, mine }]) => (
        <button key={emoji} onClick={() => currentUserId && mutation.mutate(emoji)}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors ${
            mine ? "bg-violet-500/20 border-violet-500/40 text-violet-300" : "bg-white/5 border-white/10 text-gray-300 hover:border-violet-500/40"
          }`}>
          {emoji} <span>{count}</span>
        </button>
      ))}
      {currentUserId && (
        <div className="relative">
          <button onClick={() => setShowPicker((v) => !v)} className="p-1 rounded-lg text-gray-500 hover:text-violet-400 hover:bg-white/5 transition-colors">
            <Smile size={14} />
          </button>
          {showPicker && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowPicker(false)} />
              <div className="absolute bottom-full left-0 mb-1 z-20 bg-zinc-950 border border-white/10 rounded-xl p-2 flex gap-1 shadow-xl">
                {REACTION_EMOJIS.map((e) => (
                  <button key={e} onClick={() => mutation.mutate(e)}
                    className="text-lg w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors">{e}</button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Post card ─────────────────────────────────────────────────────────────────
function PostCard({ post, clubId, currentUserId, isAdmin, isPinned, onPin, onUpdate, onDelete }: {
  post: ClubPost; clubId: string; currentUserId?: string;
  isAdmin: boolean; isPinned: boolean;
  onPin: () => void;
  onUpdate: (updated: ClubPost) => void;
  onDelete: () => void;
}) {
  const qc = useQueryClient();
  const [showComments, setShowComments] = useState(false);
  const [commentBody, setCommentBody]   = useState("");
  const [likeCount, setLikeCount]       = useState(post._count.likes);
  const [liked, setLiked]               = useState(post.likedByMe);
  const [reactions, setReactions]       = useState<Reaction[]>(post.reactions);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing]           = useState(false);
  const [editHtml, setEditHtml]         = useState(post.body);
  const [editKey, setEditKey]           = useState(0);
  const [showMenu, setShowMenu]         = useState(false);

  const { data: comments = [] } = useQuery({
    queryKey: ["club-post-comments", post.id],
    queryFn: () => api.get(`/api/clubs/${clubId}/posts/${post.id}/comments`).then((r) => r.data),
    enabled: showComments,
  });

  const likeMutation = useMutation({
    mutationFn: () => liked ? api.delete(`/api/clubs/${clubId}/posts/${post.id}/like`) : api.post(`/api/clubs/${clubId}/posts/${post.id}/like`),
    onSuccess: (res) => { setLiked(res.data.liked); setLikeCount(res.data.count); },
    onError: (err: any) => dispatchToast(err?.response?.data?.error ?? "Failed", "error"),
  });

  const commentMutation = useMutation({
    mutationFn: () => api.post(`/api/clubs/${clubId}/posts/${post.id}/comments`, { body: commentBody }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["club-post-comments", post.id] }); setCommentBody(""); },
    onError: (err: any) => dispatchToast(err?.response?.data?.error ?? "Failed", "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/api/clubs/${clubId}/posts/${post.id}`),
    onSuccess: () => { onDelete(); dispatchToast("Post deleted", "success"); },
    onError: (err: any) => dispatchToast(err?.response?.data?.error ?? "Failed", "error"),
  });

  const editMutation = useMutation({
    mutationFn: () => api.patch(`/api/clubs/${clubId}/posts/${post.id}`, { body: editHtml }),
    onSuccess: (res) => { onUpdate({ ...post, body: res.data.body, updatedAt: res.data.updatedAt }); setEditing(false); dispatchToast("Post updated", "success"); },
    onError: (err: any) => dispatchToast(err?.response?.data?.error ?? "Failed", "error"),
  });

  const isOwn  = currentUserId === post.user.id;
  const canEdit = isOwn;
  const canDelete = isOwn || isAdmin;
  const canPin  = isAdmin;

  return (
    <div className={`bg-white/5 backdrop-blur-sm border rounded-2xl p-5 space-y-3 transition-colors ${isPinned ? "border-violet-500/30 bg-violet-900/5" : "border-white/8"}`}>
      {isPinned && (
        <div className="flex items-center gap-1.5 text-[10px] text-violet-400 font-medium">
          <Pin size={10} /> Pinned post
        </div>
      )}

      {/* Header */}
      <Flex align="center" justify="between" gap="2">
        <Link href={`/user/${post.user.username}`} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <Avatar src={post.user.avatar} username={post.user.username} size="sm" />
          <div>
            <Text as="p" size="2" className="font-semibold">{post.user.username}</Text>
            <Text as="p" size="1" color="gray">
              {formatDistanceToNow(post.createdAt)}
              {post.updatedAt !== post.createdAt && <span className="ml-1 opacity-60">(edited)</span>}
            </Text>
          </div>
        </Link>

        {/* Post menu */}
        {(canEdit || canDelete || canPin) && (
          <div className="relative">
            <button onClick={() => setShowMenu((v) => !v)}
              className="p-1.5 text-gray-600 hover:text-white hover:bg-white/8 rounded-lg transition-colors">
              <MoreHorizontal size={15} />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-full mt-1 z-20 bg-zinc-950 border border-white/10 rounded-xl overflow-hidden shadow-xl min-w-32">
                  {canEdit && (
                    <button onClick={() => { setEditKey(k => k+1); setEditHtml(post.body); setEditing(true); setShowMenu(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-white/8 transition-colors">
                      <Pencil size={13} /> Edit
                    </button>
                  )}
                  {canPin && (
                    <button onClick={() => { onPin(); setShowMenu(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-white/8 transition-colors">
                      {isPinned ? <><PinOff size={13} /> Unpin</> : <><Pin size={13} /> Pin post</>}
                    </button>
                  )}
                  {canDelete && (
                    <button onClick={() => { setConfirmDelete(true); setShowMenu(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors">
                      <Trash2 size={13} /> Delete
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </Flex>

      {/* Confirm delete */}
      {confirmDelete && (
        <InlineConfirm
          message="Delete this post?"
          onConfirm={() => deleteMutation.mutate()}
          onCancel={() => setConfirmDelete(false)}
        />
      )}

      {/* Edit mode */}
      {editing ? (
        <div className="space-y-2">
          <ClubRichEditor key={editKey} content={editHtml} onChange={setEditHtml} minHeight={80} />
          <Flex gap="2" justify="end">
            <button onClick={() => setEditing(false)} className="px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
            <button onClick={() => editMutation.mutate()} disabled={!editHtml.trim() || editMutation.isPending}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white transition-colors">
              <Check size={13} /> Save
            </button>
          </Flex>
        </div>
      ) : (
        <PostBody html={post.body} />
      )}

      {/* Reactions */}
      <ReactionBar post={{ ...post, reactions }} clubId={clubId} currentUserId={currentUserId} onUpdate={setReactions} />

      {/* Actions */}
      <Flex align="center" gap="3" className="pt-1 border-t border-white/6">
        <button onClick={() => currentUserId && likeMutation.mutate()}
          className={`flex items-center gap-1.5 text-xs transition-colors ${liked ? "text-red-400" : "text-gray-500 hover:text-red-400"}`}>
          <Heart size={13} fill={liked ? "currentColor" : "none"} />
          {likeCount > 0 && <span>{likeCount}</span>}
          <span>Like</span>
        </button>
        <button onClick={() => setShowComments((v) => !v)}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-violet-400 transition-colors">
          <MessageCircle size={13} />
          {post._count.comments > 0 ? post._count.comments : ""} Comment
        </button>
      </Flex>

      {/* Comments */}
      {showComments && (
        <div className="space-y-2 pt-1 border-t border-white/6">
          {(comments as any[]).map((c: any) => (
            <div key={c.id} className="flex gap-2.5">
              <Avatar src={c.user.avatar} username={c.user.username} size="sm" />
              <div className="flex-1 bg-white/5 rounded-xl px-3 py-2">
                <Text as="p" size="1" className="font-semibold text-violet-300 mb-0.5">{c.user.username}</Text>
                <Text as="p" size="1" color="gray">{c.body}</Text>
              </div>
            </div>
          ))}
          {currentUserId && (
            <div className="flex gap-2">
              <input value={commentBody} onChange={(e) => setCommentBody(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && commentBody.trim()) { e.preventDefault(); commentMutation.mutate(); } }}
                placeholder="Write a comment…"
                className="flex-1 bg-white/5 border border-white/10 focus:border-violet-500 rounded-xl px-3 py-1.5 text-sm text-white placeholder-gray-600 outline-none transition-colors" />
              <button onClick={() => commentMutation.mutate()} disabled={!commentBody.trim() || commentMutation.isPending}
                className="p-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 rounded-xl text-white transition-colors">
                <Send size={13} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── MemberRow — module-level to prevent remount on every MembersSidebar render ──
interface MemberRowProps {
  m: ClubMember;
  isOnline: boolean;
  isAdmin: boolean;
  isCreator: boolean;
  currentUserId?: string;
  creatorId: string;
  onKick: (userId: string) => void;
  onBan: (userId: string, banned: boolean) => void;
  onRole: (userId: string, role: string) => void;
}

function MemberRow({ m, isOnline, isAdmin, isCreator, currentUserId, creatorId, onKick, onBan, onRole }: MemberRowProps) {
  const isMe = m.user.id === currentUserId;
  const isClubCreator = m.user.id === creatorId;
  const canManage = isCreator && !isMe && !isClubCreator;
  const canAdminManage = isAdmin && !isMe && !isClubCreator && !isCreator;

  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);

  function toggleMenu(e: React.MouseEvent<HTMLButtonElement>) {
    if (menuPos) { setMenuPos(null); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
  }

  return (
    <div className="flex items-center gap-2 py-1.5 group">
      <div className="relative shrink-0">
        <Avatar src={m.user.avatar} username={m.user.username} size="sm" />
        <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-zinc-950 ${isOnline ? "bg-green-400" : "bg-gray-600"}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <Text as="span" size="1" className="font-medium text-gray-200 truncate">{m.user.username}</Text>
          {isClubCreator && <Crown size={10} className="text-yellow-400 shrink-0" />}
          {m.role === "admin" && !isClubCreator && <Shield size={10} className="text-violet-400 shrink-0" />}
        </div>
        <Text as="p" size="1" color="gray" className="opacity-60">{m.user._count.gameEntries} games</Text>
      </div>

      {(canManage || canAdminManage) && !m.isBanned && (
        <>
          <button
            onClick={toggleMenu}
            className="opacity-0 group-hover:opacity-100 p-1 text-gray-600 hover:text-white transition-all rounded-lg hover:bg-white/8 shrink-0"
          >
            <MoreHorizontal size={13} />
          </button>
          {menuPos && typeof window !== "undefined" && createPortal(
            <>
              <div className="fixed inset-0 z-[200]" onClick={() => setMenuPos(null)} />
              <div
                style={{ position: "fixed", top: menuPos.top, right: menuPos.right, zIndex: 201 }}
                className="bg-zinc-950 border border-white/10 rounded-xl overflow-hidden shadow-2xl min-w-36"
              >
                {canManage && (
                  <button
                    onClick={() => { onRole(m.user.id, m.role === "admin" ? "member" : "admin"); setMenuPos(null); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-white/8 transition-colors"
                  >
                    {m.role === "admin" ? <><UserCheck size={12} /> Remove admin</> : <><Shield size={12} /> Make admin</>}
                  </button>
                )}
                <button
                  onClick={() => { onKick(m.user.id); setMenuPos(null); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-orange-400 hover:bg-orange-500/10 transition-colors"
                >
                  <UserX size={12} /> Kick
                </button>
                <button
                  onClick={() => { onBan(m.user.id, false); setMenuPos(null); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <UserX size={12} /> Ban
                </button>
              </div>
            </>,
            document.body
          )}
        </>
      )}
      {m.isBanned && isAdmin && (
        <button onClick={() => onBan(m.user.id, true)}
          className="text-[10px] text-gray-500 hover:text-green-400 transition-colors px-1.5 py-0.5 rounded-md border border-white/10 hover:border-green-500/30">
          Unban
        </button>
      )}
    </div>
  );
}

// ── Members sidebar ───────────────────────────────────────────────────────────
function MembersSidebar({ club, currentUserId, onUpdate, onlineSet }: {
  club: ClubDetail;
  currentUserId?: string;
  onlineSet: Set<string>;
  onUpdate: () => void;
}) {

  const isAdmin = club.myRole === "admin";
  const isCreator = club.creator.id === currentUserId;

  const kickMutation = useMutation({
    mutationFn: (userId: string) => api.delete(`/api/clubs/${club.id}/members/${userId}`),
    onSuccess: () => { onUpdate(); dispatchToast("Member removed", "success"); },
    onError: (err: any) => dispatchToast(err?.response?.data?.error ?? "Failed", "error"),
  });

  const banMutation = useMutation({
    mutationFn: ({ userId, banned }: { userId: string; banned: boolean }) =>
      banned ? api.delete(`/api/clubs/${club.id}/members/${userId}/ban`) : api.post(`/api/clubs/${club.id}/members/${userId}/ban`),
    onSuccess: () => { onUpdate(); dispatchToast("Updated", "success"); },
    onError: (err: any) => dispatchToast(err?.response?.data?.error ?? "Failed", "error"),
  });

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      api.patch(`/api/clubs/${club.id}/members/${userId}/role`, { role }),
    onSuccess: () => { onUpdate(); dispatchToast("Role updated", "success"); },
    onError: (err: any) => dispatchToast(err?.response?.data?.error ?? "Failed", "error"),
  });

  // onlineSet is seeded from DB on load and updated live by socket events
  const isOnline = (m: ClubMember) => onlineSet.has(m.user.id);

  const online  = club.members.filter((m) => isOnline(m)  && !m.isBanned);
  const offline = club.members.filter((m) => !isOnline(m) && !m.isBanned);
  const banned  = isAdmin ? club.members.filter((m) => m.isBanned) : [];

  const rowProps = {
    isAdmin, isCreator, currentUserId, creatorId: club.creator.id,
    onKick: (userId: string) => kickMutation.mutate(userId),
    onBan:  (userId: string, banned: boolean) => banMutation.mutate({ userId, banned }),
    onRole: (userId: string, role: string) => roleMutation.mutate({ userId, role }),
  };

  function Group({ title, members, count }: { title: string; members: ClubMember[]; count?: number }) {
    const [open, setOpen] = useState(true);
    return (
      <div className="mb-2">
        <button onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-gray-500 py-1 hover:text-gray-400 transition-colors">
          <span>{title} {count != null ? `— ${count}` : ""}</span>
          <ChevronDown size={11} className={`transition-transform ${open ? "" : "-rotate-90"}`} />
        </button>
        {open && members.map((m) => (
          <MemberRow key={m.user.id} m={m} isOnline={isOnline(m)} {...rowProps} />
        ))}
      </div>
    );
  }

  return (
    <div className="w-56 shrink-0 hidden lg:block">
      <div className="sticky top-6 bg-white/5 backdrop-blur-sm border border-white/8 rounded-2xl p-4">
        <Text as="p" size="1" className="font-semibold text-gray-300 mb-3 flex items-center gap-1.5">
          <Users size={13} className="text-violet-400" />
          Members
          <span className="ml-auto text-gray-500">{club._count.members}</span>
        </Text>

        <div className="space-y-0 max-h-[60vh] overflow-y-auto pr-1">
          {online.length > 0  && <Group title="Online"  members={online}  count={online.length} />}
          {offline.length > 0 && <Group title="Offline" members={offline} />}
          {banned.length > 0  && <Group title="Banned"  members={banned}  count={banned.length} />}
        </div>
      </div>
    </div>
  );
}

// ── Inline game picker for club forms ────────────────────────────────────────
function GamePickerInline({ selected, onSelect }: {
  selected: GameOption | null;
  onSelect: (g: GameOption | null) => void;
}) {
  const [q, setQ]       = useState(selected?.name ?? "");
  const [open, setOpen] = useState(false);
  const [dropRect, setDropRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setQ(selected?.name ?? ""); }, [selected?.name]);

  const { data: results = [], isFetching } = useQuery<GameOption[]>({
    queryKey: ["game-search-club-inline", q],
    queryFn: () => api.get(`/api/games/search?q=${encodeURIComponent(q)}`).then((r) => r.data),
    enabled: q.trim().length >= 2 && !selected,
    staleTime: 60_000,
  });

  function openDrop() {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (rect) setDropRect({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    setOpen(true);
  }

  return (
    <div ref={wrapRef}>
      <label className="text-xs text-gray-500 mb-1 block">Linked game</label>
      <div className="flex items-center gap-2">
        {selected?.coverImage && (
          <img src={selected.coverImage} alt={selected.name} className="w-7 h-9 object-cover rounded shrink-0" />
        )}
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); onSelect(null); openDrop(); }}
          onFocus={() => { if (q.length >= 2 && !selected) openDrop(); }}
          placeholder="Search and link a game…"
          className="flex-1 bg-white/5 border border-white/10 focus:border-violet-500 rounded-xl px-3 py-1.5 text-sm text-white placeholder-gray-600 outline-none transition-colors"
        />
        {selected && (
          <button onClick={() => { onSelect(null); setQ(""); setOpen(false); }} className="p-1 text-gray-500 hover:text-white transition-colors shrink-0">
            <X size={13} />
          </button>
        )}
      </div>
      {open && !selected && q.length >= 2 && dropRect && typeof window !== "undefined" && createPortal(
        <>
          <div className="fixed inset-0 z-200" onClick={() => setOpen(false)} />
          <div style={{ position: "fixed", top: dropRect.top, left: dropRect.left, width: dropRect.width, zIndex: 201 }}
            className="bg-zinc-950 border border-white/10 rounded-xl overflow-hidden shadow-2xl max-h-44 overflow-y-auto">
            {isFetching && <p className="px-3 py-2 text-xs text-gray-500">Searching…</p>}
            {!isFetching && results.length === 0 && <p className="px-3 py-2 text-xs text-gray-500">No games found</p>}
            {results.map((g) => (
              <button key={g.rawgId} onClick={() => { onSelect(g); setQ(g.name); setOpen(false); }}
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

// ── Club header (avatar + info + edit) ───────────────────────────────────────
function ClubHeader({ club, isAdmin, user, onJoin, joinPending, onUpdate }: {
  club: ClubDetail;
  isAdmin: boolean;
  user: { id: string; username: string; avatar?: string } | null;
  onJoin: () => void;
  joinPending: boolean;
  onUpdate: () => void;
}) {
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing]   = useState(false);
  const [name, setName]             = useState(club.name);
  const [desc, setDesc]             = useState(club.description ?? "");
  const [genre, setGenre]           = useState(club.genre ?? "");
  const [linkedGame, setLinkedGame] = useState<GameOption | null>(
    club.game ? { id: "", rawgId: club.game.rawgId, name: club.game.name, coverImage: club.game.coverImage } : null
  );
  const [uploading, setUploading]   = useState(false);

  // Keep form in sync if club data refreshes
  useEffect(() => {
    if (!editing) {
      setName(club.name);
      setDesc(club.description ?? "");
      setGenre(club.genre ?? "");
      setLinkedGame(club.game
        ? { id: "", rawgId: club.game.rawgId, name: club.game.name, coverImage: club.game.coverImage }
        : null
      );
    }
  }, [club.name, club.description, club.genre, club.game, editing]);

  const saveMutation = useMutation({
    mutationFn: () => api.patch(`/api/clubs/${club.id}`, {
      name: name.trim() || undefined,
      description: desc.trim() || undefined,
      genre: genre.trim() || undefined,
      rawgId: linkedGame?.rawgId || undefined, gameId: linkedGame ? undefined : null,
    }),
    onSuccess: () => { setEditing(false); onUpdate(); dispatchToast("Club updated", "success"); },
    onError: (err: any) => dispatchToast(err?.response?.data?.error ?? "Failed", "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/api/clubs/${club.id}`),
    onSuccess: () => {
      dispatchToast("Club deleted", "success");
      window.location.href = "/clubs";
    },
    onError: (err: any) => dispatchToast(err?.response?.data?.error ?? "Failed to delete", "error"),
  });

  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploading(true);
    try {
      const form = new FormData();
      form.append("avatar", file);
      await api.post(`/api/clubs/${club.id}/avatar`, form, { headers: { "Content-Type": "multipart/form-data" } });
      onUpdate();
      dispatchToast("Avatar updated", "success");
    } catch (err: any) {
      dispatchToast(err?.response?.data?.error ?? "Upload failed", "error");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/8 rounded-2xl p-5">
      <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />

      <Flex align="start" justify="between" gap="3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Avatar */}
          <div className="relative shrink-0 group">
            {club.avatar || club.game?.coverImage ? (
              <img
                src={club.avatar ?? club.game!.coverImage!}
                alt={club.name}
                className="w-14 h-14 rounded-xl object-cover border border-white/10"
              />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
                <Users size={24} className="text-violet-400" />
              </div>
            )}
            {isAdmin && (
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploading}
                className="absolute inset-0 rounded-xl bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                title="Change avatar"
              >
                {uploading
                  ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  : <ImageIcon size={16} className="text-white" />
                }
              </button>
            )}
          </div>

          {/* Info or edit form */}
          {editing ? (
            <div className="flex-1 space-y-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
                placeholder="Club name"
                className="w-full bg-white/5 border border-white/10 focus:border-violet-500 rounded-xl px-3 py-1.5 text-sm font-semibold text-white outline-none transition-colors"
              />
              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                maxLength={500}
                rows={2}
                placeholder="Description (optional)"
                className="w-full bg-white/5 border border-white/10 focus:border-violet-500 rounded-xl px-3 py-1.5 text-sm text-white placeholder-gray-600 outline-none resize-none transition-colors"
              />
              <input
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                maxLength={40}
                placeholder="Genre / Topic (e.g. RPG, Action…)"
                className="w-full bg-white/5 border border-white/10 focus:border-violet-500 rounded-xl px-3 py-1.5 text-sm text-white placeholder-gray-600 outline-none transition-colors"
              />
              <GamePickerInline selected={linkedGame} onSelect={setLinkedGame} />
              <Flex gap="2">
                <button
                  onClick={() => saveMutation.mutate()}
                  disabled={!name.trim() || saveMutation.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white transition-colors"
                >
                  <Check size={13} /> Save
                </button>
                <button onClick={() => setEditing(false)} className="px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white transition-colors">
                  Cancel
                </button>
              </Flex>
            </div>
          ) : (
            <div className="flex-1 min-w-0">
              <Flex align="center" gap="2">
                <Heading size="5" className="truncate">{club.name}</Heading>
                {isAdmin && (
                  <button onClick={() => setEditing(true)} className="p-1 text-gray-600 hover:text-violet-400 transition-colors shrink-0" title="Edit club info">
                    <Pencil size={13} />
                  </button>
                )}
              </Flex>
              {club.description && <Text as="p" size="2" color="gray" className="mt-0.5 line-clamp-2">{club.description}</Text>}
              <Flex align="center" gap="3" className="mt-2 flex-wrap">
                {club.genre && <span className="flex items-center gap-1 text-xs text-gray-500"><Tag size={10} /> {club.genre}</span>}
                <span className="flex items-center gap-1 text-xs text-gray-500"><Users size={10} /> {club._count.members} members</span>
                {isAdmin && <span className="flex items-center gap-1 text-xs text-violet-400"><Shield size={10} /> Admin</span>}
              </Flex>
            </div>
          )}
        </div>

        {!editing && user && (
          <div className="flex flex-col gap-2 shrink-0">
            <button
              onClick={onJoin}
              disabled={joinPending}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                club.isMember
                  ? "bg-white/8 text-gray-400 hover:text-red-400 border border-white/10"
                  : "bg-violet-600/20 text-violet-300 border border-violet-500/30 hover:bg-violet-600/30"
              }`}
            >
              {club.isMember ? <><UserMinus size={14} /> Leave</> : <><UserPlus size={14} /> Join</>}
            </button>
            {isAdmin && !confirmDelete && (
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-red-400 border border-red-500/20 hover:bg-red-500/10 transition-colors"
              >
                <Trash2 size={14} /> Delete club
              </button>
            )}
            {isAdmin && confirmDelete && (
              <div className="flex flex-col gap-1.5 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                <p className="text-xs text-red-300 font-medium">Delete this club?</p>
                <p className="text-[10px] text-gray-500">All posts and members will be removed.</p>
                <div className="flex gap-2 mt-1">
                  <button
                    onClick={() => deleteMutation.mutate()}
                    disabled={deleteMutation.isPending}
                    className="flex-1 py-1.5 rounded-lg text-xs bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-medium transition-colors"
                  >
                    {deleteMutation.isPending ? "Deleting…" : "Delete"}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="flex-1 py-1.5 rounded-lg text-xs bg-white/8 text-gray-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Flex>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ClubDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const router = useRouter();


  const [sort, setSort]         = useState<Sort>("newest");
  const [postHtml, setPostHtml] = useState("");
  const [editorKey, setEditorKey] = useState(0); // increment to reset editor
  const [posts, setPosts]       = useState<ClubPost[]>([]);

  const handleEditorChange = useCallback((html: string) => setPostHtml(html), []);

  // ── Realtime member presence ─────────────────────────────────────────────
  const [onlineSet, setOnlineSet] = useState<Set<string>>(new Set());

  const { data: club, isLoading, refetch: refetchClub } = useQuery<ClubDetail>({
    queryKey: ["club", id],
    queryFn: () => api.get(`/api/clubs/${id}`).then((r) => r.data),
    staleTime: 30_000,
  });

  // Unified effect — registers listener + queries presence, handles socket reconnect
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const memberIds = club?.members?.map((m) => m.user.id) ?? [];

    function handlePresence({ userId, isOnline }: { userId: string; isOnline: boolean }) {
      setOnlineSet((prev) => {
        const next = new Set(prev);
        if (isOnline) next.add(userId); else next.delete(userId);
        return next;
      });
    }

    function queryAll() {
      memberIds.forEach((uid) => socket!.emit("get_presence", { userId: uid }));
    }

    socket.on("presence_update", handlePresence);
    // Re-query on reconnect (handles page reload race condition)
    socket.on("connect", queryAll);

    // Query immediately if socket is already connected, otherwise wait for "connect"
    if (socket.connected && memberIds.length > 0) queryAll();

    return () => {
      socket.off("presence_update", handlePresence);
      socket.off("connect", queryAll);
    };
  // Re-run when member list changes so newly joined members get queried
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [club?.members]);

  const { data: fetchedPosts = [] } = useQuery<ClubPost[]>({
    queryKey: ["club-posts", id, sort],
    queryFn: () => api.get(`/api/clubs/${id}/posts?sort=${sort}`).then((r) => r.data),
    staleTime: 30_000,
    enabled: !!club,
  });

  // Sync fetched posts into local state (replaces removed onSuccess in TanStack Query v5)
  useEffect(() => {
    if (fetchedPosts.length > 0) setPosts(fetchedPosts);
  }, [fetchedPosts]);

  const allPosts = posts.length > 0 ? posts : fetchedPosts;

  const joinMutation = useMutation({
    mutationFn: () => club?.isMember ? api.delete(`/api/clubs/${id}/join`) : api.post(`/api/clubs/${id}/join`),
    onSuccess: () => refetchClub(),
    onError: (err: any) => dispatchToast(err?.response?.data?.error ?? "Failed", "error"),
  });

  const postMutation = useMutation({
    mutationFn: () => api.post(`/api/clubs/${id}/posts`, { body: postHtml.trim() }),
    onSuccess: (res) => {
      setPosts((prev) => [{ ...res.data, likedByMe: false }, ...prev]);
      setPostHtml("");
      setEditorKey((k) => k + 1); // reset editor
    },
    onError: (err: any) => dispatchToast(err?.response?.data?.error ?? "Join the club to post", "error"),
  });

  const pinMutation = useMutation({
    mutationFn: (postId: string) => api.post(`/api/clubs/${id}/pin/${postId}`),
    onSuccess: () => refetchClub(),
    onError: (err: any) => dispatchToast(err?.response?.data?.error ?? "Failed", "error"),
  });

  function handleUpdatePost(updated: ClubPost) {
    setPosts((prev) => prev.map((p) => p.id === updated.id ? { ...p, ...updated } : p));
  }

  function handleDeletePost(postId: string) {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    if (club?.pinnedPostId === postId) refetchClub();
  }

  if (isLoading) return <div className="py-16 text-center text-gray-500 text-sm">Loading…</div>;
  if (!club) return <div className="py-16 text-center text-gray-500 text-sm">Club not found</div>;

  // Show ban screen — user cannot see or interact with anything
  if (club.isBanned) return (
    <div className="max-w-md mx-auto mt-20 text-center space-y-4">
      <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
        <Shield size={28} className="text-red-400" />
      </div>
      <div>
        <Heading size="5" className="text-red-400 mb-2">You've been banned</Heading>
        <Text as="p" size="2" color="gray">
          You have been banned from <strong className="text-white">{club.name}</strong> and cannot access its content.
        </Text>
        <Text as="p" size="2" color="gray" className="mt-1">
          If you believe this is a mistake, contact a club admin.
        </Text>
      </div>
      <button
        onClick={() => router.push("/clubs")}
        className="flex items-center gap-2 mx-auto px-4 py-2 rounded-xl bg-white/8 text-gray-400 hover:text-white text-sm transition-colors"
      >
        <ArrowLeft size={14} /> Back to Clubs
      </button>
    </div>
  );

  const isAdmin = club.myRole === "admin";

  return (
    <div className="max-w-5xl mx-auto">
      <button onClick={() => router.push("/clubs")} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-5">
        <ArrowLeft size={16} /> All Clubs
      </button>

      <div className="flex gap-5 items-start">
        {/* ── Main column ── */}
        <div className="flex-1 min-w-0 space-y-5">
          {/* Club header */}
          <ClubHeader club={club} isAdmin={isAdmin} user={user} onJoin={() => joinMutation.mutate()} joinPending={joinMutation.isPending} onUpdate={() => refetchClub()} />

          {/* Pinned post */}
          {club.pinnedPost && (
            <PostCard
              post={club.pinnedPost as ClubPost}
              clubId={id}
              currentUserId={user?.id}
              isAdmin={isAdmin}
              isPinned
              onPin={() => pinMutation.mutate(club.pinnedPost!.id)}
              onUpdate={handleUpdatePost}
              onDelete={() => handleDeletePost(club.pinnedPost!.id)}
            />
          )}

          {/* Post editor */}
          {user && club.isMember && (
            <div className="bg-white/5 backdrop-blur-sm border border-white/8 rounded-2xl p-4 space-y-3">
              <div className="flex gap-3">
                <Avatar src={user.avatar} username={user.username} size="sm" />
                <div className="flex-1 min-w-0">
                  <ClubRichEditor key={editorKey} content="" onChange={handleEditorChange} placeholder="Share something with the club…" minHeight={100} />
                </div>
              </div>
              <div className="flex justify-end">
                <button onClick={() => postMutation.mutate()} disabled={!postHtml.trim() || postMutation.isPending}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-sm font-medium transition-colors">
                  <Send size={13} /> Post
                </button>
              </div>
            </div>
          )}

          {/* Sort tabs */}
          <Flex align="center" justify="between">
            <div className="flex gap-1">
              {SORT_OPTIONS.map(({ key, label, icon }) => (
                <button key={key} onClick={() => setSort(key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                    sort === key ? "bg-violet-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                  }`}>
                  {icon} {label}
                </button>
              ))}
            </div>
            <Text as="span" size="1" color="gray">{allPosts.length} post{allPosts.length !== 1 ? "s" : ""}</Text>
          </Flex>

          {/* Posts */}
          {allPosts.length === 0 && (
            <div className="text-center py-12 bg-white/5 border border-white/8 rounded-2xl">
              <Text as="p" size="2" color="gray">
                {club.isMember ? "No posts yet — start the discussion!" : "Join the club to see and post discussions."}
              </Text>
            </div>
          )}

          <div className="space-y-4">
            {allPosts.filter((p) => p.id !== club.pinnedPostId).map((p) => (
              <PostCard key={p.id} post={p} clubId={id} currentUserId={user?.id}
                isAdmin={isAdmin} isPinned={false}
                onPin={() => pinMutation.mutate(p.id)}
                onUpdate={handleUpdatePost}
                onDelete={() => handleDeletePost(p.id)}
              />
            ))}
          </div>
        </div>

        {/* ── Members sidebar ── */}
        <MembersSidebar club={club} currentUserId={user?.id} onUpdate={() => refetchClub()} onlineSet={onlineSet} />
      </div>
    </div>
  );
}
