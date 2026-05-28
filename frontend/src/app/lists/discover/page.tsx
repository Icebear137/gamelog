"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Slot } from "@radix-ui/react-slot";
import { List, Gamepad2, Globe } from "lucide-react";
import { api } from "@/lib/api";
import { GameListPreview } from "@/lib/types";
import Avatar from "@/components/Avatar";

export default function DiscoverListsPage() {
  const router = useRouter();

  const { data: lists = [], isLoading } = useQuery<GameListPreview[]>({
    queryKey: ["lists-discover"],
    queryFn: () => api.get("/api/lists/discover").then((r) => r.data),
    staleTime: 2 * 60 * 1000,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <List size={22} className="text-violet-400" />
          Discover Lists
        </h1>
        <p className="text-gray-500 text-sm mt-1">Browse curated game lists from the community.</p>
      </div>

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

      {!isLoading && lists.length === 0 && (
        <div className="text-center py-20 text-gray-500 bg-white/5 backdrop-blur-sm border border-white/8 rounded-2xl">
          <List size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium text-gray-300">No public lists yet</p>
          <p className="text-sm mt-1">Be the first to create and share a list.</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {lists.map((list) => {
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
                      <img
                        key={i}
                        src={covers[i]!}
                        alt=""
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div key={i} className="bg-white/8 flex items-center justify-center">
                        <Gamepad2 size={14} className="text-gray-700" />
                      </div>
                    )
                  )}
                </div>

                {/* Info */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-white group-hover:text-violet-300 transition-colors truncate">
                        {list.name}
                      </h3>
                      {list.description && (
                        <p className="text-gray-500 text-xs mt-0.5 line-clamp-2">{list.description}</p>
                      )}
                    </div>
                    <Globe size={13} className="text-gray-600 shrink-0 mt-0.5" />
                  </div>

                  <div className="flex items-center gap-2 mt-3">
                    <Avatar src={list.user?.avatar} username={list.user?.username ?? "?"} size="sm" />
                    <span className="text-xs text-gray-400">{list.user?.username}</span>
                    <span className="text-gray-700 text-xs ml-auto">
                      {list._count.entries} game{list._count.entries !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              </div>
            </Slot>
          );
        })}
      </div>
    </div>
  );
}

