"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BarChart2, CheckCircle2 } from "lucide-react";
import { Text, Flex } from "@radix-ui/themes";
import { api } from "@/lib/api";
import { PollData, ChatMessage } from "@/lib/types";
import { dispatchToast } from "@/lib/toast";

interface Props {
  poll: PollData;
  conversationId: string;
  currentUserId: string;
  isOwn: boolean;
}

export default function PollBubble({ poll, conversationId, currentUserId, isOwn }: Props) {
  const qc = useQueryClient();

  const totalVotes = poll.options.reduce((sum, o) => sum + o.votes.length, 0);
  const myVotedIds = new Set(
    poll.options.filter((o) => o.votes.some((v) => v.userId === currentUserId)).map((o) => o.id)
  );
  const hasVoted = myVotedIds.size > 0;

  const voteMutation = useMutation({
    mutationFn: (optionId: string) =>
      api.post(`/api/messages/polls/${poll.id}/vote`, { optionId }),
    onSuccess: (res) => {
      const updatedPoll: PollData = res.data.poll;
      qc.setQueryData(
        ["messages", conversationId],
        (old: { messages: ChatMessage[] } | undefined) => {
          if (!old) return old;
          return {
            ...old,
            messages: old.messages.map((m) =>
              m.poll?.id === poll.id ? { ...m, poll: updatedPoll } : m
            ),
          };
        }
      );
    },
    onError: (err: any) => {
      dispatchToast(err?.response?.data?.error ?? "Failed to vote", "error");
    },
  });

  return (
    <div
      className={`rounded-2xl overflow-hidden border max-w-64 ${
        isOwn
          ? "border-violet-500/30 bg-violet-900/20 rounded-br-sm"
          : "border-white/10 bg-white/5 rounded-bl-sm"
      }`}
    >
      {/* Header */}
      <div className={`px-3 pt-2.5 pb-1.5 border-b ${isOwn ? "border-violet-500/20" : "border-white/8"}`}>
        <Flex align="center" gap="1" className="text-[10px] font-semibold uppercase tracking-wide text-violet-400 mb-1">
          <BarChart2 size={11} />
          Poll{poll.allowMultiple ? " · Multiple choice" : ""}
        </Flex>
        <Text as="p" size="2" weight="medium" className="font-semibold leading-snug">{poll.question}</Text>
      </div>

      {/* Options */}
      <div className="px-3 py-2 flex flex-col gap-1.5">
        {poll.options.map((option) => {
          const count = option.votes.length;
          const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
          const isMyVote = myVotedIds.has(option.id);

          return (
            <button
              key={option.id}
              onClick={() => voteMutation.mutate(option.id)}
              disabled={voteMutation.isPending}
              className="relative w-full text-left rounded-lg overflow-hidden group/opt focus:outline-none"
            >
              {/* Fill bar */}
              <div
                className={`absolute inset-0 rounded-lg transition-all duration-500 ${
                  isMyVote
                    ? "bg-violet-500/30"
                    : "bg-white/6 group-hover/opt:bg-white/10"
                }`}
                style={{ width: hasVoted ? `${Math.max(pct, 4)}%` : "100%" }}
              />
              {/* Content */}
              <div className="relative flex items-center justify-between px-2.5 py-1.5 gap-2">
                <span className={`text-xs leading-snug truncate ${isMyVote ? "text-violet-200 font-medium" : "text-gray-300"}`}>
                  {option.text}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  {isMyVote && <CheckCircle2 size={11} className="text-violet-400" />}
                  {hasVoted && (
                    <span className="text-[10px] text-gray-500 tabular-nums">{pct}%</span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className={`px-3 pb-2 text-[10px] text-gray-600`}>
        {totalVotes === 0 ? "No votes yet" : `${totalVotes} vote${totalVotes !== 1 ? "s" : ""}`}
        {hasVoted && !poll.allowMultiple && (
          <span className="text-gray-700"> · tap to change</span>
        )}
      </div>
    </div>
  );
}
