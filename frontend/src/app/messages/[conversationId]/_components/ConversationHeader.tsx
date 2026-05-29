"use client";

import { Search, X, Users, ExternalLink, Loader2 } from "lucide-react";
import { Slot } from "@radix-ui/react-slot";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Conversation } from "@/lib/types";
import { formatDistanceToNow } from "@/lib/utils";
import Avatar from "@/components/Avatar";

interface Props {
  conv: Conversation | undefined;
  membersCount: number;
  otherUserPresence: { isOnline: boolean; lastSeen: string | null } | null;
  searchOpen: boolean;
  setSearchOpen: (v: boolean) => void;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  searchFetching: boolean;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
}

export function ConversationHeader({
  conv, membersCount, otherUserPresence,
  searchOpen, setSearchOpen, searchQuery, setSearchQuery, searchFetching, searchInputRef,
}: Props) {
  const router = useRouter();
  const otherUser = conv?.otherUser;

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-white/8 shrink-0">
      {searchOpen ? (
        <>
          <Search size={14} className="text-gray-500 shrink-0" />
          <input
            ref={searchInputRef}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Escape") setSearchOpen(false); }}
            placeholder="Search messages…"
            className="flex-1 bg-transparent text-sm text-white outline-none placeholder-gray-600"
          />
          {searchFetching && <Loader2 size={13} className="animate-spin text-gray-500 shrink-0" />}
          <button
            onClick={() => setSearchOpen(false)}
            className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-white/8 rounded-lg transition-colors shrink-0"
          >
            <X size={15} />
          </button>
        </>
      ) : conv?.isGroup ? (
        <>
          <div className="relative w-8 h-8 shrink-0">
            {conv.avatar ? (
              <div className="w-8 h-8 rounded-full overflow-hidden">
                <Image src={conv.avatar} alt={conv.name ?? "Group"} width={32} height={32} className="object-cover w-full h-full" />
              </div>
            ) : conv.participants.length >= 2 ? (
              <>
                <div className="absolute bottom-0 left-0 w-5 h-5 rounded-full border border-zinc-900 overflow-hidden bg-violet-700 flex items-center justify-center">
                  {conv.participants[1]?.avatar ? (
                    <Image src={conv.participants[1].avatar} alt={conv.participants[1].username ?? "?"} width={20} height={20} className="object-cover w-full h-full" />
                  ) : (
                    <span className="text-white font-bold uppercase text-[8px] leading-none select-none">{(conv.participants[1]?.username ?? "?")[0]}</span>
                  )}
                </div>
                <div className="absolute top-0 right-0 w-5 h-5 rounded-full border border-zinc-900 overflow-hidden bg-violet-700 flex items-center justify-center">
                  {conv.participants[0]?.avatar ? (
                    <Image src={conv.participants[0].avatar} alt={conv.participants[0].username ?? "?"} width={20} height={20} className="object-cover w-full h-full" />
                  ) : (
                    <span className="text-white font-bold uppercase text-[8px] leading-none select-none">{(conv.participants[0]?.username ?? "?")[0]}</span>
                  )}
                </div>
              </>
            ) : (
              <div className="w-8 h-8 rounded-full bg-violet-700/40 flex items-center justify-center">
                <Users size={14} className="text-violet-300" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{conv.name ?? "Group"}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">{membersCount} members</p>
          </div>
          <button
            onClick={() => setSearchOpen(true)}
            title="Search messages"
            className="p-1.5 text-gray-500 hover:text-white hover:bg-white/8 rounded-lg transition-colors shrink-0"
          >
            <Search size={15} />
          </button>
        </>
      ) : otherUser ? (
        <>
          <Avatar src={otherUser.avatar} username={otherUser.username} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{otherUser.username}</p>
            {otherUserPresence?.isOnline ? (
              <p className="text-[11px] text-emerald-400 flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                Online
              </p>
            ) : otherUserPresence?.lastSeen ? (
              <p className="text-[11px] text-gray-500 mt-0.5">Active {formatDistanceToNow(otherUserPresence.lastSeen)}</p>
            ) : null}
          </div>
          <button
            onClick={() => setSearchOpen(true)}
            title="Search messages"
            className="p-1.5 text-gray-500 hover:text-white hover:bg-white/8 rounded-lg transition-colors shrink-0"
          >
            <Search size={15} />
          </button>
          <Slot
            role="link"
            tabIndex={0}
            className="p-1.5 text-gray-500 hover:text-white transition-colors cursor-pointer outline-none rounded-lg hover:bg-white/8"
            onClick={() => router.push(`/user/${otherUser.username}`)}
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === "Enter" || e.key === " ") router.push(`/user/${otherUser.username}`);
            }}
          >
            <div title="View profile"><ExternalLink size={15} /></div>
          </Slot>
        </>
      ) : (
        <div className="h-8" />
      )}
    </div>
  );
}
