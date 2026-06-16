"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Heart, MessageCircle, Send, Trash2, Pin, PinOff,
  Pencil, Check, MoreHorizontal, Flag,
} from "lucide-react";
import Link from "next/link";
import clsx from "clsx";
import { api } from "@/lib/api";
import { dispatchToast } from "@/lib/toast";
import { formatDistanceToNow } from "@/lib/utils";
import Avatar from "@/components/Avatar";
import { ClubRichEditor } from "@/components/ClubRichEditor";
import { ReportModal } from "@/components/ReportModal";
import { gx } from "@/lib/gx-styles";
import { PostBody } from "./PostBody";
import { InlineConfirm } from "./InlineConfirm";
import { ReactionBar } from "./ReactionBar";
import type { ClubPost, Reaction } from "../_types";

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

export function PostCard({ post, clubId, currentUserId, isAdmin, isPinned, onPin, onUpdate, onDelete }: {
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

      {editing ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <ClubRichEditor key={editKey} content={editHtml} onChange={setEditHtml} minHeight={80} />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={() => setEditing(false)}
              style={{ padding: "6px 14px", borderRadius: 8, fontSize: 13, color: "var(--gx-text-2)", background: "none", border: "none", cursor: "pointer" }}>
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

      <ReactionBar post={{ ...post, reactions }} clubId={clubId} currentUserId={currentUserId} onUpdate={setReactions} />

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
