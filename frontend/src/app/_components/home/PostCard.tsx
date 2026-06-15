"use client";

import { memo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart, MessageCircle, Trash2, MoreHorizontal, Users } from "lucide-react";
import clsx from "clsx";
import Link from "next/link";
import type { Post, ClubFeedPost, FeedItem } from "@/lib/types";
import { likePostService, unlikePostService, deletePostService } from "@/services/post.service";
import { useAuth } from "@/lib/auth-context";
import { formatDistanceToNow } from "@/lib/utils";
import { dispatchToast } from "@/lib/toast";
import { api } from "@/lib/api";
import Avatar from "@/components/Avatar";
import PostComments from "./PostComments";

interface Props {
  post: FeedItem;
}

function ImageGrid({ images }: { images: string[] }) {
  const [lightbox, setLightbox] = useState<string | null>(null);

  if (images.length === 0) return null;

  return (
    <>
      <div
        className={clsx(
          "grid gap-[3px] rounded-[10px] overflow-hidden max-h-[420px]",
          images.length === 1 ? "grid-cols-1" : "grid-cols-2"
        )}
      >
        {images.slice(0, 4).map((url, i) => (
          <div
            key={url}
            className={clsx(
              "relative overflow-hidden",
              images.length === 1 ? "aspect-video" : "aspect-square"
            )}
            style={images.length === 3 && i === 0 ? { gridRow: "span 2" } : undefined}
          >
            <img
              src={url}
              alt=""
              className="w-full h-full object-cover cursor-zoom-in transition-transform duration-200 hover:scale-[1.03]"
              onClick={() => setLightbox(url)}
              loading="lazy"
            />
            {i === 3 && images.length > 4 && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-[18px] font-bold">
                +{images.length - 4}
              </div>
            )}
          </div>
        ))}
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-[1000] bg-black/[0.92] cursor-zoom-out flex items-center justify-center"
          onClick={() => setLightbox(null)}
        >
          <img src={lightbox} alt="" className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg" />
        </div>
      )}
    </>
  );
}

// ── Social post card ──────────────────────────────────────────────────────────

