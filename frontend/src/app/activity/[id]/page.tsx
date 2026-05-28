"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Slot } from "@radix-ui/react-slot";
import * as Separator from "@radix-ui/react-separator";
import { ArrowLeft, Send } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
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
    queryFn: () => api.get(`/api/activities/${id}`).then((r) => r.data),
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
  });

  const { data: comments = [] } = useQuery<Comment[]>({
    queryKey: ["comments", id],
    queryFn: () => api.get(`/api/activities/${id}/comments`).then((r) => r.data),
    enabled: !!activity,
    refetchInterval: 10_000,
    refetchIntervalInBackground: false,
  });

  const commentMutation = useMutation({
    mutationFn: () => api.post(`/api/activities/${id}/comments`, { body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comments", id] });
      qc.invalidateQueries({ queryKey: ["activity", id] });
      setBody("");
    },
    onError: (err: any) => {
      dispatchToast(err?.response?.data?.error ?? "Failed to post comment", "error");
    },
  });

  if (isLoading) return <div className="text-gray-500 py-16 text-center">Loading...</div>;
  if (!activity) return <div className="text-gray-500 py-16 text-center">Activity not found</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Slot
        role="link"
        tabIndex={0}
        className="inline-flex items-center gap-1.5 text-gray-400 hover:text-white text-sm transition-colors cursor-pointer outline-none"
        onClick={() => router.back()}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") router.back();
        }}
      >
        <div className="inline-flex items-center gap-1.5">
          <ArrowLeft size={16} />
          Back to feed
        </div>
      </Slot>

      <ActivityCard activity={activity} />

      <div className="bg-white/5 backdrop-blur-sm border border-white/8 rounded-xl p-4 space-y-4">
        <h2 className="text-sm font-semibold text-gray-300">
          {comments.length} {comments.length === 1 ? "Comment" : "Comments"}
        </h2>

        {comments.map((c) => (
          <div key={c.id} className="flex gap-3">
            <Slot
              role="link"
              tabIndex={0}
              className="cursor-pointer outline-none shrink-0"
              onClick={() => router.push(`/user/${c.user.username}`)}
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === "Enter" || e.key === " ") router.push(`/user/${c.user.username}`);
              }}
            >
              <div>
                <Avatar src={c.user.avatar} username={c.user.username} size="sm" />
              </div>
            </Slot>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <Slot
                  role="link"
                  tabIndex={0}
                  className="cursor-pointer outline-none"
                  onClick={() => router.push(`/user/${c.user.username}`)}
                  onKeyDown={(e: React.KeyboardEvent) => {
                    if (e.key === "Enter" || e.key === " ") router.push(`/user/${c.user.username}`);
                  }}
                >
                  <span className="text-sm font-semibold text-white hover:text-violet-400 transition-colors">
                    {c.user.username}
                  </span>
                </Slot>
                <span className="text-xs text-gray-500">{formatDistanceToNow(c.createdAt)}</span>
              </div>
              <CommentBody body={c.body} className="text-gray-300 text-sm mt-0.5" />
            </div>
          </div>
        ))}

        {comments.length === 0 && (
          <p className="text-gray-600 text-sm text-center py-2">No comments yet. Be the first!</p>
        )}

        <Separator.Root className="h-px bg-white/8" />

        {user ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (body.trim()) commentMutation.mutate();
            }}
            className="flex gap-2 pt-1"
          >
            <Avatar src={user.avatar} username={user.username} size="sm" />
            <div className="flex-1 flex gap-2">
              <MentionInput
                value={body}
                onChange={setBody}
                onSubmit={() => { if (body.trim()) commentMutation.mutate(); }}
                maxLength={500}
                disabled={commentMutation.isPending}
              />
              <button
                type="submit"
                disabled={!body.trim() || commentMutation.isPending}
                className="shrink-0 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white px-3 py-2 rounded-lg transition-colors"
              >
                <Send size={15} />
              </button>
            </div>
          </form>
        ) : (
          <p className="text-gray-600 text-sm text-center pt-1">
            <Slot
              role="link"
              tabIndex={0}
              className="text-violet-400 hover:text-violet-300 cursor-pointer outline-none"
              onClick={() => router.push("/login")}
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === "Enter" || e.key === " ") router.push("/login");
              }}
            >
              <span>Sign in</span>
            </Slot>{" "}
            to leave a comment
          </p>
        )}
      </div>
    </div>
  );
}
