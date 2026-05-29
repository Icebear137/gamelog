"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Gamepad2, Users } from "lucide-react";
import * as Tabs from "@radix-ui/react-tabs";
import { Heading } from "@radix-ui/themes";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { GameEntry } from "@/lib/types";
import { GamesTab } from "./_components/GamesTab";
import { PlayersTab } from "./_components/PlayersTab";

export default function SearchPage() {
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(q), 400);
    return () => clearTimeout(timer);
  }, [q]);

  // Pre-fetch my entries so WantToPlayButton works without extra requests
  useQuery<GameEntry[]>({
    queryKey: ["my-entries"],
    queryFn: () => api.get("/api/entries/me").then((r) => r.data),
    enabled: !!user,
  });

  return (
    <div>
      <Heading size="6" className="mb-6">Search</Heading>

      <div className="relative mb-6">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="w-full bg-white/5 backdrop-blur-sm border border-white/8 rounded-xl pl-11 pr-4 py-3 text-white placeholder-gray-500 outline-none focus:border-violet-500 transition-colors"
          placeholder="Search games or players..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus
        />
      </div>

      <Tabs.Root defaultValue="games">
        <Tabs.List className="flex gap-1 mb-5 bg-white/5 backdrop-blur-sm border border-white/8 rounded-xl p-1 w-fit">
          <Tabs.Trigger
            value="games"
            className="flex items-center gap-1.5 px-4 py-1.5 text-sm rounded-lg text-gray-400 data-[state=active]:bg-violet-600 data-[state=active]:text-white transition-colors"
          >
            <Gamepad2 size={14} />
            Games
          </Tabs.Trigger>
          <Tabs.Trigger
            value="players"
            className="flex items-center gap-1.5 px-4 py-1.5 text-sm rounded-lg text-gray-400 data-[state=active]:bg-violet-600 data-[state=active]:text-white transition-colors"
          >
            <Users size={14} />
            Players
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="games">
          <GamesTab debouncedQ={debouncedQ} />
        </Tabs.Content>
        <Tabs.Content value="players">
          <PlayersTab debouncedQ={debouncedQ} />
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}
