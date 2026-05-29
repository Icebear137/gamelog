"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Slot } from "@radix-ui/react-slot";
import { List, Gamepad2, Globe, Search, Heart, MessageCircle, Flame, Clock, Trophy } from "lucide-react";
import { Text, Heading, Flex, Box } from "@radix-ui/themes";
import { api } from "@/lib/api";
import { GameListPreview } from "@/lib/types";
import Avatar from "@/components/Avatar";

type SortKey = "popular" | "newest" | "most_games";

const SORT_OPTIONS: { key: SortKey; label: string; icon: React.ReactNode }[] = [
  { key: "popular",    label: "Popular",    icon: <Flame size={13} /> },
  { key: "newest",     label: "Newest",     icon: <Clock size={13} /> },
  { key: "most_games", label: "Most Games", icon: <Trophy size={13} /> },
];

function popularityScore(l: GameListPreview) {
  return l._count.likes * 2 + l._count.comments + l._count.entries;
}

export default function DiscoverListsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("popular");

  const { data: lists = [], isLoading } = useQuery<GameListPreview[]>({
    queryKey: ["lists-discover"],
    queryFn: () => api.get("/api/lists/discover").then((r) => r.data),
    staleTime: 2 * 60 * 1000,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = q
      ? lists.filter(
          (l) =>
            l.name.toLowerCase().includes(q) ||
            l.description?.toLowerCase().includes(q) ||
            l.user.username.toLowerCase().includes(q)
        )
      : [...lists];

    switch (sort) {
      case "popular":
        result.sort((a, b) => popularityScore(b) - popularityScore(a));
        break;
      case "newest":
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case "most_games":
        result.sort((a, b) => b._count.entries - a._count.entries);
        break;
    }
    return result;
  }, [lists, search, sort]);

  return (
    <Flex direction="column" gap="5">
      <Box>
        <Heading size="6" className="flex items-center gap-2">
          <List size={22} className="text-violet-400" />
          Discover Lists
        </Heading>
        <Text as="p" size="2" color="gray" className="mt-1">Browse curated game lists from the community.</Text>
      </Box>

      {/* Search + Sort */}
      <Flex align="center" gap="3" className="flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search lists, names..."
            className="w-full bg-white/5 border border-white/10 hover:border-white/20 focus:border-violet-500 rounded-xl pl-8 pr-3 py-2 text-sm text-white placeholder-gray-500 outline-none transition-colors"
          />
        </div>
        <div className="flex gap-1">
          {SORT_OPTIONS.map((o) => (
            <button
              key={o.key}
              onClick={() => setSort(o.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                sort === o.key
                  ? "bg-violet-600 text-white"
                  : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
              }`}
            >
              {o.icon}
              {o.label}
            </button>
          ))}
        </div>
      </Flex>

      {/* Loading skeletons */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white/5 backdrop-blur-sm border border-white/8 rounded-2xl overflow-hidden animate-pulse">
              <div className="grid grid-cols-4 h-24 bg-white/8" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-white/8 rounded w-3/4" />
                <div className="h-3 bg-white/8 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-20 bg-white/5 backdrop-blur-sm border border-white/8 rounded-2xl">
          <List size={40} className="mx-auto mb-3 opacity-30 text-gray-500" />
          <Text as="p" size="2" color="gray" className="font-medium">
            {search ? "No lists match your search" : "No public lists yet"}
          </Text>
          {!search && (
            <Text as="p" size="2" color="gray" className="mt-1">Be the first to create and share a list.</Text>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filtered.map((list) => {
          const covers = list.entries.slice(0, 4).map((e) => e.game.coverImage).filter(Boolean);
          return (
            <Slot
              key={list.id}
              role="link"
              tabIndex={0}
              className="group cursor-pointer outline-none"
              onClick={() => router.push(`/lists/${list.id}`)}
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === "Enter" || e.key === " ") router.push(`/lists/${list.id}`);
              }}
            >
              <div className="bg-white/5 backdrop-blur-sm border border-white/8 group-hover:border-violet-700 rounded-2xl overflow-hidden transition-colors">
                {/* Cover mosaic */}
                <div className="grid grid-cols-4 h-24 overflow-hidden">
                  {Array.from({ length: 4 }).map((_, i) =>
                    covers[i] ? (
                      <img key={i} src={covers[i]!} alt="" loading="lazy" className="w-full h-full object-cover" />
                    ) : (
                      <div key={i} className="bg-white/8 flex items-center justify-center">
                        <Gamepad2 size={14} className="text-gray-700" />
                      </div>
                    )
                  )}
                </div>

                {/* Info */}
                <div className="p-4">
                  <Flex align="start" justify="between" gap="2">
                    <Box minWidth="0">
                      <Text as="p" size="2" className="font-semibold group-hover:text-violet-300 transition-colors truncate">
                        {list.name}
                      </Text>
                      {list.description && (
                        <Text as="p" size="1" color="gray" className="mt-0.5 line-clamp-2">{list.description}</Text>
                      )}
                    </Box>
                    <Globe size={13} className="text-gray-600 shrink-0 mt-0.5" />
                  </Flex>

                  <Flex align="center" gap="2" className="mt-3">
                    <Avatar src={list.user?.avatar} username={list.user?.username ?? "?"} size="sm" />
                    <Text as="span" size="1" color="gray">{list.user?.username}</Text>
                    <div className="ml-auto flex items-center gap-3">
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Heart size={12} className={list.likedByMe ? "text-red-400 fill-red-400" : ""} />
                        {list._count.likes}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <MessageCircle size={12} />
                        {list._count.comments}
                      </span>
                      <Text as="span" size="1" color="gray">
                        {list._count.entries} game{list._count.entries !== 1 ? "s" : ""}
                      </Text>
                    </div>
                  </Flex>
                </div>
              </div>
            </Slot>
          );
        })}
      </div>
    </Flex>
  );
}
