"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, CornerDownRight } from "lucide-react";
import clsx from "clsx";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { getPostCommentsService, addPostCommentService } from "@/services/post.service";
import { formatDistanceToNow } from "@/lib/utils";
import { dispatchToast } from "@/lib/toast";
import Avatar from "@/components/Avatar";
import type { PostComment } from "@/lib/types";

interface Props {
  postId: string;
}

function CommentRow({
  comment,
  postId,
  depth = 0,
}: {
  comment: PostComment;
  postId: string;
  depth?: number;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState("");

  const replyMutation = useMutation({
    mutationFn: () => addPostCommentService(postId, replyText.trim(), comment.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["post-comments", postId] });
      setReplyText("");
      setReplyOpen(false);
    },
    onError: () => dispatchToast("Failed to reply", "error"),
  });

  return (
    <div
      className={clsx(
        "flex items-start gap-2",
        depth > 0 && "ml-7 pl-2.5 border-l-2 border-white/[0.07]"
      )}
    >
      <Avatar src={comment.user.avatar} username={comment.user.username} size="xs" />
      <div className="flex-1 flex flex-col gap-0.5">
        <div className="flex items-center gap-1.5">
          <Link
            href={`/user/${comment.user.username}`}
            className="text-[12px] font-semibold text-gx-text-1 no-underline transition-colors hover:text-gx-amber"
          >
            {comment.user.username}
          </Link>
          <span className="text-[10px] text-gx-text-3">{formatDistanceToNow(comment.createdAt)}</span>
        </div>
        <p className="text-[13px] text-gx-text-2 leading-normal m-0">{comment.body}</p>

        {user && depth === 0 && (
          <button
            className="flex items-center gap-[3px] cursor-pointer text-gx-text-3 text-[11px] py-0.5 transition-colors hover:text-gx-amber"
            onClick={() => setReplyOpen((v) => !v)}
          >
            <CornerDownRight size={11} />
            Reply
          </button>
        )}

        {replyOpen && (
          <div className="flex items-center gap-1.5 mt-1">
            <input
              className="flex-1 bg-white/[0.04] border border-gx-border rounded-[20px] px-3.5 py-[7px] text-gx-text-1 text-[13px] outline-none [font-family:inherit] transition-colors placeholder:text-gx-text-3 focus:border-gx-amber/40"
              placeholder={`Reply to ${comment.user.username}…`}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && replyText.trim()) {
                  e.preventDefault();
                  replyMutation.mutate();
                }
              }}
            />
            <button
              className="bg-gx-amber cursor-pointer w-[30px] h-[30px] rounded-full flex items-center justify-center text-gx-navy transition-opacity shrink-0 disabled:opacity-40 disabled:cursor-not-allowed enabled:hover:opacity-85"
              onClick={() => replyMutation.mutate()}
              disabled={!replyText.trim() || replyMutation.isPending}
            >
              <Send size={12} />
            </button>
          </div>
        )}

        {/* Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="flex flex-col gap-1.5 mt-1.5">
            {comment.replies.map((r) => (
              <CommentRow key={r.id} comment={r} postId={postId} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function PostComments({ postId }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [newComment, setNewComment] = useState("");

  const { data: comments = [], isLoading } = useQuery<PostComment[]>({
    queryKey: ["post-comments", postId],
    queryFn: () => getPostCommentsService(postId),
    staleTime: 60_000,
  });

  const addMutation = useMutation({
    mutationFn: () => addPostCommentService(postId, newComment.trim()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["post-comments", postId] });
      qc.setQueriesData<{ pages: any[][] }>({ queryKey: ["post-feed"] }, (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) =>
            page.map((p: any) =>
              p.id === postId
                ? { ...p, _count: { ...p._count, comments: p._count.comments + 1 } }
                : p
            )
          ),
        };
      });
      setNewComment("");
    },
    onError: () => dispatchToast("Failed to comment", "error"),
  });

  return (
    <div className="pt-2.5 border-t border-gx-border flex flex-col gap-2">
      {/* Compose */}
      {user && (
        <div className="flex items-center gap-2">
          <Avatar src={user.avatar} username={user.username} size="xs" />
          <input
            className="flex-1 bg-white/[0.04] border border-gx-border rounded-[20px] px-3.5 py-[7px] text-gx-text-1 text-[13px] outline-none [font-family:inherit] transition-colors placeholder:text-gx-text-3 focus:border-gx-amber/40"
            placeholder="Write a comment…"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && newComment.trim()) {
                e.preventDefault();
                addMutation.mutate();
              }
            }}
          />
          <button
            className="bg-gx-amber cursor-pointer w-[30px] h-[30px] rounded-full flex items-center justify-center text-gx-navy transition-opacity shrink-0 disabled:opacity-40 disabled:cursor-not-allowed enabled:hover:opacity-85"
            onClick={() => addMutation.mutate()}
            disabled={!newComment.trim() || addMutation.isPending}
          >
            <Send size={13} />
          </button>
        </div>
      )}

      {/* List */}
      {isLoading && (
        <p style={{ fontSize: 11, color: "var(--gx-text-3)", padding: "8px 0" }}>Loading…</p>
      )}
      {!isLoading && comments.length === 0 && (
        <p style={{ fontSize: 11, color: "var(--gx-text-3)", padding: "8px 0" }}>
          No comments yet. Be the first!
        </p>
      )}
      <div className="flex flex-col gap-1.5">
        {comments.map((c) => (
          <CommentRow key={c.id} comment={c} postId={postId} />
        ))}
      </div>
    </div>
  );
}
