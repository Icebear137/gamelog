"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BarChart2,
  CheckCircle2,
  Clock,
  LockKeyhole,
  EyeOff,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Flex } from "@radix-ui/themes";
import { api } from "@/lib/api";
import { PollData, PollOptionData, ChatMessage } from "@/lib/types";
import { dispatchToast } from "@/lib/toast";
import Avatar from "./Avatar";

interface Props {
  poll: PollData;
  conversationId: string;
  currentUserId: string;
  isOwn: boolean;
}

// ── countdown ────────────────────────────────────────────────────────────────

function useCountdown(endsAt?: string | null) {
  const [remaining, setRemaining] = useState<number | null>(null);
  useEffect(() => {
    if (!endsAt) return;
    const tick = () =>
      setRemaining(Math.max(0, new Date(endsAt).getTime() - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);
  return remaining;
}

function fmtRemaining(ms: number) {
  if (ms <= 0) return "Expired";
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}

// ── timer strip ──────────────────────────────────────────────────────────────

function TimerStrip({
  remaining,
  totalMs,
  isOwn,
}: {
  remaining: number;
  totalMs: number;
  isOwn: boolean;
}) {
  const pct = totalMs > 0 ? Math.max(2, Math.min(100, (remaining / totalMs) * 100)) : null;
  const urgent  = remaining <= 300_000;   // < 5 min
  const warning = remaining <= 3_600_000; // < 1 h

  const color = urgent ? "text-red-400" : warning ? "text-amber-400" : "text-violet-400";
  const bar   = urgent ? "bg-red-500"   : warning ? "bg-amber-500"   : "bg-violet-500";

  return (
    <div className={`px-3 py-2 border-b ${isOwn ? "border-violet-500/20" : "border-white/8"}`}>
      <div className={`flex items-center justify-between mb-1.5 ${color}`}>
        <div className={`flex items-center gap-1 ${urgent ? "animate-pulse" : ""}`}>
          <Clock size={11} />
          <span className="text-[11px] font-medium">Time remaining</span>
        </div>
        <span className="text-xs font-semibold tabular-nums">{fmtRemaining(remaining)}</span>
      </div>
      {pct !== null && (
        <div className="h-1 rounded-full bg-white/10 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${bar}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

// ── voter list per option ────────────────────────────────────────────────────

function VoterList({
  option,
  anonymous,
}: {
  option: PollOptionData;
  anonymous: boolean;
}) {
  const [open, setOpen] = useState(false);
  const count = option.votes.length;
  if (count === 0) return null;
  if (anonymous) {
    return (
      <div className="flex items-center gap-1 text-[10px] text-gray-600">
        <EyeOff size={9} />
        <span>
          {count} vote{count !== 1 ? "s" : ""}
        </span>
      </div>
    );
  }

  const preview = option.votes.slice(0, 3);
  return (
    <div className="mt-1">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
      >
        <div className="flex -space-x-1">
          {preview.map((v, i) => (
            <div
              key={i}
              className="w-4 h-4 rounded-full ring-1 ring-zinc-900 overflow-hidden shrink-0"
            >
              <Avatar
                src={v.user?.avatar}
                username={v.user?.username ?? "?"}
                size="xs"
              />
            </div>
          ))}
        </div>
        <span>
          {count} vote{count !== 1 ? "s" : ""}
        </span>
        {open ? <ChevronUp size={9} /> : <ChevronDown size={9} />}
      </button>

      {open && (
        <div className="mt-1.5 flex flex-col gap-1 pl-1">
          {option.votes.map((v, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 text-[11px] text-gray-400"
            >
              <Avatar
                src={v.user?.avatar}
                username={v.user?.username ?? "?"}
                size="xs"
              />
              <span className="truncate">{v.user?.username ?? "Unknown"}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── main component ───────────────────────────────────────────────────────────

export default function PollBubble({
  poll,
  conversationId,
  currentUserId,
  isOwn,
}: Props) {
  const qc = useQueryClient();
  const remaining = useCountdown(poll.endsAt);

  const isExpired =
    !!poll.endsAt &&
    (remaining !== null ? remaining <= 0 : new Date(poll.endsAt) <= new Date());
  const isClosed = !!poll.closedAt || isExpired;

  const totalVotes = poll.options.reduce((sum, o) => sum + o.votes.length, 0);
  const myVotedIds = new Set(
    poll.options
      .filter((o) => o.votes.some((v) => v.userId === currentUserId))
      .map((o) => o.id),
  );
  const hasVoted = myVotedIds.size > 0;

  function updateCache(updatedPoll: PollData) {
    qc.setQueryData(
      ["messages", conversationId],
      (old: { messages: ChatMessage[] } | undefined) => {
        if (!old) return old;
        return {
          ...old,
          messages: old.messages.map((m) =>
            m.poll?.id === poll.id ? { ...m, poll: updatedPoll } : m,
          ),
        };
      },
    );
  }

  const voteMutation = useMutation({
    mutationFn: (optionId: string) =>
      api.post(`/api/messages/polls/${poll.id}/vote`, { optionId }),
    onSuccess: (res) => updateCache(res.data.poll),
    onError: (err: any) =>
      dispatchToast(err?.response?.data?.error ?? "Failed to vote", "error"),
  });

  const closeMutation = useMutation({
    mutationFn: () => api.post(`/api/messages/polls/${poll.id}/close`),
    onSuccess: (res) => updateCache(res.data.poll),
    onError: (err: any) =>
      dispatchToast(
        err?.response?.data?.error ?? "Failed to close poll",
        "error",
      ),
  });

  return (
    <div
      className={`rounded-2xl overflow-hidden border max-w-96 min-w-64 ${
        isOwn
          ? "border-violet-500/30 bg-violet-900/20 rounded-br-sm"
          : "border-white/10 bg-white/5 rounded-bl-sm"
      }`}
    >
      {/* Header */}
      <div
        className={`px-3 pt-2.5 pb-1.5 border-b ${isOwn ? "border-violet-500/20" : "border-white/8"}`}
      >
        <Flex align="center" justify="between" className="mb-1">
          <Flex
            align="center"
            gap="1"
            className="text-[10px] font-semibold uppercase tracking-wide text-violet-400"
          >
            <BarChart2 size={11} />
            Poll
            {poll.allowMultiple ? " · Multiple" : ""}
            {poll.anonymous ? " · Anonymous" : ""}
          </Flex>
          <div className="flex items-center gap-1.5">
            {poll.anonymous && (
              <span title="Anonymous poll">
                <EyeOff size={9} className="text-gray-600" />
              </span>
            )}
            {isClosed && (
              <span className="flex items-center gap-0.5 text-[10px] text-gray-500">
                <LockKeyhole size={9} /> Closed
              </span>
            )}
          </div>
        </Flex>
        <p className="text-sm font-semibold leading-snug text-white">
          {poll.question}
        </p>
      </div>

      {/* Timer */}
      {poll.endsAt && !isClosed && remaining !== null && remaining > 0 && (
        <TimerStrip
          remaining={remaining}
          totalMs={
            poll.createdAt
              ? new Date(poll.endsAt).getTime() - new Date(poll.createdAt).getTime()
              : 0
          }
          isOwn={isOwn}
        />
      )}

      {/* Options */}
      <div className="px-3 py-2 flex flex-col gap-2">
        {poll.options.map((option) => {
          const count = option.votes.length;
          const pct =
            totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
          const isMyVote = myVotedIds.has(option.id);

          return (
            <div key={option.id}>
              <button
                onClick={() => !isClosed && voteMutation.mutate(option.id)}
                disabled={isClosed || voteMutation.isPending}
                className={`relative w-full text-left rounded-lg overflow-hidden focus:outline-none group/opt ${isClosed ? "cursor-default" : ""}`}
              >
                <div
                  className={`absolute inset-0 rounded-lg transition-all duration-500 ${
                    isMyVote
                      ? "bg-violet-500/30"
                      : isClosed
                        ? "bg-white/4"
                        : "bg-white/6 group-hover/opt:bg-white/10"
                  }`}
                  style={{
                    width:
                      hasVoted || isClosed ? `${Math.max(pct, 4)}%` : "100%",
                  }}
                />
                <div className="relative flex items-center justify-between px-2.5 py-1.5 gap-2">
                  <span
                    className={`text-xs leading-snug truncate ${isMyVote ? "text-violet-200 font-medium" : "text-gray-300"}`}
                  >
                    {option.text}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    {isMyVote && (
                      <CheckCircle2 size={11} className="text-violet-400" />
                    )}
                    {(hasVoted || isClosed) && (
                      <span className="text-[10px] text-gray-500 tabular-nums">
                        {pct}%
                      </span>
                    )}
                  </div>
                </div>
              </button>

              {/* Voter list (below each option) */}
              {(hasVoted || isClosed) && (
                <div className="px-1">
                  <VoterList option={option} anonymous={poll.anonymous} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-3 pb-2.5 flex items-center justify-between">
        <span className="text-[10px] text-gray-600">
          {totalVotes === 0
            ? "No votes yet"
            : `${totalVotes} vote${totalVotes !== 1 ? "s" : ""}`}
          {hasVoted && !poll.allowMultiple && !isClosed && (
            <span className="text-gray-700"> · tap to change</span>
          )}
        </span>
        {isOwn && !isClosed && (
          <button
            onClick={() => closeMutation.mutate()}
            disabled={closeMutation.isPending}
            className="text-[10px] text-gray-600 hover:text-red-400 transition-colors disabled:opacity-40"
          >
            Close poll
          </button>
        )}
      </div>
    </div>
  );
}
