export type GameStatus = "PLAYING" | "COMPLETED" | "DROPPED" | "WANT_TO_PLAY";

export interface GameReview {
  id: string;
  rating?: number | null;
  review: string;
  status: string;
  platform?: string | null;
  updatedAt: string;
  helpfulCount: number;
  helpfulByMe: boolean;
  user: { id: string; username: string; avatar?: string };
  game?: { rawgId: number; name: string; coverImage?: string | null };
}
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
  notifFollow?: boolean;
  notifLike?: boolean;
  notifComment?: boolean;
  notifMention?: boolean;
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
  description?: string;
  platforms?: string[];
  developers?: string[];
  publishers?: string[];
  website?: string;
  metacritic?: number;
  esrbRating?: string;
  avgPlaytime?: number;
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
  _count: { entries: number; likes: number; comments: number };
  entries: { game: { coverImage?: string; name: string } }[];
  likedByMe?: boolean;
}

export interface GameListDetail {
  id: string;
  name: string;
  description?: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  user: { id: string; username: string; avatar?: string };
  _count: { entries: number; likes: number; comments: number };
  likedByMe?: boolean;
  entries: {
    id: string;
    addedAt: string;
    game: Game;
  }[];
}

export interface GameListComment {
  id: string;
  body: string;
  createdAt: string;
  user: { id: string; username: string; avatar?: string };
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
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  fileType?: string | null;
  replyToId?: string | null;
  replyTo?: ChatMessageReply | null;
  reactions?: MessageReaction[];
  gameId?: string | null;
  game?: ChatMessageGame | null;
  isForwarded?: boolean;
  poll?: PollData | null;
  gameNight?: GameNightData | null;
  createdAt: string;
  sender: { id: string; username: string; avatar?: string };
}

export interface GameNightRSVPData {
  userId: string;
  status: "going" | "maybe" | "no";
  user: { id: string; username: string; avatar?: string | null };
}

export interface GameNightData {
  id: string;
  title: string;
  scheduledAt: string;
  platform?: string | null;
  note?: string | null;
  createdBy: string;
  game?: { id: string; name: string; coverImage?: string | null; rawgId: number; slug: string } | null;
  rsvps: GameNightRSVPData[];
}

export interface PollOptionData {
  id: string;
  text: string;
  order: number;
  votes: { userId: string; user?: { id: string; username: string; avatar?: string } }[];
}

export interface PollData {
  id: string;
  question: string;
  allowMultiple: boolean;
  anonymous: boolean;
  endsAt?: string | null;
  closedAt?: string | null;
  createdAt?: string;
  options: PollOptionData[];
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
  mutedUntil?: string | null;
}
