import multer from "multer";
import prisma from "../../lib/prisma";

// ---------------------------------------------------------------------------
// Selector constants — reused across all sub-routers
// ---------------------------------------------------------------------------

export const SENDER_SELECT = { id: true, username: true, avatar: true };

// Quoted (reply preview) select — shallow, no recursive nesting
export const REPLY_SELECT = {
  id: true,
  body: true,
  imageUrl: true,
  imageUrls: true,
  senderId: true,
  sender: { select: SENDER_SELECT },
};

// Game fields for message select
export const GAME_SELECT = {
  id: true,
  rawgId: true,
  name: true,
  slug: true,
  coverImage: true,
  releaseYear: true,
};

// Game night fields — reused by MESSAGE_SELECT and standalone game-night queries
export const GAME_NIGHT_SELECT = {
  id: true,
  title: true,
  scheduledAt: true,
  platform: true,
  note: true,
  createdBy: true,
  game: { select: { id: true, name: true, coverImage: true, rawgId: true, slug: true } },
  rsvps: {
    select: {
      userId: true,
      status: true,
      user: { select: { id: true, username: true, avatar: true } },
    },
  },
};

// Message fields selected everywhere
export const MESSAGE_SELECT = {
  id: true,
  conversationId: true,
  senderId: true,
  body: true,
  imageUrl: true,
  imageUrls: true,
  audioUrl: true,
  audioDuration: true,
  fileUrl: true,
  fileName: true,
  fileSize: true,
  fileType: true,
  isForwarded: true,
  replyToId: true,
  replyTo: { select: REPLY_SELECT },
  gameId: true,
  game: { select: GAME_SELECT },
  reactions: {
    select: { id: true, emoji: true, userId: true },
    orderBy: { createdAt: "asc" as const },
  },
  poll: {
    select: {
      id: true,
      question: true,
      allowMultiple: true,
      options: {
        select: {
          id: true,
          text: true,
          order: true,
          votes: { select: { userId: true } },
        },
        orderBy: { order: "asc" as const },
      },
    },
  },
  gameNight: { select: GAME_NIGHT_SELECT },
  createdAt: true,
  sender: { select: SENDER_SELECT },
};

// ---------------------------------------------------------------------------
// Multer instances
// ---------------------------------------------------------------------------

// Memory storage for Cloudinary upload (5 MB, images only)
export const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
});

// Memory storage for audio (10 MB, audio only)
export const uploadAudio = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("audio/")) cb(null, true);
    else cb(new Error("Only audio files are allowed"));
  },
});

// Memory storage for file attachments (25 MB, no images)
export const uploadFile = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(new Error("Use the image endpoint for images"));
    else cb(null, true);
  },
});

// ---------------------------------------------------------------------------
// Guard: ensure req.userId is a participant of conversationId
// ---------------------------------------------------------------------------
export async function requireParticipant(conversationId: string, userId: string) {
  const p = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  return p;
}