const SocialPostCard = memo(function SocialPostCard({ post }: { post: Post }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showComments, setShowComments] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const likeMutation = useMutation({
    mutationFn: () => post.likedByMe ? unlikePostService(post.id) : likePostService(post.id),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ["post-feed"] });
      qc.setQueriesData<{ pages: FeedItem[][] }>({ queryKey: ["post-feed"] }, (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) =>
            page.map((p) =>
              p.id === post.id && p.type !== "club_post"
                ? {
                    ...p,
                    likedByMe: !p.likedByMe,
                    _count: { ...p._count, likes: p._count.likes + (p.likedByMe ? -1 : 1) },
                  }
                : p
            )
          ),
        };
      });
    },
    onError: () => qc.invalidateQueries({ queryKey: ["post-feed"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deletePostService(post.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["post-feed"] });
      dispatchToast("Post deleted", "success");
    },
    onError: () => dispatchToast("Failed to delete post", "error"),
  });

  const isOwn = user?.id === post.author.id;

  return (
    <article className="bg-white/[0.03] border border-gx-border rounded-xl p-4 flex flex-col gap-2.5 transition-colors hover:border-white/10">
      <div className="flex items-center gap-2.5">
        <Avatar src={post.author.avatar} username={post.author.username} size="sm" />
        <div className="flex-1 flex flex-col gap-px">
          <Link
            href={`/user/${post.author.username}`}
            className="text-[13px] font-semibold text-gx-text-1 no-underline transition-colors hover:text-gx-amber"
          >
            {post.author.username}
          </Link>
          <span className="text-[11px] text-gx-text-3">{formatDistanceToNow(post.createdAt)}</span>
        </div>

        {isOwn && (
          <div className="relative ml-auto">
            <button
              className="cursor-pointer text-gx-text-3 p-1 rounded-md flex items-center transition-colors hover:text-gx-text-1 hover:bg-white/[0.06]"
              onClick={() => setMenuOpen((v) => !v)}
            >
              <MoreHorizontal size={15} />
            </button>
            {menuOpen && (
              <div className="absolute top-[calc(100%+4px)] right-0 bg-[#1a1f2e] border border-gx-border rounded-lg overflow-hidden z-50 min-w-[120px] shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
                <button
                  className="flex items-center gap-[7px] w-full px-3 py-[9px] text-[13px] cursor-pointer text-left transition-colors text-[#f87171] hover:bg-[#f87171]/10"
                  onClick={() => { setMenuOpen(false); deleteMutation.mutate(); }}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 size={12} />
                  {deleteMutation.isPending ? "Deleting…" : "Delete"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {post.textContent && (
        <p className="text-[14px] leading-[1.6] text-gx-text-1 whitespace-pre-wrap [word-break:break-word] m-0">
          {post.textContent}
        </p>
      )}

      <ImageGrid images={post.images} />

      <div className="flex items-center gap-1 pt-1">
        <button
          className={clsx(
            "flex items-center gap-[5px] cursor-pointer px-2.5 py-1.5 rounded-lg text-[12px] font-medium transition-colors disabled:opacity-50 disabled:cursor-default",
            post.likedByMe
              ? "text-[#f43f5e] hover:bg-[#f43f5e]/10 hover:text-[#f43f5e]"
              : "text-gx-text-2 enabled:hover:bg-white/[0.06] enabled:hover:text-gx-text-1"
          )}
          onClick={() => likeMutation.mutate()}
          disabled={!user || likeMutation.isPending}
        >
          <Heart size={15} fill={post.likedByMe ? "currentColor" : "none"} />
          <span>{post._count.likes > 0 ? post._count.likes : ""}</span>
        </button>

        <button
          className={clsx(
            "flex items-center gap-[5px] cursor-pointer px-2.5 py-1.5 rounded-lg text-[12px] font-medium transition-colors disabled:opacity-50 disabled:cursor-default enabled:hover:bg-white/[0.06] enabled:hover:text-gx-text-1",
            showComments ? "text-gx-teal" : "text-gx-text-2"
          )}
          onClick={() => setShowComments((v) => !v)}
        >
          <MessageCircle size={15} />
          <span>{post._count.comments > 0 ? post._count.comments : ""}</span>
        </button>
      </div>

      {showComments && <PostComments postId={post.id} />}
    </article>
  );
});

// ── Club post card ─────────────────────────────────────────────────────────────

const ClubFeedPostCard = memo(function ClubFeedPostCard({ post }: { post: ClubFeedPost }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<{ id: string; body: string; createdAt: string; user: { id: string; username: string; avatar?: string | null } }[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const likeMutation = useMutation({
    mutationFn: () =>
      post.likedByMe
        ? api.delete(`/api/clubs/${post.clubId}/posts/${post.id}/like`).then((r) => r.data)
        : api.post(`/api/clubs/${post.clubId}/posts/${post.id}/like`).then((r) => r.data),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ["post-feed"] });
      qc.setQueriesData<{ pages: FeedItem[][] }>({ queryKey: ["post-feed"] }, (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) =>
            page.map((p) =>
              p.id === post.id && p.type === "club_post"
                ? {
                    ...p,
                    likedByMe: !p.likedByMe,
                    _count: { ...p._count, likes: p._count.likes + (p.likedByMe ? -1 : 1) },
                  }
                : p
            )
          ),
        };
      });
    },
    onError: () => qc.invalidateQueries({ queryKey: ["post-feed"] }),
  });

  async function loadComments() {
    if (commentsLoading) return;
    setCommentsLoading(true);
    try {
      const res = await api.get(`/api/clubs/${post.clubId}/posts/${post.id}/comments`);
      setComments(res.data);
    } finally {
      setCommentsLoading(false);
    }
  }

  function toggleComments() {
    if (!showComments && comments.length === 0) loadComments();
    setShowComments((v) => !v);
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await api.post(`/api/clubs/${post.clubId}/posts/${post.id}/comments`, {
        body: newComment.trim(),
      });
      setComments((prev) => [...prev, res.data]);
      setNewComment("");
      qc.setQueriesData<{ pages: FeedItem[][] }>({ queryKey: ["post-feed"] }, (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) =>
            page.map((p) =>
              p.id === post.id && p.type === "club_post"
                ? { ...p, _count: { ...p._count, comments: p._count.comments + 1 } }
                : p
            )
          ),
        };
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <article className="bg-gx-amber/[0.04] border border-gx-amber/20 rounded-xl p-4 flex flex-col gap-2.5 transition-colors hover:border-white/10">
      {/* Club badge — pill linking to the club */}
      <Link
        href={`/clubs/${post.clubId}`}
        className="inline-flex items-center gap-1.5 w-fit px-2 py-0.5 rounded-full
                   bg-gx-amber/10 border border-gx-amber/25
                   text-[11px] font-semibold text-gx-amber no-underline
                   hover:bg-gx-amber/20 transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        <Users size={10} />
        <span>{post.club.name}</span>
      </Link>

      {/* Author header */}
      <div className="flex items-center gap-2.5">
        <Avatar src={post.user.avatar} username={post.user.username} size="sm" />
        <div className="flex-1 flex flex-col gap-px">
          <Link
            href={`/user/${post.user.username}`}
            className="text-[13px] font-semibold text-gx-text-1 no-underline transition-colors hover:text-gx-amber"
          >
            {post.user.username}
          </Link>
          <span className="text-[11px] text-gx-text-3">{formatDistanceToNow(post.createdAt)}</span>
        </div>
      </div>

      {/* Rich-text body, capped at 6 lines */}
      <div
        className="text-[13px] leading-relaxed text-gx-text-1 line-clamp-6
                   [&_p]:mb-1.5 [&_p:last-child]:mb-0
                   [&_strong]:text-white [&_em]:text-gx-text-2 [&_a]:text-gx-amber"
        dangerouslySetInnerHTML={{ __html: post.body }}
      />

      {/* Action row */}
      <div className="flex items-center gap-1 pt-1">
        <button
          className={clsx(
            "flex items-center gap-[5px] cursor-pointer px-2.5 py-1.5 rounded-lg text-[12px] font-medium transition-colors disabled:opacity-50 disabled:cursor-default",
            post.likedByMe
              ? "text-[#f43f5e] hover:bg-[#f43f5e]/10 hover:text-[#f43f5e]"
              : "text-gx-text-2 enabled:hover:bg-white/[0.06] enabled:hover:text-gx-text-1"
          )}
          onClick={() => likeMutation.mutate()}
          disabled={!user || likeMutation.isPending}
        >
          <Heart size={15} fill={post.likedByMe ? "currentColor" : "none"} />
          <span>{post._count.likes > 0 ? post._count.likes : ""}</span>
        </button>

        <button
          className={clsx(
            "flex items-center gap-[5px] cursor-pointer px-2.5 py-1.5 rounded-lg text-[12px] font-medium transition-colors disabled:opacity-50 disabled:cursor-default enabled:hover:bg-white/[0.06] enabled:hover:text-gx-text-1",
            showComments ? "text-gx-teal" : "text-gx-text-2"
          )}
          onClick={toggleComments}
        >
          <MessageCircle size={15} />
          <span>{post._count.comments > 0 ? post._count.comments : ""}</span>
        </button>
      </div>

      {/* Inline comments */}
      {showComments && (
        <div className="pt-2.5 border-t border-white/[0.06] flex flex-col gap-1.5">
          {commentsLoading && (
            <p className="text-[12px] text-gx-text-3">Loading…</p>
          )}
          {!commentsLoading && comments.map((c) => (
            <div key={c.id} className="flex items-start gap-2">
              <Avatar src={c.user.avatar} username={c.user.username} size="xs" />
              <p className="text-[12px] leading-snug">
                <span className="font-semibold text-gx-text-1 mr-1">{c.user.username}</span>
                <span className="text-gx-text-2">{c.body}</span>
              </p>
            </div>
          ))}
          {user && (
            <form className="flex items-center gap-2 pt-1" onSubmit={submitComment}>
              <Avatar src={user.avatar} username={user.username} size="xs" />
              <input
                className="flex-1 bg-white/[0.05] border border-white/[0.08] rounded-full
                           px-3 py-1.5 text-[12px] text-gx-text-1 outline-none
                           focus:border-gx-amber/50 transition-colors"
                placeholder="Write a comment…"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                disabled={submitting}
              />
              <button
                type="submit"
                className="px-3 py-1 bg-gx-amber rounded-full text-[11px] font-semibold
                           text-gx-navy cursor-pointer transition-opacity
                           hover:opacity-85 disabled:opacity-40 disabled:cursor-not-allowed"
                disabled={!newComment.trim() || submitting}
              >
                {submitting ? "…" : "Send"}
              </button>
            </form>
          )}
        </div>
      )}
    </article>
  );
});

// ── Router ─────────────────────────────────────────────────────────────────────

const PostCard = memo(function PostCard({ post }: Props) {
  if (post.type === "club_post") {
    return <ClubFeedPostCard post={post} />;
  }
  return <SocialPostCard post={post as Post} />;
});

export default PostCard;
