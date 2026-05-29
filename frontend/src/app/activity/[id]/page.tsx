"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Slot } from "@radix-ui/react-slot";
import * as Separator from "@radix-ui/react-separator";
import { Text, Heading, Flex, Box } from "@radix-ui/themes";
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

  if (isLoading) return <Text as="p" color="gray" className="py-16 text-center">Loading...</Text>;
  if (!activity) return <Text as="p" color="gray" className="py-16 text-center">Activity not found</Text>;

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
        <Heading size="2" as="h2" color="gray" className="font-semibold">
          {comments.length} {comments.length === 1 ? "Comment" : "Comments"}
        </Heading>

        {comments.map((c) => (
          <Flex key={c.id} gap="3">
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
            <Box flexGrow="1" minWidth="0">
              <Flex align="baseline" gap="2">
                <Slot
                  role="link"
                  tabIndex={0}
                  className="cursor-pointer outline-none"
                  onClick={() => router.push(`/user/${c.user.username}`)}
                  onKeyDown={(e: React.KeyboardEvent) => {
                    if (e.key === "Enter" || e.key === " ") router.push(`/user/${c.user.username}`);
                  }}
                >
                  <Text as="span" size="2" className="font-semibold hover:text-violet-400 transition-colors">
                    {c.user.username}
                  </Text>
                </Slot>
                <Text as="span" size="1" color="gray">{formatDistanceToNow(c.createdAt)}</Text>
              </Flex>
              <CommentBody body={c.body} className="text-gray-300 text-sm mt-0.5" />
            </Box>
          </Flex>
        ))}

        {comments.length === 0 && (
          <Text as="p" size="2" color="gray" className="text-center py-2">No comments yet. Be the first!</Text>
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
            <Flex flexGrow="1" gap="2">
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
            </Flex>
          </form>
        ) : (
          <Text as="p" size="2" color="gray" className="text-center pt-1">
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
          </Text>
        )}
      </div>
    </div>
  );
}
