"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, SlidersHorizontal, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Slot } from "@radix-ui/react-slot";
import * as Select from "@radix-ui/react-select";
import { Text, Flex, Box } from "@radix-ui/themes";
import { ChevronDown } from "lucide-react";
import { api } from "@/lib/api";
import Avatar from "@/components/Avatar";

interface UserResult {
  id: string;
  username: string;
  avatar?: string;
  bio?: string;
  _count: { followers: number; gameEntries: number };
}

const RECENT_DAYS_OPTIONS = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
];

interface Props { debouncedQ: string }

export function PlayersTab({ debouncedQ }: Props) {
  const router = useRouter();
  const [recentDays, setRecentDays] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const hasFilters = !!recentDays;

  const enabled = debouncedQ.length > 1 || hasFilters;
  const params = new URLSearchParams();
  if (debouncedQ) params.set("q", debouncedQ);
  if (recentDays) params.set("recentDays", recentDays);

  const { data: users = [], isFetching } = useQuery<UserResult[]>({
    queryKey: ["search-users", debouncedQ, recentDays],
    queryFn: () => api.get(`/api/users/search?${params.toString()}`).then((r) => r.data),
    enabled,
  });

  return (
    <>
      <Flex align="center" gap="2" className="mb-4">
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition-colors ${
            showFilters || hasFilters
              ? "border-violet-600 text-violet-400 bg-violet-600/10"
              : "border-white/15 text-gray-400 hover:border-white/20"
          }`}
        >
          <SlidersHorizontal size={14} />
          Filters
          {hasFilters && <span className="text-xs bg-violet-600 text-white rounded-full px-1.5">1</span>}
        </button>
        {hasFilters && (
          <button
            onClick={() => setRecentDays("")}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-white transition-colors"
          >
            <X size={12} />Clear
          </button>
        )}
      </Flex>

      {showFilters && (
        <div className="flex flex-wrap gap-3 mb-5 p-4 bg-white/5 backdrop-blur-sm border border-white/8 rounded-xl">
          <div className="flex-1 min-w-40 space-y-1">
            <Text as="label" size="1" color="gray">Recently Active</Text>
            <Select.Root value={recentDays || "any"} onValueChange={(v) => setRecentDays(v === "any" ? "" : v)}>
              <Select.Trigger className="w-full flex items-center gap-2 bg-white/8 border border-white/10 hover:border-white/20 rounded-lg px-3 py-2 text-sm text-gray-300 outline-none transition-colors">
                <Select.Value placeholder="Any time" />
                <Select.Icon className="ml-auto"><ChevronDown size={14} className="text-gray-500" /></Select.Icon>
              </Select.Trigger>
              <Select.Portal>
                <Select.Content className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-1 shadow-xl z-50" position="popper" sideOffset={4}>
                  <Select.Viewport>
                    <Select.Item value="any" className="px-3 py-2 text-sm text-gray-500 hover:bg-white/8 rounded-lg outline-none cursor-pointer data-highlighted:bg-white/8">
                      <Select.ItemText>Any time</Select.ItemText>
                    </Select.Item>
                    {RECENT_DAYS_OPTIONS.map((opt) => (
                      <Select.Item key={opt.value} value={opt.value} className="px-3 py-2 text-sm text-gray-300 hover:bg-white/8 rounded-lg outline-none cursor-pointer data-highlighted:bg-white/8 data-[state=checked]:text-white">
                        <Select.ItemText>{opt.label}</Select.ItemText>
                      </Select.Item>
                    ))}
                  </Select.Viewport>
                </Select.Content>
              </Select.Portal>
            </Select.Root>
          </div>
        </div>
      )}

      {isFetching && <Text as="p" size="2" color="gray">Searching...</Text>}
      {enabled && !isFetching && users.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <Users size={40} className="mx-auto mb-3 opacity-30" />
          <Text as="p" color="gray">No players found{debouncedQ ? ` for "${debouncedQ}"` : ""}</Text>
        </div>
      )}
      {!enabled && (
        <div className="text-center py-16 text-gray-500">
          <Users size={40} className="mx-auto mb-3 opacity-30" />
          <Text as="p" size="2" color="gray">Type a username or filter by recent activity</Text>
        </div>
      )}

      <Flex direction="column" gap="2">
        {users.map((u) => (
          <Slot
            key={u.id}
            role="link"
            tabIndex={0}
            className="cursor-pointer outline-none block"
            onClick={() => router.push(`/user/${u.username}`)}
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === "Enter" || e.key === " ") router.push(`/user/${u.username}`);
            }}
          >
            <Flex align="center" gap="3" className="bg-white/5 backdrop-blur-sm border border-white/8 rounded-xl p-3 hover:border-violet-700 transition-colors">
              <Avatar src={u.avatar} username={u.username} />
              <Box flexGrow="1" minWidth="0">
                <Text as="p" size="2" className="font-semibold">{u.username}</Text>
                {u.bio && <Text as="p" size="1" color="gray" className="truncate">{u.bio}</Text>}
              </Box>
              <div className="text-right shrink-0">
                <Text as="p" size="1" color="gray">{u._count.followers} followers</Text>
                <Text as="p" size="1" color="gray">{u._count.gameEntries} games</Text>
              </div>
            </Flex>
          </Slot>
        ))}
      </Flex>
    </>
  );
}
