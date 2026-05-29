"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Gamepad2, Star } from "lucide-react";
import Link from "next/link";
import { Heading, Text, Flex } from "@radix-ui/themes";
import * as Tabs from "@radix-ui/react-tabs";
import { api } from "@/lib/api";
import { GameEntry, GameStatus } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";

const TABS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "PLAYING", label: "Playing" },
  { value: "COMPLETED", label: "Completed" },
  { value: "WANT_TO_PLAY", label: "Want to Play" },
  { value: "DROPPED", label: "Dropped" },
];

export default function UserGamesPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);

  const { data: entries = [], isLoading } = useQuery<GameEntry[]>({
    queryKey: ["user-games-full", username],
    queryFn: () => api.get(`/api/users/${username}/games`).then((r) => r.data),
  });

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <Flex align="center" gap="3">
        <Link
          href={`/user/${username}`}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <Heading size="5">{username}</Heading>
          <Text as="p" size="2" color="gray">{entries.length} games in library</Text>
        </div>
      </Flex>

      <Tabs.Root defaultValue="all">
        <Tabs.List className="flex gap-1 mb-4 bg-white/5 backdrop-blur-sm border border-white/8 rounded-xl p-1 w-fit overflow-x-auto">
          {TABS.map((t) => (
            <Tabs.Trigger
              key={t.value}
              value={t.value}
              className="px-3 py-1.5 text-sm rounded-lg text-gray-400 data-[state=active]:bg-violet-600 data-[state=active]:text-white transition-colors whitespace-nowrap"
            >
              {t.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        {TABS.map((t) => {
          const filtered = t.value === "all" ? entries : entries.filter((e) => e.status === t.value);
          return (
            <Tabs.Content key={t.value} value={t.value}>
              {isLoading && <Text as="p" size="2" color="gray">Loading...</Text>}
              {!isLoading && filtered.length === 0 && (
                <div className="text-center py-16 text-gray-500">
                  <Gamepad2 size={36} className="mx-auto mb-3 opacity-30" />
                  <Text as="p" color="gray">No games here.</Text>
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {filtered.map((entry) => (
                  <Link key={entry.id} href={`/game/${entry.game.rawgId}`} className="group">
                    <div className="relative rounded-xl overflow-hidden bg-white/5 backdrop-blur-sm border border-white/8 group-hover:border-violet-700 transition-colors">
                      {entry.game.coverImage ? (
                        <img
                          src={entry.game.coverImage}
                          alt={entry.game.name}
                          className="w-full aspect-3/4 object-cover"
                        />
                      ) : (
                        <div className="w-full aspect-3/4 bg-white/8 flex items-center justify-center">
                          <Gamepad2 size={32} className="text-gray-600" />
                        </div>
                      )}
                      <div className="absolute bottom-0 inset-x-0 bg-linear-to-t from-black/90 via-black/50 to-transparent p-2">
                        <StatusBadge status={entry.status as GameStatus} />
                        {entry.rating && (
                          <div className="flex items-center gap-1 text-yellow-400 text-xs mt-1">
                            <Star size={11} fill="currentColor" />
                            <span>{entry.rating}/10</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <Text as="p" size="1" color="gray" className="mt-1.5 font-medium truncate group-hover:text-white transition-colors">
                      {entry.game.name}
                    </Text>
                  </Link>
                ))}
              </div>
            </Tabs.Content>
          );
        })}
      </Tabs.Root>
    </div>
  );
}
