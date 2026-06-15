"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Send } from "lucide-react";
import clsx from "clsx";
import { gx } from "@/lib/gx-styles";
import { useAuth } from "@/lib/auth-context";
import { getActivityService, getActivityCommentsService, addActivityCommentService } from "@/services/activity.service";
import { Activity, Comment } from "@/lib/types";
import { dispatchToast } from "@/lib/toast";
import { formatDistanceToNow } from "@/lib/utils";
import ActivityCard from "@/components/ActivityCard";
import Avatar from "@/components/Avatar";
import CommentBody from "@/components/CommentBody";
import MentionInput from "@/components/MentionInput";

export default function ActivityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const [body, setBody] = useState("");

  const { data: activity, isLoading } = useQuery<Activity>({
    queryKey: ["activity", id],
    queryFn: () => getActivityService(id),
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
  });

  const { data: comments = [] } = useQuery<Comment[]>({
    queryKey: ["comments", id],
    queryFn: () => getActivityCommentsService(id),
    enabled: !!activity,
    refetchInterval: 10_000,
    refetchIntervalInBackground: false,
  });

  const commentMutation = useMutation({
    mutationFn: () => addActivityCommentService(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comments", id] });
      qc.invalidateQueries({ queryKey: ["activity", id] });
      setBody("");
    },
    onError: (err: any) => {
      dispatchToast(err?.response?.data?.error ?? "Failed to post comment", "error");
    },
  });

  if (isLoading) return (
    <div className="flex flex-col gap-4 max-w-160 mx-auto">
      <div style={{ height: 120, background: "var(--gx-surface)", borderRadius: 14 }} />
    </div>
  );
  if (!activity) return (
    <p style={{ padding: "64px 0", textAlign: "center", color: "var(--gx-text-2)", fontSize: 14 }}>
      Activity not found
    </p>
  );

  return (
    <div className="flex flex-col gap-4 max-w-160 mx-auto">

      {/* Back */}
      <button className={gx.backBtn} onClick={() => router.back()}>
        <ArrowLeft size={14} /> Back to feed
      </button>

      {/* Activity card */}
      <ActivityCard activity={activity} />

      {/* Comments */}
      <div className={gx.sectionCard}>
        <p className="text-[10px] font-bold tracking-[0.13em] uppercase text-gx-text-3 mb-4">
          {comments.length} {comments.length === 1 ? "Comment" : "Comments"}
        </p>

        {/* Comment list */}
        {comments.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--gx-text-3)", textAlign: "center", padding: "12px 0 16px" }}>
            No comments yet. Be the first!
          </p>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="flex gap-3 py-3 border-b border-gx-border last-of-type:border-b-0">
              <div
                style={{ flexShrink: 0, cursor: "pointer" }}
                role="link"
                tabIndex={0}
                onClick={() => router.push(`/user/${c.user.username}`)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") router.push(`/user/${c.user.username}`); }}
              >
                <Avatar src={c.user.avatar} username={c.user.username} size="sm" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 0 }}>
                  <button
                    className="text-xs font-bold text-gx-text-1 transition-colors cursor-pointer bg-transparent border-none p-0 hover:text-gx-amber"
                    onClick={() => router.push(`/user/${c.user.username}`)}
                  >
                    {c.user.username}
                  </button>
                  <span className="text-[10px] text-gx-text-3 ml-2">{formatDistanceToNow(c.createdAt)}</span>
                </div>
                <CommentBody body={c.body} className="text-[13px] text-gx-text-2 mt-1 leading-[1.55]" />
              </div>
            </div>
          ))
        )}

        {/* Input */}
        {user ? (
          <form
            className="flex gap-2.5 items-start pt-3.5 border-t border-gx-border"
            onSubmit={(e) => {
              e.preventDefault();
              if (body.trim()) commentMutation.mutate();
            }}
          >
            <Avatar src={user.avatar} username={user.username} size="sm" />
            <div style={{ flex: 1 }}>
              <MentionInput
                value={body}
                onChange={setBody}
                onSubmit={() => { if (body.trim()) commentMutation.mutate(); }}
                maxLength={500}
                disabled={commentMutation.isPending}
              />
            </div>
            <button
              type="submit"
              disabled={!body.trim() || commentMutation.isPending}
              className={clsx(
                "flex shrink-0 w-9 h-9 items-center justify-center self-end",
                "bg-gx-amber border-none rounded-lg text-gx-ink cursor-pointer",
                "transition-[background-color] hover:bg-[#f5a33a]",
                "disabled:opacity-40 disabled:cursor-not-allowed",
              )}
            >
              <Send size={14} />
            </button>
          </form>
        ) : (
          <div className="flex gap-2.5 items-start pt-3.5 border-t border-gx-border" style={{ justifyContent: "center" }}>
            <p style={{ fontSize: 13, color: "var(--gx-text-2)" }}>
              <span
                role="link"
                tabIndex={0}
                style={{ color: "var(--gx-amber)", cursor: "pointer" }}
                onClick={() => router.push("/login")}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") router.push("/login"); }}
              >
                Sign in
              </span>{" "}
              to leave a comment
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
