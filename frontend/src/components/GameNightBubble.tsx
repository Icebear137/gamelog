"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  Monitor,
  Check,
  HelpCircle,
  X,
  Gamepad2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Text, Flex } from "@radix-ui/themes";
import { api } from "@/lib/api";
import { GameNightData, ChatMessage } from "@/lib/types";
import { dispatchToast } from "@/lib/toast";

interface Props {
  gameNight: GameNightData;
  conversationId: string;
  currentUserId: string;
  isOwn: boolean;
}

const RSVP_OPTIONS = [
  {
    value: "going" as const,
    label: "Going",
    icon: Check,
    active: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    passive: "bg-white/5 text-gray-400 hover:bg-white/10 border-white/10",
  },
  {
    value: "maybe" as const,
    label: "Maybe",
    icon: HelpCircle,
    active: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    passive: "bg-white/5 text-gray-400 hover:bg-white/10 border-white/10",
  },
  {
    value: "no" as const,
    label: "No",
    icon: X,
    active: "bg-red-500/20 text-red-300 border-red-500/40",
    passive: "bg-white/5 text-gray-400 hover:bg-white/10 border-white/10",
  },
];

export default function GameNightBubble({
  gameNight,
  conversationId,
  currentUserId,
  isOwn,
}: Props) {
  const qc = useQueryClient();
  const myRsvp = gameNight.rsvps.find((r) => r.userId === currentUserId);
  const isPast = new Date(gameNight.scheduledAt) < new Date();

  const rsvpMutation = useMutation({
    mutationFn: (status: "going" | "maybe" | "no") =>
      api.post(`/api/messages/game-nights/${gameNight.id}/rsvp`, { status }),
    onSuccess: (res) => {
      const updated: GameNightData = res.data.gameNight;
      qc.setQueryData(
        ["messages", conversationId],
        (old: { messages: ChatMessage[] } | undefined) => {
          if (!old) return old;
          return {
            ...old,
            messages: old.messages.map((m) =>
              m.gameNight?.id === gameNight.id
                ? { ...m, gameNight: updated }
                : m,
            ),
          };
        },
      );
    },
    onError: (err: any) => {
      dispatchToast(err?.response?.data?.error ?? "Failed to RSVP", "error");
    },
  });

  const going = gameNight.rsvps.filter((r) => r.status === "going");
  const maybe = gameNight.rsvps.filter((r) => r.status === "maybe");

  const scheduled = new Date(gameNight.scheduledAt);
  const dateStr = scheduled.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const timeStr = scheduled.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className={`rounded-2xl overflow-hidden border w-98 ${
        isOwn
          ? "border-emerald-500/30 bg-emerald-950/20 rounded-br-sm"
          : "border-white/10 bg-white/5 rounded-bl-sm"
      }`}
    >
      {/* Header */}
      <div
        className={`px-3 pt-2.5 pb-2 border-b ${isOwn ? "border-emerald-500/20" : "border-white/8"}`}
      >
        <Flex
          align="center"
          gap="1"
          className="text-[10px] font-semibold uppercase tracking-wide text-emerald-400 mb-1"
        >
          <CalendarDays size={11} />
          Game Night{isPast ? " · Past" : ""}
        </Flex>
        <Text
          as="p"
          size="2"
          weight="medium"
          className="font-semibold leading-snug"
        >
          {gameNight.title}
        </Text>
        <Flex align="center" gap="2" className="mt-1.5" wrap="wrap">
          <span className="text-[11px] text-gray-400 flex items-center gap-1">
            <CalendarDays size={10} className="text-gray-500 shrink-0" />
            {dateStr} · {timeStr}
          </span>
          {gameNight.platform && (
            <span className="text-[11px] text-gray-500 flex items-center gap-1">
              <Monitor size={10} className="shrink-0" />
              {gameNight.platform}
            </span>
          )}
        </Flex>
      </div>

      {/* Game */}
      {gameNight.game && (
        <Link
          href={`/game/${gameNight.game.rawgId}`}
          className={`px-3 py-2 flex items-center gap-2.5 border-b hover:bg-white/5 transition-colors ${isOwn ? "border-emerald-500/20" : "border-white/8"}`}
        >
          {gameNight.game.coverImage ? (
            <div className="relative w-8 h-10 rounded overflow-hidden shrink-0">
              <Image
                src={gameNight.game.coverImage}
                alt={gameNight.game.name}
                fill
                className="object-cover"
                sizes="32px"
              />
            </div>
          ) : (
            <div className="w-8 h-10 bg-white/8 rounded shrink-0 flex items-center justify-center">
              <Gamepad2 size={12} className="text-gray-600" />
            </div>
          )}
          <span className="text-xs text-gray-300 truncate">
            {gameNight.game.name}
          </span>
        </Link>
      )}

      {/* Note */}
      {gameNight.note && (
        <div
          className={`px-3 py-1.5 border-b ${isOwn ? "border-emerald-500/20" : "border-white/8"}`}
        >
          <p className="text-[11px] text-gray-500 leading-snug">
            {gameNight.note}
          </p>
        </div>
      )}

      {/* RSVP buttons */}
      {!isPast && (
        <div className="px-2.5 py-2 flex gap-1">
          {RSVP_OPTIONS.map(({ value, label, icon: Icon, active, passive }) => {
            const isSelected = myRsvp?.status === value;
            return (
              <button
                key={value}
                onClick={() => rsvpMutation.mutate(value)}
                disabled={rsvpMutation.isPending}
                className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg border text-[11px] font-medium transition-colors disabled:opacity-50 ${
                  isSelected ? active : passive
                }`}
              >
                <Icon size={11} className="shrink-0" />
                <span className="truncate">{label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Attendees */}
      {(going.length > 0 || maybe.length > 0) && (
        <Flex direction="column" gap="1" className="px-3 pb-2.5">
          {going.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-emerald-500 font-medium w-14 shrink-0">
                Going ({going.length})
              </span>
              <div className="flex items-center">
                {going.slice(0, 6).map((r, i) => (
                  <div
                    key={r.userId}
                    className="w-4 h-4 rounded-full overflow-hidden border border-zinc-900 bg-emerald-700/60 flex items-center justify-center shrink-0"
                    style={{ marginLeft: i === 0 ? 0 : -4 }}
                    title={r.user.username}
                  >
                    {r.user.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={r.user.avatar}
                        alt={r.user.username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span
                        className="text-white font-bold uppercase leading-none select-none"
                        style={{ fontSize: 5 }}
                      >
                        {r.user.username[0]}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {maybe.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-amber-500 font-medium w-14 shrink-0">
                Maybe ({maybe.length})
              </span>
              <div className="flex items-center">
                {maybe.slice(0, 6).map((r, i) => (
                  <div
                    key={r.userId}
                    className="w-4 h-4 rounded-full overflow-hidden border border-zinc-900 bg-amber-700/60 flex items-center justify-center shrink-0"
                    style={{ marginLeft: i === 0 ? 0 : -4 }}
                    title={r.user.username}
                  >
                    {r.user.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={r.user.avatar}
                        alt={r.user.username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span
                        className="text-white font-bold uppercase leading-none select-none"
                        style={{ fontSize: 5 }}
                      >
                        {r.user.username[0]}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </Flex>
      )}

      {isPast && gameNight.rsvps.length === 0 && (
        <div className="px-3 pb-2.5 text-[10px] text-gray-600">No RSVPs</div>
      )}
    </div>
  );
}
