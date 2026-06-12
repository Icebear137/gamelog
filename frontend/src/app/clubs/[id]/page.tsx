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
import DOMPurify from "dompurify";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { dispatchToast } from "@/lib/toast";
import { formatDistanceToNow } from "@/lib/utils";
import Avatar from "@/components/Avatar";
import { ClubRichEditor } from "@/components/ClubRichEditor";
import { getSocket } from "@/lib/socket-client";
import { ReportModal } from "@/components/ReportModal";

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
          className={`gx-club-reaction ${mine ? "gx-club-reaction-mine" : ""}`}>
          {emoji} <span>{count}</span>
        </button>
      ))}
      {currentUserId && (
        <div style={{ position: "relative" }}>
          <button onClick={() => setShowPicker((v) => !v)} className="gx-club-emoji-btn">
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
    <div className={`gx-club-post ${isPinned ? "gx-club-post-pinned" : ""}`}>
      {isPinned && (
        <div className="gx-club-pin-label">
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
              className="gx-btn-primary" style={{ padding: "6px 16px" }}>
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
          className={`gx-club-action-btn ${liked ? "gx-club-action-liked" : ""}`}>
          <Heart size={13} fill={liked ? "currentColor" : "none"} />
          {likeCount > 0 && <span>{likeCount}</span>}
          Like
        </button>
        <button onClick={() => setShowComments((v) => !v)}
          className="gx-club-action-btn gx-club-action-comment">
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
              <div className="gx-club-comment-bubble">
                <p className="gx-club-comment-author">{c.user.username}</p>
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
                className="gx-club-input"
                style={{ flex: 1 }}
              />
              <button onClick={() => commentMutation.mutate()} disabled={!commentBody.trim() || commentMutation.isPending}
                className="gx-comment-send">
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
    <div className="gx-club-member-row group">
      <div style={{ position: "relative", flexShrink: 0 }}>
        <Avatar src={m.user.avatar} username={m.user.username} size="sm" />
        <span className={`gx-club-online-dot ${isOnline ? "gx-club-online-yes" : "gx-club-online-no"}`} />
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
        <button onClick={() => setOpen((v) => !v)} className="gx-club-group-header">
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
    <div style={{ width: 220, flexShrink: 0 }} className="hidden lg:block">
      <div className="gx-club-sidebar-card">
        <div className="gx-club-sidebar-title">
          <Users size={12} style={{ color: "var(--gx-amber)" }} />
          Members
          <span className="gx-club-sidebar-count">{club._count.members}</span>
        </div>
        <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
          {online.length > 0  && <Group title="Online"  members={online}  count={online.length} />}
          {offline.length > 0 && <Group title="Offline" members={offline} />}
          {banned.length > 0  && <Group title="Banned"  members={banned}  count={banned.length} />}
        </div>
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
      <label className="gx-club-label">Linked game</label>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {selected?.coverImage && (
          <img src={selected.coverImage} alt={selected.name} style={{ width: 24, height: 32, objectFit: "cover", borderRadius: 4, flexShrink: 0 }} />
        )}
        <input value={q}
          onChange={(e) => { setQ(e.target.value); onSelect(null); openDrop(); }}
          onFocus={() => { if (q.length >= 2 && !selected) openDrop(); }}
          placeholder="Search and link a game…"
          className="gx-club-input" style={{ flex: 1 }}
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

// ── Club header ───────────────────────────────────────────────────────────────
function ClubHeader({ club, isAdmin, user, onJoin, joinPending, onUpdate }: {
  club: ClubDetail;
  isAdmin: boolean;
  user: { id: string; username: string; avatar?: string } | null;
  onJoin: () => void;
  joinPending: boolean;
  onUpdate: () => void;
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

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [reportingClub, setReportingClub] = useState(false);

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

  const coverImage = club.game?.coverImage;

  return (
    <div className="gx-club-header">
      <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />

      {/* Ghosted cover bg */}
      {coverImage && (
        <div className="gx-club-header-bg">
          <img src={coverImage} alt="" />
        </div>
      )}

      <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14, flex: 1, minWidth: 0 }}>
          {/* Avatar */}
          <div className="gx-club-avatar-wrap">
            {club.avatar || club.game?.coverImage ? (
              <img src={club.avatar ?? club.game!.coverImage!} alt={club.name} className="gx-club-avatar" />
            ) : (
              <div className="gx-club-avatar-placeholder">
                <Users size={22} style={{ color: "var(--gx-amber)" }} />
              </div>
            )}
            {isAdmin && (
              <button onClick={() => avatarInputRef.current?.click()} disabled={uploading} className="gx-club-avatar-overlay" title="Change avatar">
                {uploading
                  ? <span style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", animation: "spin 0.6s linear infinite", display: "block" }} />
                  : <ImageIcon size={16} style={{ color: "#fff" }} />}
              </button>
            )}
          </div>

          {/* Info / edit form */}
          {editing ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Club name" className="gx-club-input" style={{ fontWeight: 700 }} />
              <textarea value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={500} rows={2} placeholder="Description (optional)" className="gx-club-input" style={{ resize: "none" }} />
              <input value={genre} onChange={(e) => setGenre(e.target.value)} maxLength={40} placeholder="Genre / Topic (e.g. RPG, Action…)" className="gx-club-input" />
              <GamePickerInline selected={linkedGame} onSelect={setLinkedGame} />
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => saveMutation.mutate()} disabled={!name.trim() || saveMutation.isPending}
                  className="gx-btn-primary" style={{ padding: "6px 16px" }}>
                  <Check size={13} /> Save
                </button>
                <button onClick={() => setEditing(false)}
                  style={{ padding: "6px 14px", borderRadius: 8, fontSize: 13, color: "var(--gx-text-2)", background: "none", border: "none", cursor: "pointer" }}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h1 className="gx-club-name-bebas">{club.name}</h1>
                {isAdmin && (
                  <button onClick={() => setEditing(true)}
                    style={{ padding: 4, color: "var(--gx-text-3)", background: "none", border: "none", cursor: "pointer", flexShrink: 0, transition: "color 0.15s" }}
                    title="Edit club info"
                    onMouseEnter={(e) => (e.currentTarget.style.color = "var(--gx-amber)")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "var(--gx-text-3)")}>
                    <Pencil size={13} />
                  </button>
                )}
              </div>
              {club.description && (
                <p className="gx-club-desc-text" style={{ marginTop: 4, marginBottom: 0 }}>{club.description}</p>
              )}
              <div className="gx-club-meta-row" style={{ marginTop: 8 }}>
                {club.genre && <span className="gx-club-meta-item"><Tag size={10} /> {club.genre}</span>}
                <span className="gx-club-meta-item"><Users size={10} /> {club._count.members} members</span>
                {isAdmin && <span className="gx-club-meta-item gx-club-meta-admin"><Shield size={10} /> Admin</span>}
              </div>
            </div>
          )}
        </div>

        {/* Join/leave + actions */}
        {!editing && user && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
            <button onClick={onJoin} disabled={joinPending}
              className={`gx-club-join-btn ${club.isMember ? "gx-club-join-member" : "gx-club-join-idle"}`}>
              {club.isMember ? <><UserMinus size={14} /> Leave</> : <><UserPlus size={14} /> Join</>}
            </button>

            {user && !isAdmin && club.isMember && (
              <button onClick={() => setReportingClub(true)}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 8, fontSize: 12, color: "var(--gx-text-3)", border: "1px solid var(--gx-border)", background: "none", cursor: "pointer", transition: "color 0.15s, border-color 0.15s" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "var(--gx-amber)"; e.currentTarget.style.borderColor = "var(--gx-amber-glow)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "var(--gx-text-3)"; e.currentTarget.style.borderColor = "var(--gx-border)"; }}>
                <Flag size={13} /> Report
              </button>
            )}
            {reportingClub && <ReportModal type="CLUB" targetId={club.id} onClose={() => setReportingClub(false)} />}

            {isAdmin && !confirmDelete && (
              <button onClick={() => setConfirmDelete(true)}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 8, fontSize: 12, color: "var(--gx-red)", border: "1px solid rgba(239,68,68,0.2)", background: "none", cursor: "pointer", transition: "background 0.15s" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(239,68,68,0.08)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "none")}>
                <Trash2 size={14} /> Delete club
              </button>
            )}
            {isAdmin && confirmDelete && (
              <div style={{ padding: 12, background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                <p style={{ fontSize: 12, color: "var(--gx-red)", fontWeight: 600, margin: 0 }}>Delete this club?</p>
                <p style={{ fontSize: 10, color: "var(--gx-text-3)", margin: 0 }}>All posts and members will be removed.</p>
                <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
                  <button onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}
                    style={{ flex: 1, padding: "5px 0", borderRadius: 7, fontSize: 11, background: "#DC2626", color: "#fff", border: "none", cursor: "pointer", fontWeight: 600, opacity: deleteMutation.isPending ? 0.5 : 1 }}>
                    {deleteMutation.isPending ? "Deleting…" : "Delete"}
                  </button>
                  <button onClick={() => setConfirmDelete(false)}
                    style={{ flex: 1, padding: "5px 0", borderRadius: 7, fontSize: 11, background: "var(--gx-surface-2)", color: "var(--gx-text-2)", border: "none", cursor: "pointer" }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
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
      <button onClick={() => router.push("/clubs")} className="gx-btn-ghost" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <ArrowLeft size={14} /> Back to Clubs
      </button>
    </div>
  );

  const isAdmin = club.myRole === "admin";

  return (
    <div style={{ maxWidth: 1040, margin: "0 auto" }}>
      <button onClick={() => router.push("/clubs")} className="gx-back-btn" style={{ marginBottom: 20 }}>
        <ArrowLeft size={14} /> All Clubs
      </button>

      <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
        {/* Main column */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 16 }}>
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

          {/* Post composer */}
          {user && club.isMember && (
            <div className="gx-club-compose">
              <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                <Avatar src={user.avatar} username={user.username} size="sm" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <ClubRichEditor key={editorKey} content="" onChange={handleEditorChange} placeholder="Share something with the club…" minHeight={100} />
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button onClick={() => postMutation.mutate()} disabled={!postHtml.trim() || postMutation.isPending}
                  className="gx-club-compose-send">
                  <Send size={13} /> Post
                </button>
              </div>
            </div>
          )}

          {/* Sort tabs */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", gap: 6 }}>
              {SORT_OPTIONS.map(({ key, label, icon }) => (
                <button key={key} onClick={() => setSort(key)} className="gx-club-sort-pill" data-active={sort === key}>
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

        {/* Right column */}
        <div style={{ width: 220, flexShrink: 0 }} className="hidden lg:flex flex-col gap-4">
          <MembersSidebar club={club} currentUserId={user?.id} onUpdate={() => refetchClub()} onlineSet={onlineSet} />
          {isAdmin && <ClubReportsPanel clubId={id} />}
        </div>
      </div>
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
