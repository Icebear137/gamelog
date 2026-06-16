import type { MyClubRequest } from "@/lib/types";

export type Sort = "newest" | "popular" | "trending";

export interface Reaction { id: string; emoji: string; userId: string }

export interface ClubPost {
  id: string; body: string; createdAt: string; updatedAt: string;
  likedByMe: boolean;
  user: { id: string; username: string; avatar?: string };
  reactions: Reaction[];
  _count: { comments: number; likes: number; reactions: number };
}

export interface ClubMember {
  id: string; role: string; isBanned: boolean; joinedAt: string;
  user: { id: string; username: string; avatar?: string; _count: { gameEntries: number } };
}

export interface GameOption { id: string; rawgId: number; name: string; coverImage?: string | null }

export interface ClubDetail {
  id: string; name: string; description?: string; genre?: string; avatar?: string | null;
  isPrivate: boolean;
  isMember: boolean; isBanned: boolean; myRole: string | null; pinnedPostId?: string | null;
  creator: { id: string; username: string; avatar?: string };
  game?: { rawgId: number; name: string; coverImage?: string } | null;
  members: ClubMember[];
  pinnedPost?: ClubPost | null;
  myRequest?: MyClubRequest | null;
  _count: { members: number; posts: number };
}

export type { MyClubRequest };
