export type GameStatus = "PLAYING" | "COMPLETED" | "DROPPED" | "WANT_TO_PLAY";
export type ActivityType = "STARTED" | "COMPLETED" | "DROPPED" | "RATED" | "ADDED_TO_WISHLIST";

export interface User {
  id: string;
  username: string;
  bio?: string;
  avatar?: string;
  steamId?: string;
  discordTag?: string;
  isPrivate?: boolean;
  createdAt: string;
  isFollowing?: boolean;
  _count: { gameEntries: number; followers: number; following: number };
}

export interface Game {
  id: string;
  rawgId: number;
  name: string;
  slug: string;
  coverImage?: string;
  genres: string[];
  releaseYear?: number;
  rawgRating?: number;
}

export type GamePlatform = "PC" | "PS5" | "PS4" | "Xbox Series X|S" | "Xbox One" | "Nintendo Switch" | "iOS/Android" | "Other";

export interface GameEntry {
  id: string;
  status: GameStatus;
  rating?: number;
  review?: string;
  playtime?: number;
  platform?: GamePlatform;
  createdAt: string;
  updatedAt: string;
  game: Game;
}

export interface Activity {
  id: string;
  type: ActivityType;
  createdAt: string;
  likedByMe: boolean;
  user: { id: string; username: string; avatar?: string };
  gameEntry: GameEntry;
  _count: { likes: number; comments: number };
}

export interface Comment {
  id: string;
  body: string;
  createdAt: string;
  user: { id: string; username: string; avatar?: string };
}

export interface GameListPreview {
  id: string;
  name: string;
  description?: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  user: { id: string; username: string; avatar?: string };
  _count: { entries: number };
  entries: { game: { coverImage?: string; name: string } }[];
}

export interface GameListDetail {
  id: string;
  name: string;
  description?: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  user: { id: string; username: string; avatar?: string };
  _count: { entries: number };
  entries: {
    id: string;
    addedAt: string;
    game: Game;
  }[];
}

export interface ChatMessageGame {
  id: string;
  rawgId: number;
  name: string;
  slug: string;
  coverImage?: string | null;
  releaseYear?: number | null;
}

/** Shallow quoted message inside a reply — no nested replyTo */
export interface ChatMessageReply {
  id: string;
  body: string;
  imageUrl?: string | null;
  imageUrls?: string | null;
  senderId: string;
  sender: { id: string; username: string; avatar?: string };
}

export interface MessageReaction {
  id: string;
  emoji: string;
  userId: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  imageUrl?: string | null;
  imageUrls?: string | null;  // JSON array e.g. '["url1","url2"]'
  audioUrl?: string | null;
  audioDuration?: number | null; // seconds
  replyToId?: string | null;
  replyTo?: ChatMessageReply | null;
  reactions?: MessageReaction[];
  gameId?: string | null;
  game?: ChatMessageGame | null;
  isForwarded?: boolean;
  createdAt: string;
  sender: { id: string; username: string; avatar?: string };
}

export interface PinnedMessage {
  id: string;
  body: string;
  imageUrl?: string | null;
  audioUrl?: string | null;
  sender: { id: string; username: string };
}

export interface GroupMember {
  id: string;
  username: string;
  avatar?: string | null;
  role: "admin" | "member";
  lastReadAt?: string | null;
}

export interface Conversation {
  id: string;
  isGroup: boolean;
  name: string | null;
  avatar: string | null;
  updatedAt: string;
  otherUser: { id: string; username: string; avatar?: string } | null;
  participants: { id: string; username: string; avatar?: string | null }[]; // group only
  lastMessage: (ChatMessage & { game?: { name: string } | null; imageUrls?: string | null }) | null;
  unreadCount: number;
}
