"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, Send, Trash2, Loader2 } from "lucide-react";
import { Text, Heading, Flex } from "@radix-ui/themes";
import { useAuth } from "@/lib/auth-context";
import { getListCommentsService, addListCommentService, deleteListCommentService } from "@/services/list.service";
import { GameListComment } from "@/lib/types";
import { formatDistanceToNow } from "@/lib/utils";
import { dispatchToast } from "@/lib/toast";
import Avatar from "@/components/Avatar";

interface Props {
  listId: string;
}

export default function ListComments({ listId }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: comments = [], isLoading } = useQuery<GameListComment[]>({
    queryKey: ["list-comments", listId],
    queryFn: () => getListCommentsService(listId),
  });

  const addMutation = useMutation({
    mutationFn: (text: string) => addListCommentService(listId, text),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["list-comments", listId] });
      qc.invalidateQueries({ queryKey: ["list", listId] });
      setBody("");
      textareaRef.current?.focus();
    },
    onError: (err: any) => dispatchToast(err?.response?.data?.error ?? "Failed to post", "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: (commentId: string) => deleteListCommentService(listId, commentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["list-comments", listId] });
      qc.invalidateQueries({ queryKey: ["list", listId] });
    },
    onError: (err: any) => dispatchToast(err?.response?.data?.error ?? "Failed to delete", "error"),
  });

  function submit() {
    const trimmed = body.trim();
    if (!trimmed || addMutation.isPending) return;
    addMutation.mutate(trimmed);
  }

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/8 rounded-2xl p-6 space-y-4">
      <Flex align="center" gap="2">
        <MessageCircle size={18} className="text-violet-400" />
        <Heading size="4" as="h2">
          Comments {comments.length > 0 && <span className="text-gray-500 font-normal text-base">({comments.length})</span>}
        </Heading>
      </Flex>

      {/* Comment list */}
      {isLoading ? (
        <Flex align="center" justify="center" className="py-6">
          <Loader2 size={18} className="animate-spin text-gray-500" />
        </Flex>
      ) : comments.length === 0 ? (
        <Text as="p" size="2" color="gray" className="py-2">No comments yet. Be the first!</Text>
      ) : (
        <div className="space-y-4">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-3 group">
              <Avatar src={c.user.avatar} username={c.user.username} size="sm" />
              <div className="flex-1 min-w-0">
                <Flex align="baseline" gap="2">
                  <Text as="span" size="2" weight="bold">{c.user.username}</Text>
                  <Text as="span" size="1" color="gray">{formatDistanceToNow(c.createdAt)}</Text>
                </Flex>
                <Text as="p" size="2" color="gray" className="mt-0.5 whitespace-pre-wrap break-words">
                  {c.body}
                </Text>
              </div>
              {user?.id === c.user.id && (
                <button
                  onClick={() => deleteMutation.mutate(c.id)}
                  disabled={deleteMutation.isPending}
                  className="opacity-0 group-hover:opacity-100 p-1 text-gray-600 hover:text-red-400 transition-all shrink-0"
                  title="Delete comment"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Comment input */}
      {user ? (
        <div className="flex gap-3 pt-2 border-t border-white/8">
          <Avatar src={user.avatar} username={user.username} size="sm" />
          <div className="flex-1 flex gap-2">
            <textarea
              ref={textareaRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submit();
              }}
              placeholder="Write a comment..."
              rows={1}
              maxLength={1000}
              className="flex-1 bg-white/8 border border-white/12 hover:border-white/20 focus:border-violet-500 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 outline-none transition-colors resize-none min-h-[38px]"
              style={{ fieldSizing: "content" } as React.CSSProperties}
            />
            <button
              onClick={submit}
              disabled={!body.trim() || addMutation.isPending}
              className="self-end p-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-white transition-colors"
            >
              {addMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            </button>
          </div>
        </div>
      ) : (
        <Text as="p" size="2" color="gray" className="pt-2 border-t border-white/8">
          Sign in to leave a comment.
        </Text>
      )}
    </div>
  );
}
