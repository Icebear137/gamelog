"use client";

import { use, useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users, Tag, Heart, MessageCircle, Send, Trash2, ArrowLeft, X,
  UserPlus, UserMinus, TrendingUp, Clock, Smile, Pin, PinOff,
  Pencil, Check, Shield, UserX, UserCheck, MoreHorizontal,
  Crown, ChevronDown, Image as ImageIcon, Gamepad2, Flag,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import DOMPurify from "dompurify";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { dispatchToast } from "@/lib/toast";
import { formatDistanceToNow } from "@/lib/utils";
import Avatar from "@/components/Avatar";
import { ClubRichEditor } from "@/components/ClubRichEditor";
import { getSocket } from "@/lib/socket-client";
import { ReportModal } from "@/components/ReportModal";
import { gx } from "@/lib/gx-styles";

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
  return <div className="club-post-content" style={{ fontSize: 13, color: "var(--gx-text-2)", lineHeight: 1.65 }} dangerouslySetInnerHTML={{ __html: clean }} />;
}

// ── Confirm inline ────────────────────────────────────────────────────────────
function InlineConfirm({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, padding: "6px 12px" }}>
      <span style={{ color: "var(--gx-text-2)" }}>{message}</span>
      <button onClick={onConfirm} style={{ color: "var(--gx-red)", fontWeight: 600, background: "none", border: "none", cursor: "pointer" }}>Delete</button>
      <button onClick={onCancel} style={{ color: "var(--gx-text-3)", background: "none", border: "none", cursor: "pointer" }}>Cancel</button>
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
    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", position: "relative" }}>
      {Object.entries(grouped).map(([emoji, { count, mine }]) => (
        <button key={emoji} onClick={() => currentUserId && mutation.mutate(emoji)}
          className={clsx(
            "inline-flex items-center gap-1 px-2.25 py-0.75 rounded-[20px] text-[11px] border border-gx-border bg-white/3 text-gx-text-2 cursor-pointer transition-all hover:border-gx-border-md",
            mine && "bg-gx-amber/13! border-gx-amber/30! text-gx-amber!"
          )}>
          {emoji} <span>{count}</span>
        </button>
      ))}
      {currentUserId && (
        <div style={{ position: "relative" }}>
          <button onClick={() => setShowPicker((v) => !v)} className="p-1.25 rounded-lg text-gx-text-3 bg-none border-none cursor-pointer transition-[color,background] hover:text-gx-amber hover:bg-gx-amber/13">
            <Smile size={14} />
          </button>
          {showPicker && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowPicker(false)} />
              <div style={{ position: "absolute", bottom: "100%", left: 0, marginBottom: 4, zIndex: 20, background: "var(--gx-surface-2)", border: "1px solid var(--gx-border-md)", borderRadius: 12, padding: 8, display: "flex", gap: 4, boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}>
                {REACTION_EMOJIS.map((e) => (
                  <button key={e} onClick={() => mutation.mutate(e)}
                    style={{ fontSize: 17, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, background: "none", border: "none", cursor: "pointer", transition: "background 0.1s" }}
                    onMouseEnter={(el) => (el.currentTarget.style.background = "rgba(255,255,255,0.08)")}
                    onMouseLeave={(el) => (el.currentTarget.style.background = "none")}>
                    {e}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Small inline report button for comments
function ReportComment({ commentId }: { commentId: string; currentUserId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {open && <ReportModal type="CLUB_COMMENT" targetId={commentId} onClose={() => setOpen(false)} />}
      <button onClick={() => setOpen(true)}
        className="opacity-0 group-hover:opacity-100 shrink-0 self-start mt-1"
        style={{ padding: 4, color: "var(--gx-text-3)", background: "none", border: "none", cursor: "pointer", transition: "color 0.15s, opacity 0.15s" }}
        title="Report comment"
        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--gx-amber)")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--gx-text-3)")}>
        <Flag size={12} />
      </button>
    </>
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
  const [reporting, setReporting]       = useState(false);

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

  const isOwn     = currentUserId === post.user.id;
  const canEdit   = isOwn;
  const canDelete = isOwn || isAdmin;
  const canPin    = isAdmin;

  return (
    <div className={clsx(
      "bg-gx-surface border border-gx-border rounded-[14px] px-5 py-4.5 transition-colors",
      isPinned && "border-gx-amber/30 bg-linear-to-br from-gx-amber/4 to-transparent"
    )}>
      {isPinned && (
        <div className="flex items-center gap-1.25 text-[10px] text-gx-amber font-bold tracking-[0.08em] uppercase mb-3">
          <Pin size={10} /> Pinned post
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 12 }}>
        <Link href={`/user/${post.user.username}`} style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <Avatar src={post.user.avatar} username={post.user.username} size="sm" />
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: "var(--gx-text-1)", margin: 0 }}>{post.user.username}</p>
            <p style={{ fontSize: 11, color: "var(--gx-text-3)", margin: 0 }}>
              {formatDistanceToNow(post.createdAt)}
              {post.updatedAt !== post.createdAt && <span style={{ opacity: 0.6, marginLeft: 4 }}>(edited)</span>}
            </p>
          </div>
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {currentUserId && !isOwn && (
            <button onClick={() => setReporting(true)}
              style={{ padding: 6, color: "var(--gx-text-3)", background: "none", border: "none", cursor: "pointer", borderRadius: 6, transition: "color 0.15s" }}
              title="Report this post"
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--gx-amber)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--gx-text-3)")}>
              <Flag size={14} />
            </button>
          )}
          {(canEdit || canDelete || canPin) && (
            <div style={{ position: "relative" }}>
              <button onClick={() => setShowMenu((v) => !v)}
                style={{ padding: 6, color: "var(--gx-text-3)", background: "none", border: "none", cursor: "pointer", borderRadius: 6, transition: "color 0.15s, background 0.15s" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "var(--gx-text-1)"; e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "var(--gx-text-3)"; e.currentTarget.style.background = "none"; }}>
                <MoreHorizontal size={15} />
              </button>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                  <div style={{ position: "absolute", right: 0, top: "100%", marginTop: 4, zIndex: 20, background: "var(--gx-surface-2)", border: "1px solid var(--gx-border-md)", borderRadius: 10, overflow: "hidden", boxShadow: "0 8px 24px rgba(0,0,0,0.5)", minWidth: 130 }}>
                    {canEdit && (
                      <button onClick={() => { setEditKey(k => k+1); setEditHtml(post.body); setEditing(true); setShowMenu(false); }}
                        style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", fontSize: 13, color: "var(--gx-text-2)", background: "none", border: "none", cursor: "pointer", textAlign: "left", transition: "background 0.1s" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "none")}>
                        <Pencil size={13} /> Edit
                      </button>
                    )}
                    {canPin && (
                      <button onClick={() => { onPin(); setShowMenu(false); }}
                        style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", fontSize: 13, color: "var(--gx-text-2)", background: "none", border: "none", cursor: "pointer", textAlign: "left", transition: "background 0.1s" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "none")}>
                        {isPinned ? <><PinOff size={13} /> Unpin</> : <><Pin size={13} /> Pin post</>}
                      </button>
                    )}
                    {canDelete && (
                      <button onClick={() => { setConfirmDelete(true); setShowMenu(false); }}
                        style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", fontSize: 13, color: "var(--gx-red)", background: "none", border: "none", cursor: "pointer", textAlign: "left", transition: "background 0.1s" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(239,68,68,0.08)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "none")}>
                        <Trash2 size={13} /> Delete
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {reporting && <ReportModal type="CLUB_POST" targetId={post.id} onClose={() => setReporting(false)} />}

      {confirmDelete && (
        <InlineConfirm message="Delete this post?" onConfirm={() => deleteMutation.mutate()} onCancel={() => setConfirmDelete(false)} />
      )}

      {/* Edit mode */}
      {editing ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <ClubRichEditor key={editKey} content={editHtml} onChange={setEditHtml} minHeight={80} />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={() => setEditing(false)}
              style={{ padding: "6px 14px", borderRadius: 8, fontSize: 13, color: "var(--gx-text-2)", background: "none", border: "none", cursor: "pointer", transition: "color 0.15s" }}>
              Cancel
            </button>
            <button onClick={() => editMutation.mutate()} disabled={!editHtml.trim() || editMutation.isPending}
              className={gx.btnPrimary} style={{ padding: "6px 16px" }}>
              <Check size={13} /> Save
            </button>
          </div>
        </div>
      ) : (
        <PostBody html={post.body} />
      )}

      {/* Reactions */}
      <ReactionBar post={{ ...post, reactions }} clubId={clubId} currentUserId={currentUserId} onUpdate={setReactions} />

      {/* Actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, paddingTop: 10, borderTop: "1px solid var(--gx-border)", marginTop: 4 }}>
        <button onClick={() => currentUserId && likeMutation.mutate()}
          className={clsx(
            "inline-flex items-center gap-1.5 text-[12px] text-gx-text-3 bg-none border-none cursor-pointer transition-colors px-2 py-1.25 rounded-md hover:text-gx-text-2 hover:bg-white/4",
            liked && "text-gx-red!"
          )}>
          <Heart size={13} fill={liked ? "currentColor" : "none"} />
          {likeCount > 0 && <span>{likeCount}</span>}
          Like
        </button>
        <button onClick={() => setShowComments((v) => !v)}
          className="inline-flex items-center gap-1.5 text-[12px] text-gx-text-3 bg-none border-none cursor-pointer transition-colors px-2 py-1.25 rounded-md hover:text-gx-amber hover:bg-gx-amber/13">
          <MessageCircle size={13} />
          {post._count.comments > 0 ? post._count.comments : ""} Comment
        </button>
      </div>

      {/* Comments */}
      {showComments && (
        <div style={{ paddingTop: 10, borderTop: "1px solid var(--gx-border)", marginTop: 4, display: "flex", flexDirection: "column", gap: 8 }}>
          {(comments as any[]).map((c: any) => (
            <div key={c.id} className="group" style={{ display: "flex", gap: 10 }}>
              <Avatar src={c.user.avatar} username={c.user.username} size="sm" />
              <div className="flex-1 bg-gx-surface-2 rounded-[10px] px-3 py-2">
                <p className="text-[11px] font-bold text-gx-amber mb-0.5">{c.user.username}</p>
                <p style={{ fontSize: 12, color: "var(--gx-text-2)", margin: 0, lineHeight: 1.5 }}>{c.body}</p>
              </div>
              {currentUserId && c.user.id !== currentUserId && (
                <ReportComment commentId={c.id} currentUserId={currentUserId} />
              )}
            </div>
          ))}
          {currentUserId && (
            <div style={{ display: "flex", gap: 8 }}>
              <input value={commentBody} onChange={(e) => setCommentBody(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && commentBody.trim()) { e.preventDefault(); commentMutation.mutate(); } }}
                placeholder="Write a comment…"
                className="w-full bg-gx-surface-2 border border-gx-border rounded-[10px] px-3 py-2.25 text-[13px] text-gx-text-1 outline-none transition-colors focus:border-gx-amber/30 placeholder:text-gx-text-3"
                style={{ flex: 1 }}
              />
              <button onClick={() => commentMutation.mutate()} disabled={!commentBody.trim() || commentMutation.isPending}
                className="inline-flex items-center gap-1.75 px-5 py-2 bg-gx-amber border-none rounded-[9px] text-gx-ink text-[13px] font-bold cursor-pointer transition-colors hover:bg-[#f5a33a] disabled:opacity-40 disabled:cursor-not-allowed">
                <Send size={13} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── MemberRow ─────────────────────────────────────────────────────────────────
interface MemberRowProps {
  m: ClubMember; isOnline: boolean; isAdmin: boolean; isCreator: boolean;
  currentUserId?: string; creatorId: string;
  onKick: (userId: string) => void;
  onBan: (userId: string, banned: boolean) => void;
  onRole: (userId: string, role: string) => void;
}

function MemberRow({ m, isOnline, isAdmin, isCreator, currentUserId, creatorId, onKick, onBan, onRole }: MemberRowProps) {
  const isMe          = m.user.id === currentUserId;
  const isClubCreator = m.user.id === creatorId;
  const canManage     = isCreator && !isMe && !isClubCreator;
  const canAdminManage = isAdmin && !isMe && !isClubCreator && !isCreator;

  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);

  function toggleMenu(e: React.MouseEvent<HTMLButtonElement>) {
    if (menuPos) { setMenuPos(null); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
  }

  return (
    <div className="flex items-center gap-2 py-1.25 relative group">
      <div style={{ position: "relative", flexShrink: 0 }}>
        <Avatar src={m.user.avatar} username={m.user.username} size="sm" />
        <span className={clsx(
          "absolute bottom-0.75 right-0.75 w-2.25 h-2.25 rounded-full border-[1.5px] border-gx-surface",
          isOnline ? "bg-gx-green" : "bg-gx-text-3"
        )} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--gx-text-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {m.user.username}
          </span>
          {isClubCreator && <Crown size={10} style={{ color: "#F59E0B", flexShrink: 0 }} />}
          {m.role === "admin" && !isClubCreator && <Shield size={10} style={{ color: "var(--gx-amber)", flexShrink: 0 }} />}
        </div>
        <p style={{ fontSize: 10, color: "var(--gx-text-3)", margin: 0 }}>{m.user._count.gameEntries} games</p>
      </div>

      {(canManage || canAdminManage) && !m.isBanned && (
        <>
          <button onClick={toggleMenu}
            className="opacity-0 group-hover:opacity-100"
            style={{ padding: 4, color: "var(--gx-text-3)", background: "none", border: "none", cursor: "pointer", borderRadius: 6, flexShrink: 0, transition: "color 0.12s, opacity 0.12s" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--gx-text-1)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--gx-text-3)")}>
            <MoreHorizontal size={13} />
          </button>
          {menuPos && typeof window !== "undefined" && createPortal(
            <>
              <div className="fixed inset-0 z-200" onClick={() => setMenuPos(null)} />
              <div style={{ position: "fixed", top: menuPos.top, right: menuPos.right, zIndex: 201, background: "var(--gx-surface-2)", border: "1px solid var(--gx-border-md)", borderRadius: 10, overflow: "hidden", boxShadow: "0 8px 24px rgba(0,0,0,0.5)", minWidth: 144 }}>
                {canManage && (
                  <button onClick={() => { onRole(m.user.id, m.role === "admin" ? "member" : "admin"); setMenuPos(null); }}
                    style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", fontSize: 13, color: "var(--gx-text-2)", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "none")}>
                    {m.role === "admin" ? <><UserCheck size={12} /> Remove admin</> : <><Shield size={12} /> Make admin</>}
                  </button>
                )}
                <button onClick={() => { onKick(m.user.id); setMenuPos(null); }}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", fontSize: 13, color: "#FB923C", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(251,146,60,0.08)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "none")}>
                  <UserX size={12} /> Kick
                </button>
                <button onClick={() => { onBan(m.user.id, false); setMenuPos(null); }}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", fontSize: 13, color: "var(--gx-red)", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(239,68,68,0.08)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "none")}>
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
          style={{ fontSize: 10, color: "var(--gx-text-3)", cursor: "pointer", padding: "2px 6px", borderRadius: 5, border: "1px solid var(--gx-border)", background: "none", transition: "color 0.12s, border-color 0.12s" }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "var(--gx-green)"; e.currentTarget.style.borderColor = "rgba(74,222,128,0.3)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "var(--gx-text-3)"; e.currentTarget.style.borderColor = "var(--gx-border)"; }}>
          Unban
        </button>
      )}
    </div>
  );
}

// ── Members sidebar ───────────────────────────────────────────────────────────
function MembersSidebar({ club, currentUserId, onUpdate, onlineSet }: {
  club: ClubDetail; currentUserId?: string; onlineSet: Set<string>; onUpdate: () => void;
}) {
  const isAdmin   = club.myRole === "admin";
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
      <div style={{ marginBottom: 8 }}>
        <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between text-[10px] font-semibold tracking-widest uppercase text-gx-text-3 py-1 bg-none border-none cursor-pointer transition-colors hover:text-gx-text-2">
          <span>{title}{count != null ? ` — ${count}` : ""}</span>
          <ChevronDown size={11} style={{ transition: "transform 0.15s", transform: open ? "none" : "rotate(-90deg)" }} />
        </button>
        {open && members.map((m) => (
          <MemberRow key={m.user.id} m={m} isOnline={isOnline(m)} {...rowProps} />
        ))}
      </div>
    );
  }

  return (
    <div className="bg-gx-surface border border-gx-border rounded-[14px] p-3.5">
      <div className="text-[10px] font-bold tracking-[0.12em] uppercase text-gx-text-3 mb-3 flex items-center gap-1.5">
        <Users size={12} style={{ color: "var(--gx-amber)" }} />
        Members
        <span className="ml-auto">{club._count.members}</span>
      </div>
      <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
        {online.length > 0  && <Group title="Online"  members={online}  count={online.length} />}
        {offline.length > 0 && <Group title="Offline" members={offline} />}
        {banned.length > 0  && <Group title="Banned"  members={banned}  count={banned.length} />}
      </div>
    </div>
  );
}

// ── Inline game picker for club edit form ────────────────────────────────────
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
      <label className="text-[10px] font-bold tracking-widest uppercase text-gx-text-3 mb-1.25 block">Linked game</label>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {selected?.coverImage && (
          <img src={selected.coverImage} alt={selected.name} style={{ width: 24, height: 32, objectFit: "cover", borderRadius: 4, flexShrink: 0 }} />
        )}
        <input value={q}
          onChange={(e) => { setQ(e.target.value); onSelect(null); openDrop(); }}
          onFocus={() => { if (q.length >= 2 && !selected) openDrop(); }}
          placeholder="Search and link a game…"
          className="w-full bg-gx-surface-2 border border-gx-border rounded-[10px] px-3 py-2.25 text-[13px] text-gx-text-1 outline-none transition-colors focus:border-gx-amber/30 placeholder:text-gx-text-3" style={{ flex: 1 }}
        />
        {selected && (
          <button onClick={() => { onSelect(null); setQ(""); setOpen(false); }}
            style={{ padding: 4, color: "var(--gx-text-3)", background: "none", border: "none", cursor: "pointer", flexShrink: 0 }}>
            <X size={13} />
          </button>
        )}
      </div>
      {open && !selected && q.length >= 2 && dropRect && typeof window !== "undefined" && createPortal(
        <>
          <div className="fixed inset-0 z-200" onClick={() => setOpen(false)} />
          <div style={{ position: "fixed", top: dropRect.top, left: dropRect.left, width: dropRect.width, zIndex: 201, background: "var(--gx-surface-2)", border: "1px solid var(--gx-border-md)", borderRadius: 10, overflow: "hidden", boxShadow: "0 12px 32px rgba(0,0,0,0.5)", maxHeight: 176, overflowY: "auto" }}>
            {isFetching && <p style={{ padding: "8px 12px", fontSize: 12, color: "var(--gx-text-3)" }}>Searching…</p>}
            {!isFetching && results.length === 0 && <p style={{ padding: "8px 12px", fontSize: 12, color: "var(--gx-text-3)" }}>No games found</p>}
            {results.map((g) => (
              <button key={g.rawgId} onClick={() => { onSelect(g); setQ(g.name); setOpen(false); }}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
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

// ── Club info panel (left sidebar) ────────────────────────────────────────────
function ClubInfoPanel({ club, isAdmin, user, onJoin, joinPending, onUpdate, onBack }: {
  club: ClubDetail;
  isAdmin: boolean;
  user: { id: string; username: string; avatar?: string } | null;
  onJoin: () => void;
  joinPending: boolean;
  onUpdate: () => void;
  onBack: () => void;
}) {
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing]       = useState(false);
  const [name, setName]             = useState(club.name);
  const [desc, setDesc]             = useState(club.description ?? "");
  const [genre, setGenre]           = useState(club.genre ?? "");
  const [linkedGame, setLinkedGame] = useState<GameOption | null>(
    club.game ? { id: "", rawgId: club.game.rawgId, name: club.game.name, coverImage: club.game.coverImage } : null
  );
  const [uploading, setUploading]   = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [reportingClub, setReportingClub] = useState(false);

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
    onSuccess: () => { dispatchToast("Club deleted", "success"); window.location.href = "/clubs"; },
    onError: (err: any) => dispatchToast(err?.response?.data?.error ?? "Failed to delete", "error"),
  });

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

  const coverImage = club.game?.coverImage ?? club.avatar ?? null;

  return (
    <aside className="flex flex-col gap-3 sticky top-18">
      <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />

      {/* Back button */}
      <button onClick={onBack} className={gx.backBtn}>
        <ArrowLeft size={14} /> All Clubs
      </button>

      {/* Club identity card */}
      <div className="bg-gx-surface border border-gx-border rounded-[14px]">
        {/* Banner */}
        <div className="relative h-22 bg-gx-surface-2 overflow-hidden rounded-t-[13px]">
          {coverImage ? (
            <>
              <img src={coverImage} alt="" className="absolute inset-0 w-full h-full object-cover scale-110 opacity-[0.35] blur-sm" />
              <div className="absolute inset-0 bg-linear-to-b from-transparent to-gx-surface/85" />
            </>
          ) : (
            <div className="absolute inset-0 bg-linear-to-br from-gx-amber/8 to-transparent" />
          )}
        </div>

        {/* Avatar — outside banner so overflow-hidden doesn't clip it */}
        <div className="px-4 -mt-5.5 mb-1">
          <div className="relative w-11 h-11">
            {club.avatar || club.game?.coverImage ? (
              <img
                src={club.avatar ?? club.game!.coverImage!}
                alt={club.name}
                className="w-11 h-11 rounded-xl object-cover border-2 border-gx-surface block"
              />
            ) : (
              <div className="w-11 h-11 rounded-xl bg-gx-amber/13 border-2 border-gx-surface flex items-center justify-center">
                <Users size={18} style={{ color: "var(--gx-amber)" }} />
              </div>
            )}
            {isAdmin && (
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploading}
                className="absolute inset-0 rounded-xl bg-[rgba(0,0,0,0.55)] opacity-0 flex items-center justify-center transition-opacity hover:opacity-100"
                title="Change avatar"
              >
                {uploading
                  ? <span style={{ width: 12, height: 12, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", animation: "spin 0.6s linear infinite", display: "block" }} />
                  : <ImageIcon size={12} style={{ color: "#fff" }} />}
              </button>
            )}
          </div>
        </div>

        {/* Card body */}
        <div className="px-4 pb-4 flex flex-col gap-3">
          {editing ? (
            <div className="flex flex-col gap-2.5">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
                placeholder="Club name"
                className="w-full bg-gx-surface-2 border border-gx-border rounded-[10px] px-3 py-2.25 text-[13px] text-gx-text-1 outline-none transition-colors focus:border-gx-amber/30 placeholder:text-gx-text-3"
                style={{ fontWeight: 700 }}
              />
              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="Description (optional)"
                className="w-full bg-gx-surface-2 border border-gx-border rounded-[10px] px-3 py-2.25 text-[13px] text-gx-text-1 outline-none transition-colors focus:border-gx-amber/30 placeholder:text-gx-text-3"
                style={{ resize: "none" }}
              />
              <input
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                maxLength={40}
                placeholder="Genre / Topic (e.g. RPG, Action…)"
                className="w-full bg-gx-surface-2 border border-gx-border rounded-[10px] px-3 py-2.25 text-[13px] text-gx-text-1 outline-none transition-colors focus:border-gx-amber/30 placeholder:text-gx-text-3"
              />
              <GamePickerInline selected={linkedGame} onSelect={setLinkedGame} />
              <div className="flex gap-2">
                <button
                  onClick={() => saveMutation.mutate()}
                  disabled={!name.trim() || saveMutation.isPending}
                  className={gx.btnPrimary}
                  style={{ padding: "6px 16px", flex: 1, justifyContent: "center" }}
                >
                  <Check size={13} /> Save
                </button>
                <button
                  onClick={() => setEditing(false)}
                  style={{ padding: "6px 14px", borderRadius: 8, fontSize: 13, color: "var(--gx-text-2)", background: "none", border: "none", cursor: "pointer" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-2">
                <h1 className="font-bebas text-[22px] tracking-[0.04em] text-gx-text-1 leading-[1.15] m-0">{club.name}</h1>
                {isAdmin && (
                  <button
                    onClick={() => setEditing(true)}
                    style={{ padding: 4, color: "var(--gx-text-3)", background: "none", border: "none", cursor: "pointer", flexShrink: 0, transition: "color 0.15s", marginTop: 2 }}
                    title="Edit club info"
                    onMouseEnter={(e) => (e.currentTarget.style.color = "var(--gx-amber)")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "var(--gx-text-3)")}
                  >
                    <Pencil size={12} />
                  </button>
                )}
              </div>

              {club.description && (
                <p className="text-[12px] text-gx-text-2 leading-[1.6] m-0">{club.description}</p>
              )}

              <div className="flex flex-col gap-1.5">
                {club.genre && (
                  <span className="flex items-center gap-1.5 text-[11px] text-gx-text-3">
                    <Tag size={10} /> {club.genre}
                  </span>
                )}
                <span className="flex items-center gap-1.5 text-[11px] text-gx-text-3">
                  <Users size={10} /> {club._count.members} members
                </span>
                <span className="flex items-center gap-1.5 text-[11px] text-gx-text-3">
                  <MessageCircle size={10} /> {club._count.posts} posts
                </span>
                {isAdmin && (
                  <span className="flex items-center gap-1.5 text-[11px] text-gx-amber">
                    <Shield size={10} /> Admin
                  </span>
                )}
              </div>
            </>
          )}

          {/* Join / Leave */}
          {!editing && user && (
            <button
              onClick={onJoin}
              disabled={joinPending}
              className={clsx(
                "w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[13px] font-bold cursor-pointer transition-all border",
                club.isMember
                  ? "bg-gx-surface-2 text-gx-text-2 border-gx-border-md hover:border-gx-red/30 hover:text-gx-red"
                  : "bg-gx-amber/13 text-gx-amber border-gx-amber/30 hover:bg-gx-amber/25"
              )}
            >
              {club.isMember ? <><UserMinus size={14} /> Leave Club</> : <><UserPlus size={14} /> Join Club</>}
            </button>
          )}

          {/* Report */}
          {!editing && user && !isAdmin && club.isMember && (
            <button
              onClick={() => setReportingClub(true)}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] text-gx-text-3 border border-gx-border bg-transparent cursor-pointer transition-all hover:text-gx-amber hover:border-gx-amber/30"
            >
              <Flag size={12} /> Report Club
            </button>
          )}
          {reportingClub && <ReportModal type="CLUB" targetId={club.id} onClose={() => setReportingClub(false)} />}

          {/* Delete */}
          {!editing && isAdmin && !confirmDelete && (
            <button
              onClick={() => setConfirmDelete(true)}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] text-gx-red border border-gx-red/20 bg-transparent cursor-pointer transition-all hover:bg-gx-red/8"
            >
              <Trash2 size={12} /> Delete Club
            </button>
          )}
          {!editing && isAdmin && confirmDelete && (
            <div style={{ padding: 12, background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 10, display: "flex", flexDirection: "column", gap: 6 }}>
              <p style={{ fontSize: 12, color: "var(--gx-red)", fontWeight: 600, margin: 0 }}>Delete this club?</p>
              <p style={{ fontSize: 10, color: "var(--gx-text-3)", margin: 0 }}>All posts and members will be removed.</p>
              <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
                <button
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                  style={{ flex: 1, padding: "5px 0", borderRadius: 7, fontSize: 11, background: "#DC2626", color: "#fff", border: "none", cursor: "pointer", fontWeight: 600, opacity: deleteMutation.isPending ? 0.5 : 1 }}
                >
                  {deleteMutation.isPending ? "Deleting…" : "Delete"}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  style={{ flex: 1, padding: "5px 0", borderRadius: 7, fontSize: 11, background: "var(--gx-surface-2)", color: "var(--gx-text-2)", border: "none", cursor: "pointer" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Linked game card */}
      {club.game && !editing && (
        <div className={gx.sectionCard}>
          <p className={gx.sectionCardTitle}>Linked Game</p>
          <Link
            href={`/game/${club.game.rawgId}`}
            className="flex items-center gap-2.5 no-underline group"
          >
            {club.game.coverImage && (
              <img
                src={club.game.coverImage}
                alt={club.game.name}
                className="w-7.5 h-10 rounded-[5px] object-cover shrink-0"
              />
            )}
            <span className="text-[12px] font-semibold text-gx-text-2 transition-colors group-hover:text-gx-amber leading-[1.4]">
              {club.game.name}
            </span>
          </Link>
        </div>
      )}

      {/* Creator card */}
      <div className={gx.sectionCard}>
        <p className={gx.sectionCardTitle}>Created By</p>
        <Link
          href={`/user/${club.creator.username}`}
          className="flex items-center gap-2 no-underline group"
        >
          <Avatar src={club.creator.avatar} username={club.creator.username} size="sm" />
          <span className="text-[13px] font-semibold text-gx-text-2 transition-colors group-hover:text-gx-amber">
            {club.creator.username}
          </span>
        </Link>
      </div>
    </aside>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ClubDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const router = useRouter();

  const [sort, setSort]         = useState<Sort>("newest");
  const [postHtml, setPostHtml] = useState("");
  const [editorKey, setEditorKey] = useState(0);
  const [posts, setPosts]       = useState<ClubPost[]>([]);

  const handleEditorChange = useCallback((html: string) => setPostHtml(html), []);

  const [onlineSet, setOnlineSet] = useState<Set<string>>(new Set());

  const { data: club, isLoading, refetch: refetchClub } = useQuery<ClubDetail>({
    queryKey: ["club", id],
    queryFn: () => api.get(`/api/clubs/${id}`).then((r) => r.data),
    staleTime: 30_000,
  });

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

    function queryAll() { memberIds.forEach((uid) => socket!.emit("get_presence", { userId: uid })); }

    socket.on("presence_update", handlePresence);
    socket.on("connect", queryAll);
    if (socket.connected && memberIds.length > 0) queryAll();

    return () => {
      socket.off("presence_update", handlePresence);
      socket.off("connect", queryAll);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [club?.members]);

  const { data: fetchedPosts = [] } = useQuery<ClubPost[]>({
    queryKey: ["club-posts", id, sort],
    queryFn: () => api.get(`/api/clubs/${id}/posts?sort=${sort}`).then((r) => r.data),
    staleTime: 30_000,
    enabled: !!club,
  });

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
      setEditorKey((k) => k + 1);
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

  if (isLoading) return <div style={{ padding: "64px 0", textAlign: "center", fontSize: 13, color: "var(--gx-text-3)" }}>Loading…</div>;
  if (!club) return <div style={{ padding: "64px 0", textAlign: "center", fontSize: 13, color: "var(--gx-text-3)" }}>Club not found</div>;

  if (club.isBanned) return (
    <div style={{ maxWidth: 420, margin: "80px auto", textAlign: "center", display: "flex", flexDirection: "column", gap: 16, alignItems: "center" }}>
      <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Shield size={28} style={{ color: "var(--gx-red)" }} />
      </div>
      <div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--gx-red)", marginBottom: 8 }}>You&apos;ve been banned</h2>
        <p style={{ fontSize: 13, color: "var(--gx-text-2)", lineHeight: 1.6 }}>
          You have been banned from <strong style={{ color: "var(--gx-text-1)" }}>{club.name}</strong> and cannot access its content.
        </p>
        <p style={{ fontSize: 12, color: "var(--gx-text-3)", marginTop: 4 }}>
          If you believe this is a mistake, contact a club admin.
        </p>
      </div>
      <button onClick={() => router.push("/clubs")} className={gx.btnGhost} style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <ArrowLeft size={14} /> Back to Clubs
      </button>
    </div>
  );

  const isAdmin = club.myRole === "admin";

  return (
    <div className="grid grid-cols-[260px_1fr_220px] gap-5 items-start px-4 py-6">
      {/* Left: club info panel */}
      <ClubInfoPanel
        club={club}
        isAdmin={isAdmin}
        user={user}
        onJoin={() => joinMutation.mutate()}
        joinPending={joinMutation.isPending}
        onUpdate={() => refetchClub()}
        onBack={() => router.push("/clubs")}
      />

      {/* Center: posts feed */}
      <div className="flex flex-col gap-4 min-w-0">
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

        {/* Post composer */}
        {user && club.isMember && (
          <div className="bg-gx-surface border border-gx-border rounded-[14px] p-4">
            <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
              <Avatar src={user.avatar} username={user.username} size="sm" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <ClubRichEditor key={editorKey} content="" onChange={handleEditorChange} placeholder="Share something with the club…" minHeight={100} />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => postMutation.mutate()} disabled={!postHtml.trim() || postMutation.isPending}
                className="inline-flex items-center gap-1.75 px-5 py-2 bg-gx-amber border-none rounded-[9px] text-gx-ink text-[13px] font-bold cursor-pointer transition-colors hover:bg-[#f5a33a] disabled:opacity-40 disabled:cursor-not-allowed">
                <Send size={13} /> Post
              </button>
            </div>
          </div>
        )}

        {/* Sort tabs */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 6 }}>
            {SORT_OPTIONS.map(({ key, label, icon }) => (
              <button key={key} onClick={() => setSort(key)} className="inline-flex items-center gap-1.5 px-3.5 py-1.75 rounded-[10px] text-[12px] font-semibold bg-gx-surface border border-gx-border text-gx-text-2 cursor-pointer transition-all data-[active=true]:bg-gx-amber data-[active=true]:border-gx-amber data-[active=true]:text-gx-ink" data-active={sort === key}>
                {icon} {label}
              </button>
            ))}
          </div>
          <span style={{ fontSize: 12, color: "var(--gx-text-3)" }}>
            {allPosts.length} post{allPosts.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Posts */}
        {allPosts.length === 0 && (
          <div style={{ textAlign: "center", padding: "48px 24px", background: "var(--gx-surface)", border: "1px solid var(--gx-border)", borderRadius: 14 }}>
            <p style={{ fontSize: 13, color: "var(--gx-text-3)" }}>
              {club.isMember ? "No posts yet — start the discussion!" : "Join the club to see and post discussions."}
            </p>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
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

      {/* Right: members + reports */}
      <aside className="flex flex-col gap-3 sticky top-18">
        <MembersSidebar club={club} currentUserId={user?.id} onUpdate={() => refetchClub()} onlineSet={onlineSet} />
        {isAdmin && <ClubReportsPanel clubId={id} />}
      </aside>
    </div>
  );
}

// ── Club admin reports panel ──────────────────────────────────────────────────
function ClubReportsPanel({ clubId }: { clubId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  interface ClubReport {
    id: string; type: string; reason: string; status: string; createdAt: string;
    reporter: { id: string; username: string; avatar?: string };
    preview: { text?: string; author?: { id: string; username: string; avatar?: string } } | null;
  }

  const { data: reports = [] } = useQuery<ClubReport[]>({
    queryKey: ["club-reports", clubId],
    queryFn: () => api.get(`/api/reports/club/${clubId}?status=PENDING`).then((r) => r.data),
    enabled: open,
    staleTime: 30_000,
  });

  const resolveMutation = useMutation({
    mutationFn: ({ id, deleteContent }: { id: string; deleteContent?: boolean }) =>
      api.patch(`/api/reports/${id}`, { status: deleteContent ? "REVIEWED" : "DISMISSED", deleteContent }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["club-reports", clubId] });
      qc.invalidateQueries({ queryKey: ["club-posts", clubId] });
      dispatchToast("Report resolved", "success");
    },
    onError: (err: any) => dispatchToast(err?.response?.data?.error ?? "Failed", "error"),
  });

  return (
    <div style={{ background: "var(--gx-surface)", border: "1px solid var(--gx-border)", borderRadius: 14, padding: 14 }}>
      <button onClick={() => setOpen((v) => !v)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", background: "none", border: "none", cursor: "pointer" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Flag size={13} style={{ color: "#FB923C" }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--gx-text-2)" }}>Reports</span>
        </div>
        <ChevronDown size={11} style={{ color: "var(--gx-text-3)", transition: "transform 0.15s", transform: open ? "rotate(180deg)" : "none" }} />
      </button>

      {open && (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          {reports.length === 0 && (
            <p style={{ fontSize: 11, color: "var(--gx-text-3)", textAlign: "center", padding: "8px 0" }}>No pending reports</p>
          )}
          {reports.map((r) => (
            <div key={r.id} style={{ background: "rgba(0,0,0,0.2)", borderRadius: 10, padding: 10, display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Avatar src={r.reporter.avatar} username={r.reporter.username} size="sm" />
                <span style={{ fontSize: 11, color: "var(--gx-text-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.reporter.username}</span>
              </div>
              <p style={{ fontSize: 10, color: "var(--gx-text-3)", margin: 0 }}>{r.reason} · {r.type.replace("CLUB_", "")}</p>
              {r.preview?.text && (
                <p style={{ fontSize: 10, color: "var(--gx-text-3)", fontStyle: "italic", margin: 0, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  &ldquo;{r.preview.text}&rdquo;
                </p>
              )}
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => resolveMutation.mutate({ id: r.id })}
                  style={{ flex: 1, padding: "4px 0", borderRadius: 6, fontSize: 10, background: "var(--gx-surface-2)", color: "var(--gx-text-2)", border: "none", cursor: "pointer", transition: "color 0.12s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--gx-text-1)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--gx-text-2)")}>
                  Dismiss
                </button>
                {r.preview?.text !== undefined && (
                  <button onClick={() => resolveMutation.mutate({ id: r.id, deleteContent: true })}
                    style={{ flex: 1, padding: "4px 0", borderRadius: 6, fontSize: 10, background: "rgba(239,68,68,0.12)", color: "var(--gx-red)", border: "none", cursor: "pointer", transition: "background 0.12s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(239,68,68,0.2)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(239,68,68,0.12)")}>
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
