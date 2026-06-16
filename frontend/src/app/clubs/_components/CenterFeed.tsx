"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock, Flame, Swords, Users, MessageSquare } from "lucide-react";
import { api } from "@/lib/api";
import { gx } from "@/lib/gx-styles";
import { ClubFeedPost } from "@/lib/types";
import { FeedPostCard } from "./FeedPostCard";

type FeedSort = "recent" | "popular";

interface Club {
  id: string;
  name: string;
  description?: string;
  avatar?: string | null;
  genre?: string;
  isPrivate?: boolean;
  isMember: boolean;
  game?: { rawgId: number; name: string; coverImage?: string };
  creator: { id: string; username: string; avatar?: string };
  _count: { members: number; posts: number };
}

export function CenterFeed({ user, myClubs }: { user: any; myClubs: Club[] }) {
  const [sort, setSort] = useState<FeedSort>("recent");

  const { data: feedPosts = [], isLoading, isError } = useQuery<ClubFeedPost[]>({
    queryKey: ["clubs-feed", sort],
    queryFn: () => api.get(`/api/clubs/feed?sort=${sort}`).then(r => r.data),
    enabled: !!user && myClubs.length > 0,
    staleTime: 2 * 60_000,
    retry: 1,
  });

  return (
    <section className="flex flex-col gap-4 min-w-0">
      <div className="flex items-center justify-between">
        <div>
          <p className={gx.eyebrow}>Your</p>
          <h2 className="font-bebas text-[22px] tracking-[0.04em] text-gx-text-1 mt-0.5 leading-none">Club Feed</h2>
        </div>
        {user && myClubs.length > 0 && (
          <div className="flex gap-0.75 bg-gx-surface border border-gx-border rounded-xl p-0.75">
            {([
              { key: "recent" as FeedSort, icon: <Clock size={11} />, label: "Recent" },
              { key: "popular" as FeedSort, icon: <Flame size={11} />, label: "Popular" },
            ]).map(o => (
              <button
                key={o.key}
                onClick={() => setSort(o.key)}
                data-active={sort === o.key}
                className="inline-flex items-center gap-1 px-3 py-1.25 rounded-[9px] text-[11px] font-semibold bg-transparent border-none cursor-pointer transition-[background,color] whitespace-nowrap data-[active=true]:bg-gx-amber data-[active=true]:text-gx-ink not-data-[active=true]:text-gx-text-2 not-data-[active=true]:hover:text-gx-text-1 not-data-[active=true]:hover:bg-white/4"
              >
                {o.icon}{o.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {!user && (
        <div className="bg-gx-surface border border-gx-border rounded-[14px] px-5 py-10 text-center">
          <Swords size={30} className="mx-auto mb-3 text-gx-amber opacity-40" />
          <p className="text-[14px] font-bold text-gx-text-1 m-0 mb-1">Join the Clubs Community</p>
          <p className="text-[12px] text-gx-text-3 m-0">Sign in to see posts from your clubs.</p>
        </div>
      )}

      {user && myClubs.length === 0 && (
        <div className="bg-gx-surface border border-gx-border rounded-[14px] px-5 py-10 text-center">
          <Users size={30} className="mx-auto mb-3 text-gx-text-3 opacity-25" />
          <p className="text-[14px] font-bold text-gx-text-1 m-0 mb-1">No clubs joined yet</p>
          <p className="text-[12px] text-gx-text-3 m-0">Join clubs from the left panel to see their posts here.</p>
        </div>
      )}

      {isLoading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-37.5 rounded-[14px] bg-gx-surface border border-gx-border opacity-30 animate-pulse" />
          ))}
        </div>
      )}

      {isError && user && myClubs.length > 0 && (
        <div className="bg-gx-surface border border-gx-border rounded-[14px] px-5 py-8 text-center">
          <p className="text-[12px] text-gx-text-3 m-0">Could not load club feed. Visit individual clubs to see posts.</p>
        </div>
      )}

      {!isLoading && !isError && feedPosts.length === 0 && user && myClubs.length > 0 && (
        <div className="bg-gx-surface border border-gx-border rounded-[14px] px-5 py-10 text-center">
          <MessageSquare size={28} className="mx-auto mb-3 text-gx-text-3 opacity-25" />
          <p className="text-[12px] text-gx-text-3 m-0">No posts yet in your clubs. Be the first!</p>
        </div>
      )}

      {feedPosts.length > 0 && (
        <div className="flex flex-col gap-3">
          {feedPosts.map(post => <FeedPostCard key={post.id} post={post} />)}
        </div>
      )}
    </section>
  );
}
