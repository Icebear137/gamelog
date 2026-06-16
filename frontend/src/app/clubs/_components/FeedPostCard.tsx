"use client";

import { Heart, MessageSquare, Users } from "lucide-react";
import Link from "next/link";
import { ClubFeedPost } from "@/lib/types";
import Avatar from "@/components/Avatar";
import { formatDistanceToNow } from "@/lib/utils";

function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export function FeedPostCard({ post }: { post: ClubFeedPost }) {
  const preview = stripHtml(post.body);
  return (
    <article className="bg-gx-surface border border-gx-border rounded-[14px] px-4.5 py-4 transition-colors hover:border-gx-border-md flex flex-col gap-3">
      <Link href={`/clubs/${post.clubId}`} className="inline-flex items-center gap-1.5 w-fit no-underline group">
        <div className="w-4 h-4 rounded-full overflow-hidden bg-gx-surface-2 border border-gx-amber/30 shrink-0 flex items-center justify-center">
          {post.club.avatar
            ? <img src={post.club.avatar} alt={post.club.name} className="w-full h-full object-cover" />
            : <Users size={8} className="text-gx-amber" />}
        </div>
        <span className="text-[10px] font-bold text-gx-amber tracking-[0.08em] uppercase transition-colors group-hover:text-[#f5a33a]">
          {post.club.name}
        </span>
      </Link>

      <div className="flex items-center gap-2">
        <Avatar src={post.user.avatar} username={post.user.username} size="sm" />
        <div>
          <Link href={`/user/${post.user.username}`}
            className="text-[12px] font-bold text-gx-text-1 no-underline hover:text-gx-amber transition-colors">
            {post.user.username}
          </Link>
          <p className="text-[10px] text-gx-text-3 m-0 mt-px">{formatDistanceToNow(post.createdAt)}</p>
        </div>
      </div>

      {preview && (
        <p className="text-[13px] text-gx-text-2 leading-[1.6] line-clamp-3 m-0">{preview}</p>
      )}

      <div className="flex items-center gap-4 pt-2.5 border-t border-gx-border">
        <span className="flex items-center gap-1 text-[11px] text-gx-text-3">
          <Heart size={11} />{post._count.likes}
        </span>
        <span className="flex items-center gap-1 text-[11px] text-gx-text-3">
          <MessageSquare size={11} />{post._count.comments}
        </span>
        <Link href={`/clubs/${post.clubId}`}
          className="ml-auto text-[11px] text-gx-text-3 hover:text-gx-amber transition-colors no-underline">
          View →
        </Link>
      </div>
    </article>
  );
}
