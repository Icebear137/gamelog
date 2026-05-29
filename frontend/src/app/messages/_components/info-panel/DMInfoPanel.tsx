"use client";

import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as Separator from "@radix-ui/react-separator";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { User, Conversation } from "@/lib/types";
import { DMProfileSection } from "./DMProfileSection";
import { SharedGamesGrid } from "./SharedGamesGrid";

interface SharedGame {
  game: { id: string; rawgId: number; name: string; coverImage: string | null };
}
interface CompareData {
  stats: { sharedCount: number; myTotal: number; theirTotal: number };
  sharedGames: SharedGame[];
}

interface Props { conv: Conversation }

export function DMInfoPanel({ conv }: Props) {
  const { user: me } = useAuth();
  const qc = useQueryClient();
  const router = useRouter();
  const otherUser = conv.otherUser!;

  const { data: profile } = useQuery<User>({
    queryKey: ["profile", otherUser.username],
    queryFn: () => api.get(`/api/users/${otherUser.username}`).then((r) => r.data),
    enabled: !!otherUser.username,
    staleTime: 60_000,
  });

  const { data: compareData } = useQuery<CompareData>({
    queryKey: ["compare", otherUser.username],
    queryFn: () => api.get(`/api/users/${otherUser.username}/compare`).then((r) => r.data),
    enabled: !!otherUser.username && !!me,
    staleTime: 120_000,
  });

  const followMutation = useMutation({
    mutationFn: (currentlyFollowing: boolean) =>
      currentlyFollowing
        ? api.delete(`/api/users/${otherUser.username}/follow`)
        : api.post(`/api/users/${otherUser.username}/follow`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile", otherUser.username] }),
  });

  return (
    <div className="flex flex-col h-full overflow-y-auto overflow-x-hidden">
      <DMProfileSection
        me={me}
        otherUser={otherUser}
        profile={profile}
        isFollowing={profile?.isFollowing ?? false}
        followPending={followMutation.isPending}
        onFollow={(isFollowing) => followMutation.mutate(isFollowing)}
        onViewProfile={() => router.push(`/user/${otherUser.username}`)}
      />

      <Separator.Root className="h-px bg-white/8 mx-4" />

      {compareData ? (
        <SharedGamesGrid
          stats={compareData.stats}
          sharedGames={compareData.sharedGames.slice(0, 6)}
          onGameClick={(rawgId) => router.push(`/game/${rawgId}`)}
          onSeeAll={() => router.push(`/user/${otherUser.username}/compare`)}
        />
      ) : (
        <div className="grid grid-cols-3 gap-1.5 px-4 py-3 animate-pulse">
          {[...Array(6)].map((_, i) => <div key={i} className="aspect-3/4 rounded-md bg-white/8" />)}
        </div>
      )}
    </div>
  );
}
