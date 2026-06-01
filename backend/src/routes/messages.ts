import { Router, Response } from "express";
import { z } from "zod";
import multer from "multer";
import axios from "axios";
import prisma from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { emitToUser, emitToConversation } from "../lib/socket";
import { uploadToCloudinary } from "../lib/cloudinary";
import { getGameById, extractYear } from "../lib/rawg";

async function ensureGameByRawgId(rawgId: number) {
  let game = await prisma.game.findUnique({ where: { rawgId } });
  if (!game) {
    const rawgGame = await getGameById(rawgId);
    if (!rawgGame) return null;
    game = await prisma.game.upsert({
      where: { rawgId: rawgGame.id },
      create: {
        rawgId: rawgGame.id,
        name: rawgGame.name,
        slug: rawgGame.slug,
        coverImage: rawgGame.background_image,
        genres: JSON.stringify(rawgGame.genres.map((g: { name: string }) => g.name)),
        releaseYear: extractYear(rawgGame.released),
        rawgRating: rawgGame.rating,
      },
      update: {
        name: rawgGame.name,
        coverImage: rawgGame.background_image,
        rawgRating: rawgGame.rating,
      },
    });
  }
  return game;
}

const router = Router();

const MessageSchema = z.object({
  body: z.string().max(2000).trim().default(""),
  replyToId: z.string().optional(),
  gameId: z.string().optional(),
}).refine((d) => d.body.length > 0 || !!d.gameId, {
  message: "body or gameId is required",
});

// Sender select reused everywhere
const SENDER_SELECT = { id: true, username: true, avatar: true };

// Quoted (reply preview) select — shallow, no recursive nesting
const REPLY_SELECT = {
  id: true,
  body: true,
  imageUrl: true,
  imageUrls: true,
  senderId: true,
  sender: { select: SENDER_SELECT },
};

// Game fields for message select
const GAME_SELECT = {
  id: true,
  rawgId: true,
  name: true,
  slug: true,
  coverImage: true,
  releaseYear: true,
};

// Game night fields — reused by MESSAGE_SELECT and standalone game-night queries
const GAME_NIGHT_SELECT = {
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
const MESSAGE_SELECT = {
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

// Multer — memory storage for Cloudinary upload (5 MB, images only)
const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
});

// Multer — memory storage for audio (10 MB, audio only)
const uploadAudio = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("audio/")) cb(null, true);
    else cb(new Error("Only audio files are allowed"));
  },
});

// Multer — memory storage for file attachments (25 MB, no images)
const uploadFile = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(new Error("Use the image endpoint for images"));
    else cb(null, true);
  },
});

/** Guard: ensure req.userId is a participant of conversationId */
async function requireParticipant(conversationId: string, userId: string) {
  const p = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  return p;
}

// ---------------------------------------------------------------------------
// GET /api/messages/conversations
// List my conversations sorted by most recent message (updatedAt desc)
// ---------------------------------------------------------------------------
router.get("/conversations", requireAuth, async (req: AuthRequest, res: Response) => {
  const myId = req.userId!;

  const participants = await prisma.conversationParticipant.findMany({
    where: { userId: myId },
    include: {
      conversation: {
        include: {
          // For groups: all participants except me; for DMs: already the other person
          participants: {
            where: { userId: { not: myId } },
            include: { user: { select: SENDER_SELECT } },
          },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              id: true,
              body: true,
              imageUrl: true,
              imageUrls: true,
              audioUrl: true,
              gameId: true,
              game: { select: { name: true } },
              senderId: true,
              createdAt: true,
              sender: { select: SENDER_SELECT },
            },
          },
          _count: { select: { messages: true } },
        },
      },
    },
    orderBy: { conversation: { updatedAt: "desc" } },
  });

  const result = await Promise.all(
    participants.map(async (p) => {
      const conv = p.conversation;

      const unreadCount = await prisma.message.count({
        where: {
          conversationId: conv.id,
          createdAt: { gt: p.lastReadAt },
          senderId: { not: myId },
        },
      });

      return {
        id: conv.id,
        isGroup: conv.isGroup,
        name: conv.name ?? null,
        avatar: conv.avatar ?? null,
        updatedAt: conv.updatedAt,
        // DM: first other participant; group: null (use participants array)
        otherUser: conv.isGroup ? null : (conv.participants[0]?.user ?? null),
        // Group: all other participants (for avatar stack)
        participants: conv.isGroup
          ? conv.participants.map((cp) => ({ id: cp.user.id, username: cp.user.username, avatar: cp.user.avatar }))
          : [],
        lastMessage: conv.messages[0] ?? null,
        unreadCount,
        mutedUntil: p.mutedUntil ?? null,
      };
    })
  );

  res.json(result);
});

// ---------------------------------------------------------------------------
// POST /api/messages/conversations
// Find or create a 1-on-1 DM with { recipientId }
// ---------------------------------------------------------------------------
router.post("/conversations", requireAuth, async (req: AuthRequest, res: Response) => {
  const myId = req.userId!;
  const { recipientId } = req.body;

  if (!recipientId || typeof recipientId !== "string") {
    res.status(400).json({ error: "recipientId is required" });
    return;
  }
  if (recipientId === myId) {
    res.status(400).json({ error: "Cannot DM yourself" });
    return;
  }

  const recipient = await prisma.user.findUnique({ where: { id: recipientId } });
  if (!recipient) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  // Find existing conversation shared by exactly these 2 users
  const existing = await prisma.conversation.findFirst({
    where: {
      AND: [
        { participants: { some: { userId: myId } } },
        { participants: { some: { userId: recipientId } } },
      ],
    },
    include: {
      participants: { select: { userId: true } },
    },
  });

  // Make sure it's exactly a 2-person conversation (not accidentally a group)
  const exactMatch = existing?.participants.length === 2 ? existing : null;

  if (exactMatch) {
    res.json({ id: exactMatch.id });
    return;
  }

  // Create new conversation with both participants
  const conv = await prisma.conversation.create({
    data: {
      participants: {
        create: [{ userId: myId }, { userId: recipientId }],
      },
    },
  });

  res.status(201).json({ id: conv.id });
});

// ---------------------------------------------------------------------------
// POST /api/messages/conversations/group
// Create a group conversation { name, memberIds: string[] }
// ---------------------------------------------------------------------------
router.post("/conversations/group", requireAuth, async (req: AuthRequest, res: Response) => {
  const myId = req.userId!;
  const { name, memberIds } = req.body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    res.status(400).json({ error: "Group name is required" });
    return;
  }
  if (!Array.isArray(memberIds) || memberIds.length < 1) {
    res.status(400).json({ error: "At least 1 other member is required" });
    return;
  }
  if (memberIds.length > 49) {
    res.status(400).json({ error: "Max 50 members" });
    return;
  }

  // Deduplicate + exclude self
  const uniqueIds = [...new Set((memberIds as string[]).filter((id) => id !== myId))];

  // Verify all members exist
  const users = await prisma.user.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true },
  });
  if (users.length !== uniqueIds.length) {
    res.status(400).json({ error: "One or more members not found" });
    return;
  }

  const conv = await prisma.conversation.create({
    data: {
      isGroup: true,
      name: name.trim().slice(0, 64),
      participants: {
        create: [
          { userId: myId, role: "admin" },
          ...uniqueIds.map((id) => ({ userId: id, role: "member" })),
        ],
      },
    },
  });

  // Notify all members they were added to a group
  uniqueIds.forEach((uid) => emitToUser(uid, "new_group", { conversationId: conv.id }));

  res.status(201).json({ id: conv.id });
});

// ---------------------------------------------------------------------------
// PATCH /api/messages/conversations/:id/group
// Update group name / avatar (admin only)
// ---------------------------------------------------------------------------
router.patch("/conversations/:id/group", requireAuth, async (req: AuthRequest, res: Response) => {
  const myId = req.userId!;
  const conversationId = String(req.params.id);

  const participant = await requireParticipant(conversationId, myId);
  if (!participant) { res.status(403).json({ error: "Forbidden" }); return; }
  if (participant.role !== "admin") { res.status(403).json({ error: "Only admins can edit group info" }); return; }

  const { name, avatar } = req.body;
  const data: Record<string, string> = {};
  if (typeof name === "string" && name.trim()) data.name = name.trim().slice(0, 64);
  if (typeof avatar === "string") data.avatar = avatar;

  const updated = await prisma.conversation.update({
    where: { id: conversationId },
    data,
    select: { id: true, name: true, avatar: true },
  });

  emitToConversation(conversationId, "group_updated", updated);
  res.json(updated);
});

// ---------------------------------------------------------------------------
// POST /api/messages/conversations/:id/avatar
// Upload group avatar image (admin only)
// ---------------------------------------------------------------------------
router.post("/conversations/:id/avatar", requireAuth, (req: AuthRequest, res: Response) => {
  const myId = req.userId!;
  const conversationId = String(req.params.id);

  uploadImage.single("avatar")(req as any, res as any, async (err: any) => {
    if (err) { res.status(400).json({ error: err.message ?? "Upload failed" }); return; }
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) { res.status(400).json({ error: "No file provided" }); return; }

    try {
      const participant = await requireParticipant(conversationId, myId);
      if (!participant) { res.status(403).json({ error: "Forbidden" }); return; }
      if (participant.role !== "admin") { res.status(403).json({ error: "Only admins can change group avatar" }); return; }

      const { url: avatarUrl } = await uploadToCloudinary(file.buffer, {
        folder: "gamelog/groups",
        public_id: `group_${conversationId}`,
        transformation: [
          { width: 256, height: 256, crop: "fill", gravity: "center" },
          { fetch_format: "auto", quality: "auto" },
        ],
      });

      const updated = await prisma.conversation.update({
        where: { id: conversationId },
        data: { avatar: avatarUrl },
        select: { id: true, name: true, avatar: true },
      });

      emitToConversation(conversationId, "group_updated", updated);
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ error: e?.message ?? "Upload failed" });
    }
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/messages/conversations/:id/members/:userId/role
// Promote or demote a member (admin only; sole admin cannot demote themselves)
// ---------------------------------------------------------------------------
router.patch("/conversations/:id/members/:userId/role", requireAuth, async (req: AuthRequest, res: Response) => {
  const myId = req.userId!;
  const conversationId = String(req.params.id);
  const targetId = String(req.params.userId);
  const { role } = req.body;

  if (role !== "admin" && role !== "member") {
    res.status(400).json({ error: "role must be 'admin' or 'member'" });
    return;
  }

  const [myPart, conv] = await Promise.all([
    requireParticipant(conversationId, myId),
    prisma.conversation.findUnique({ where: { id: conversationId }, select: { isGroup: true } }),
  ]);

  if (!myPart) { res.status(403).json({ error: "Forbidden" }); return; }
  if (myPart.role !== "admin") { res.status(403).json({ error: "Only admins can change roles" }); return; }
  if (!conv?.isGroup) { res.status(400).json({ error: "Not a group conversation" }); return; }

  // Prevent sole admin from demoting themselves
  if (targetId === myId && role === "member") {
    const adminCount = await prisma.conversationParticipant.count({
      where: { conversationId, role: "admin" },
    });
    if (adminCount <= 1) {
      res.status(400).json({ error: "Cannot demote: you are the only admin" });
      return;
    }
  }

  await prisma.conversationParticipant.update({
    where: { conversationId_userId: { conversationId, userId: targetId } },
    data: { role },
  });

  emitToConversation(conversationId, "member_role_changed", { conversationId, userId: targetId, role });
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// GET /api/messages/conversations/:id/nicknames
// Returns all set nicknames for this conversation
// ---------------------------------------------------------------------------
router.get("/conversations/:id/nicknames", requireAuth, async (req: AuthRequest, res: Response) => {
  const myId = req.userId!;
  const conversationId = String(req.params.id);

  const participant = await requireParticipant(conversationId, myId);
  if (!participant) { res.status(403).json({ error: "Forbidden" }); return; }

  const nicknames = await prisma.conversationNickname.findMany({
    where: { conversationId },
    select: { userId: true, nickname: true },
  });

  res.json(nicknames);
});

// ---------------------------------------------------------------------------
// PUT /api/messages/conversations/:id/nicknames/:userId
// Set (or clear) a nickname for a member — any participant can do this
// ---------------------------------------------------------------------------
router.put("/conversations/:id/nicknames/:userId", requireAuth, async (req: AuthRequest, res: Response) => {
  const myId = req.userId!;
  const conversationId = String(req.params.id);
  const targetUserId = String(req.params.userId);
  const { nickname } = req.body;

  const participant = await requireParticipant(conversationId, myId);
  if (!participant) { res.status(403).json({ error: "Forbidden" }); return; }

  // Verify target user is a member of this conversation
  const targetParticipant = await requireParticipant(conversationId, targetUserId);
  if (!targetParticipant) { res.status(404).json({ error: "User not in this conversation" }); return; }

  // Empty / missing nickname = clear it
  if (!nickname || typeof nickname !== "string" || nickname.trim().length === 0) {
    await prisma.conversationNickname.deleteMany({
      where: { conversationId, userId: targetUserId },
    });
    emitToConversation(conversationId, "nickname_updated", { conversationId, userId: targetUserId, nickname: null });
    res.json({ ok: true });
    return;
  }

  if (nickname.trim().length > 50) {
    res.status(400).json({ error: "Nickname must be 50 characters or less" });
    return;
  }

  const saved = await prisma.conversationNickname.upsert({
    where: { conversationId_userId: { conversationId, userId: targetUserId } },
    create: { conversationId, userId: targetUserId, nickname: nickname.trim() },
    update: { nickname: nickname.trim() },
  });

  emitToConversation(conversationId, "nickname_updated", { conversationId, userId: targetUserId, nickname: saved.nickname });
  res.json(saved);
});

// ---------------------------------------------------------------------------
// POST /api/messages/conversations/:id/members
// Add a member to a group (admin only)
// ---------------------------------------------------------------------------
router.post("/conversations/:id/members", requireAuth, async (req: AuthRequest, res: Response) => {
  const myId = req.userId!;
  const conversationId = String(req.params.id);
  const { userId } = req.body;

  if (!userId || typeof userId !== "string") { res.status(400).json({ error: "userId is required" }); return; }

  const participant = await requireParticipant(conversationId, myId);
  if (!participant) { res.status(403).json({ error: "Forbidden" }); return; }
  if (participant.role !== "admin") { res.status(403).json({ error: "Only admins can add members" }); return; }

  const conv = await prisma.conversation.findUnique({ where: { id: conversationId }, select: { isGroup: true } });
  if (!conv?.isGroup) { res.status(400).json({ error: "Not a group conversation" }); return; }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, username: true, avatar: true } });
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  await prisma.conversationParticipant.upsert({
    where: { conversationId_userId: { conversationId, userId } },
    create: { conversationId, userId, role: "member" },
    update: {}, // already a member — no-op
  });

  emitToConversation(conversationId, "member_added", { conversationId, user });
  emitToUser(userId, "new_group", { conversationId });
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// DELETE /api/messages/conversations/:id/members/:userId
// Remove a member (admin removes others, any member can remove themselves to leave)
// ---------------------------------------------------------------------------
router.delete("/conversations/:id/members/:userId", requireAuth, async (req: AuthRequest, res: Response) => {
  const myId = req.userId!;
  const conversationId = String(req.params.id);
  const targetId = String(req.params.userId);

  const [myPart, conv] = await Promise.all([
    requireParticipant(conversationId, myId),
    prisma.conversation.findUnique({ where: { id: conversationId }, select: { isGroup: true } }),
  ]);

  if (!myPart) { res.status(403).json({ error: "Forbidden" }); return; }
  if (!conv?.isGroup) { res.status(400).json({ error: "Not a group conversation" }); return; }

  const isSelf = targetId === myId;
  if (!isSelf && myPart.role !== "admin") {
    res.status(403).json({ error: "Only admins can remove other members" });
    return;
  }

  // Prevent removing the last admin from the group
  const targetPart = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId: targetId } },
    select: { role: true },
  });
  if (targetPart?.role === "admin") {
    const adminCount = await prisma.conversationParticipant.count({
      where: { conversationId, role: "admin" },
    });
    if (adminCount <= 1) {
      res.status(400).json({ error: "Cannot remove the only admin" });
      return;
    }
  }

  await prisma.conversationParticipant.deleteMany({
    where: { conversationId, userId: targetId },
  });

  emitToConversation(conversationId, "member_removed", { conversationId, userId: targetId });
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// GET /api/messages/conversations/:id
// Load messages (cursor-based: ?before=<msgId>&limit=30)
// ---------------------------------------------------------------------------
router.get("/conversations/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  const myId = req.userId!;
  const id = String(req.params.id);
  const limit = Math.min(parseInt(String(req.query.limit ?? "30")), 50);
  const before = req.query.before ? String(req.query.before) : undefined;

  const participant = await requireParticipant(id, myId);
  if (!participant) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  // Resolve cursor createdAt before the parallel query
  let cursorDate: Date | undefined;
  if (before) {
    const cursorMsg = await prisma.message.findUnique({ where: { id: before }, select: { createdAt: true } });
    if (!cursorMsg) {
      res.status(400).json({ error: "Invalid cursor" });
      return;
    }
    cursorDate = cursorMsg.createdAt;
  }

  const [messagesDesc, otherParticipant, conversation] = await Promise.all([
    prisma.message.findMany({
      where: {
        conversationId: id,
        ...(cursorDate ? { createdAt: { lt: cursorDate } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: MESSAGE_SELECT,
    }),
    // Lấy lastReadAt của người kia để hiển thị "Seen" (DM only)
    prisma.conversationParticipant.findFirst({
      where: { conversationId: id, userId: { not: myId } },
      select: { lastReadAt: true },
    }),
    // Group info + all participants + pinned message
    prisma.conversation.findUnique({
      where: { id },
      select: {
        isGroup: true,
        name: true,
        avatar: true,
        participants: {
          include: { user: { select: { id: true, username: true, avatar: true } } },
        },
        pinnedMessage: {
          select: {
            id: true,
            body: true,
            imageUrl: true,
            audioUrl: true,
            sender: { select: { id: true, username: true } },
          },
        },
      },
    }),
  ]);

  res.json({
    messages: messagesDesc.reverse(),
    otherUserLastReadAt: otherParticipant?.lastReadAt ?? null,
    isGroup: conversation?.isGroup ?? false,
    groupName: conversation?.name ?? null,
    groupAvatar: conversation?.avatar ?? null,
    pinnedMessage: conversation?.pinnedMessage ?? null,
    members: conversation?.participants.map((cp) => ({
      id: cp.user.id,
      username: cp.user.username,
      avatar: cp.user.avatar,
      role: cp.role,
      lastReadAt: cp.lastReadAt.toISOString(),
    })) ?? [],
  });
});

// ---------------------------------------------------------------------------
// PUT /api/messages/conversations/:id/mute
// Mute notifications for this conversation
// Body: { duration: "1h" | "8h" | "1w" | "always" | null }  (null = unmute)
// ---------------------------------------------------------------------------
router.put("/conversations/:id/mute", requireAuth, async (req: AuthRequest, res: Response) => {
  const myId = req.userId!;
  const conversationId = String(req.params.id);
  const { duration } = req.body as { duration: "1h" | "8h" | "1w" | "always" | null };

  const participant = await requireParticipant(conversationId, myId);
  if (!participant) { res.status(403).json({ error: "Forbidden" }); return; }

  let mutedUntil: Date | null = null;
  if (duration === "1h")     mutedUntil = new Date(Date.now() + 60 * 60 * 1000);
  else if (duration === "8h") mutedUntil = new Date(Date.now() + 8 * 60 * 60 * 1000);
  else if (duration === "1w") mutedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  else if (duration === "always") mutedUntil = new Date("2099-01-01T00:00:00Z");
  // null → unmute (mutedUntil stays null)

  await prisma.conversationParticipant.update({
    where: { conversationId_userId: { conversationId, userId: myId } },
    data: { mutedUntil },
  });

  res.json({ mutedUntil });
});

// ---------------------------------------------------------------------------
// POST /api/messages/conversations/:id/pin
// Pin or unpin a message — groups: admin only; DMs: any participant
// Body: { messageId: string | null }
// ---------------------------------------------------------------------------
router.post("/conversations/:id/pin", requireAuth, async (req: AuthRequest, res: Response) => {
  const myId = req.userId!;
  const conversationId = String(req.params.id);
  const { messageId } = req.body;

  const [participant, conv] = await Promise.all([
    requireParticipant(conversationId, myId),
    prisma.conversation.findUnique({ where: { id: conversationId }, select: { isGroup: true } }),
  ]);

  if (!participant) { res.status(403).json({ error: "Forbidden" }); return; }
  if (!conv) { res.status(404).json({ error: "Conversation not found" }); return; }
  if (conv.isGroup && participant.role !== "admin") {
    res.status(403).json({ error: "Only admins can pin messages" }); return;
  }

  let pinnedMessage = null;
  if (messageId && typeof messageId === "string") {
    const msg = await prisma.message.findFirst({
      where: { id: messageId, conversationId },
      select: {
        id: true, body: true, imageUrl: true, audioUrl: true,
        sender: { select: { id: true, username: true } },
      },
    });
    if (!msg) { res.status(404).json({ error: "Message not found" }); return; }
    if (msg.body === "[deleted]") { res.status(400).json({ error: "Cannot pin a deleted message" }); return; }
    pinnedMessage = msg;
  }

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { pinnedMessageId: (messageId as string | null) ?? null },
  });

  emitToConversation(conversationId, "message_pinned", { conversationId, pinnedMessage });
  res.json({ pinnedMessage });
});

// ---------------------------------------------------------------------------
// POST /api/messages/conversations/:id
// Send a message
// ---------------------------------------------------------------------------
router.post("/conversations/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  const myId = req.userId!;
  const conversationId = String(req.params.id);

  const participant = await requireParticipant(conversationId, myId);
  if (!participant) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const parsed = MessageSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  // Validate replyToId belongs to this conversation (if provided)
  if (parsed.data.replyToId) {
    const replyMsg = await prisma.message.findUnique({
      where: { id: parsed.data.replyToId },
      select: { conversationId: true },
    });
    if (!replyMsg || replyMsg.conversationId !== conversationId) {
      res.status(400).json({ error: "Invalid replyToId" });
      return;
    }
  }

  // Validate gameId exists (if provided)
  if (parsed.data.gameId) {
    const game = await prisma.game.findUnique({ where: { id: parsed.data.gameId }, select: { id: true } });
    if (!game) {
      res.status(404).json({ error: "Game not found" });
      return;
    }
  }

  const message = await prisma.message.create({
    data: {
      conversationId,
      senderId: myId,
      body: parsed.data.body,
      ...(parsed.data.replyToId ? { replyToId: parsed.data.replyToId } : {}),
      ...(parsed.data.gameId ? { gameId: parsed.data.gameId } : {}),
    },
    select: MESSAGE_SELECT,
  });

  // Bump conversation updatedAt so inbox sorts correctly
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

  // Find recipient (the other participant)
  const other = await prisma.conversationParticipant.findFirst({
    where: { conversationId, userId: { not: myId } },
  });

  const payload = { conversationId, message };

  // Emit to conversation room (both users if both have the chat page open)
  emitToConversation(conversationId, "new_message", payload);

  // Also emit to recipient's personal room (for inbox badge when chat not open)
  if (other) {
    emitToUser(other.userId, "new_message", { conversationId });
  }

  res.status(201).json(message);
});

// ---------------------------------------------------------------------------
// PUT /api/messages/conversations/:id/read
// Mark conversation as read (update my lastReadAt)
// ---------------------------------------------------------------------------
router.put("/conversations/:id/read", requireAuth, async (req: AuthRequest, res: Response) => {
  const myId = req.userId!;
  const conversationId = String(req.params.id);

  const participant = await requireParticipant(conversationId, myId);
  if (!participant) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const readAt = new Date();

  await prisma.conversationParticipant.update({
    where: { conversationId_userId: { conversationId, userId: myId } },
    data: { lastReadAt: readAt },
  });

  // Notify conversation members: who read + when (used for avatar seen stack)
  emitToConversation(conversationId, "read_receipt", {
    conversationId,
    userId: myId,
    readAt: readAt.toISOString(),
  });

  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// GET /api/messages/unread-count
// Total conversations with at least 1 unread message
// ---------------------------------------------------------------------------
router.get("/unread-count", requireAuth, async (req: AuthRequest, res: Response) => {
  const myId = req.userId!;

  const myParticipants = await prisma.conversationParticipant.findMany({
    where: { userId: myId },
    select: { conversationId: true, lastReadAt: true },
  });

  let count = 0;
  await Promise.all(
    myParticipants.map(async (p) => {
      const hasUnread = await prisma.message.count({
        where: {
          conversationId: p.conversationId,
          createdAt: { gt: p.lastReadAt },
          senderId: { not: myId },
        },
      });
      if (hasUnread > 0) count++;
    })
  );

  res.json({ count });
});

// ---------------------------------------------------------------------------
// POST /api/messages/conversations/:id/image
// Send an image message (upload to Cloudinary, optional text caption)
// ---------------------------------------------------------------------------
router.post("/conversations/:id/image", requireAuth, (req: AuthRequest, res: Response) => {
  const myId = req.userId!;
  const conversationId = String(req.params.id);

  uploadImage.single("image")(req as any, res as any, async (err) => {
    if (err) {
      res.status(400).json({ error: err.message ?? "Upload failed" });
      return;
    }

    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) {
      res.status(400).json({ error: "No image file provided" });
      return;
    }

    const participant = await requireParticipant(conversationId, myId);
    if (!participant) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    // Optional caption (max 500 chars)
    const caption = typeof req.body.caption === "string"
      ? req.body.caption.trim().slice(0, 500)
      : "";

    // Optional replyToId
    const replyToId = typeof req.body.replyToId === "string" ? req.body.replyToId : undefined;
    if (replyToId) {
      const replyMsg = await prisma.message.findUnique({
        where: { id: replyToId },
        select: { conversationId: true },
      });
      if (!replyMsg || replyMsg.conversationId !== conversationId) {
        res.status(400).json({ error: "Invalid replyToId" });
        return;
      }
    }

    try {
      const { url: imageUrl } = await uploadToCloudinary(file.buffer, {
        folder: "gamelog/messages",
      });

      const message = await prisma.message.create({
        data: {
          conversationId,
          senderId: myId,
          body: caption,
          imageUrl,
          ...(replyToId ? { replyToId } : {}),
        },
        select: MESSAGE_SELECT,
      });

      await prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      const other = await prisma.conversationParticipant.findFirst({
        where: { conversationId, userId: { not: myId } },
      });

      const payload = { conversationId, message };
      emitToConversation(conversationId, "new_message", payload);
      if (other) emitToUser(other.userId, "new_message", { conversationId });

      res.status(201).json(message);
    } catch (e: any) {
      res.status(500).json({ error: e?.message ?? "Upload failed" });
    }
  });
});

// ---------------------------------------------------------------------------
// POST /api/messages/conversations/:id/images
// Send 1-10 images in a single message (parallel Cloudinary upload)
// 1 image  → stored in imageUrl  (backward-compat with old single-image format)
// 2+ images → stored in imageUrls (JSON array)
// ---------------------------------------------------------------------------
router.post("/conversations/:id/images", requireAuth, (req: AuthRequest, res: Response) => {
  const myId = req.userId!;
  const conversationId = String(req.params.id);

  uploadImage.array("images", 10)(req as any, res as any, async (err) => {
    if (err) {
      res.status(400).json({ error: err.message ?? "Upload failed" });
      return;
    }

    const files = (req as any).files as Express.Multer.File[] | undefined;
    if (!files || files.length === 0) {
      res.status(400).json({ error: "No images provided" });
      return;
    }

    const participant = await requireParticipant(conversationId, myId);
    if (!participant) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const caption = typeof req.body.caption === "string"
      ? req.body.caption.trim().slice(0, 500)
      : "";

    const replyToId = typeof req.body.replyToId === "string" ? req.body.replyToId : undefined;
    if (replyToId) {
      const replyMsg = await prisma.message.findUnique({
        where: { id: replyToId },
        select: { conversationId: true },
      });
      if (!replyMsg || replyMsg.conversationId !== conversationId) {
        res.status(400).json({ error: "Invalid replyToId" });
        return;
      }
    }

    try {
      // Upload all files to Cloudinary in parallel
      const results = await Promise.all(
        files.map((f) => uploadToCloudinary(f.buffer, { folder: "gamelog/messages" }))
      );
      const urls = results.map((r) => r.url);

      // 1 image → imageUrl (compat); 2+ → imageUrls JSON
      const imageData = urls.length === 1
        ? { imageUrl: urls[0] }
        : { imageUrls: JSON.stringify(urls) };

      const message = await prisma.message.create({
        data: {
          conversationId,
          senderId: myId,
          body: caption,
          ...imageData,
          ...(replyToId ? { replyToId } : {}),
        },
        select: MESSAGE_SELECT,
      });

      await prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      const other = await prisma.conversationParticipant.findFirst({
        where: { conversationId, userId: { not: myId } },
      });

      const payload = { conversationId, message };
      emitToConversation(conversationId, "new_message", payload);
      if (other) emitToUser(other.userId, "new_message", { conversationId });

      res.status(201).json(message);
    } catch (e: any) {
      res.status(500).json({ error: e?.message ?? "Upload failed" });
    }
  });
});

// ---------------------------------------------------------------------------
// POST /api/messages/conversations/:id/audio
// Send a voice message (upload webm/ogg to Cloudinary as raw/video resource)
// Body (multipart): audio file + optional duration (seconds)
// ---------------------------------------------------------------------------
router.post("/conversations/:id/audio", requireAuth, (req: AuthRequest, res: Response) => {
  const myId = req.userId!;
  const conversationId = String(req.params.id);

  uploadAudio.single("audio")(req as any, res as any, async (err) => {
    if (err) {
      res.status(400).json({ error: err.message ?? "Upload failed" });
      return;
    }

    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) {
      res.status(400).json({ error: "No audio file provided" });
      return;
    }

    const participant = await requireParticipant(conversationId, myId);
    if (!participant) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const audioDuration = typeof req.body.duration === "string"
      ? Math.max(1, Math.round(parseFloat(req.body.duration)))
      : null;

    try {
      const { url: audioUrl } = await uploadToCloudinary(file.buffer, {
        folder: "gamelog/audio",
        resourceType: "video", // Cloudinary uses "video" resource_type for audio files
      });

      const message = await prisma.message.create({
        data: {
          conversationId,
          senderId: myId,
          body: "",
          audioUrl,
          ...(audioDuration ? { audioDuration } : {}),
        },
        select: MESSAGE_SELECT,
      });

      await prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      const other = await prisma.conversationParticipant.findFirst({
        where: { conversationId, userId: { not: myId } },
      });

      const payload = { conversationId, message };
      emitToConversation(conversationId, "new_message", payload);
      if (other) emitToUser(other.userId, "new_message", { conversationId });

      res.status(201).json(message);
    } catch (e: any) {
      res.status(500).json({ error: e?.message ?? "Upload failed" });
    }
  });
});

// ---------------------------------------------------------------------------
// POST /api/messages/conversations/:id/files
// Send a file attachment (PDF, ZIP, DOCX, etc.) — NOT for images
// ---------------------------------------------------------------------------
router.post("/conversations/:id/files", requireAuth, (req: AuthRequest, res: Response) => {
  const myId = req.userId!;
  const conversationId = String(req.params.id);

  uploadFile.single("file")(req as any, res as any, async (err) => {
    if (err) {
      res.status(400).json({ error: err.message ?? "Upload failed" });
      return;
    }

    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) {
      res.status(400).json({ error: "No file provided" });
      return;
    }

    const participant = await requireParticipant(conversationId, myId);
    if (!participant) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    try {
      const { url: fileUrl } = await uploadToCloudinary(file.buffer, {
        folder: "gamelog/files",
        resourceType: "auto",
      });

      const message = await prisma.message.create({
        data: {
          conversationId,
          senderId: myId,
          body: "",
          fileUrl,
          fileName: Buffer.from(file.originalname, "latin1").toString("utf8"),
          fileSize: file.size,
          fileType: file.mimetype,
        },
        select: MESSAGE_SELECT,
      });

      await prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      const other = await prisma.conversationParticipant.findFirst({
        where: { conversationId, userId: { not: myId } },
      });

      const payload = { conversationId, message };
      emitToConversation(conversationId, "new_message", payload);
      if (other) emitToUser(other.userId, "new_message", { conversationId });

      res.status(201).json(message);
    } catch (e: any) {
      res.status(500).json({ error: e?.message ?? "Upload failed" });
    }
  });
});

// ---------------------------------------------------------------------------
// GET /api/messages/conversations/:id/files
// List all file attachment messages in a conversation
// ---------------------------------------------------------------------------
router.get("/conversations/:id/files", requireAuth, async (req: AuthRequest, res: Response) => {
  const myId = req.userId!;
  const conversationId = String(req.params.id);

  const participant = await requireParticipant(conversationId, myId);
  if (!participant) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const files = await prisma.message.findMany({
    where: { conversationId, fileUrl: { not: null } },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      fileUrl: true,
      fileName: true,
      fileSize: true,
      fileType: true,
      createdAt: true,
      sender: { select: { id: true, username: true, avatar: true } },
    },
  });

  res.json(files);
});

// ---------------------------------------------------------------------------
// GET /api/messages/conversations/:id/images
// List all image messages in a conversation (single + multi-image)
// ---------------------------------------------------------------------------
router.get("/conversations/:id/images", requireAuth, async (req: AuthRequest, res: Response) => {
  const myId = req.userId!;
  const conversationId = String(req.params.id);

  const participant = await requireParticipant(conversationId, myId);
  if (!participant) { res.status(403).json({ error: "Forbidden" }); return; }

  const messages = await prisma.message.findMany({
    where: {
      conversationId,
      OR: [{ imageUrl: { not: null } }, { imageUrls: { not: null } }],
    },
    orderBy: { createdAt: "desc" },
    take: 60,
    select: { id: true, imageUrl: true, imageUrls: true, createdAt: true },
  });

  // Flatten single + multi-image into one list of URLs
  const images: { url: string; messageId: string }[] = [];
  for (const msg of messages) {
    if (msg.imageUrls) {
      try {
        const urls: string[] = JSON.parse(msg.imageUrls);
        urls.forEach((url) => images.push({ url, messageId: msg.id }));
      } catch { /* ignore */ }
    } else if (msg.imageUrl) {
      images.push({ url: msg.imageUrl, messageId: msg.id });
    }
  }

  res.json(images);
});

// ---------------------------------------------------------------------------
// DELETE /api/messages/conversations/:id/messages/:msgId
// Soft-delete own message (replace body with "[deleted]")
// ---------------------------------------------------------------------------
router.delete(
  "/conversations/:id/messages/:msgId",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const myId = req.userId!;
    const conversationId = String(req.params.id);
    const msgId = String(req.params.msgId);

    const participant = await requireParticipant(conversationId, myId);
    if (!participant) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const message = await prisma.message.findUnique({ where: { id: msgId } });
    if (!message || message.conversationId !== conversationId) {
      res.status(404).json({ error: "Message not found" });
      return;
    }
    if (message.senderId !== myId) {
      res.status(403).json({ error: "Cannot delete someone else's message" });
      return;
    }

    await prisma.message.update({
      where: { id: msgId },
      data: { body: "[deleted]" },
    });

    // Clear pin if this was the pinned message
    const deletedConv = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { pinnedMessageId: true },
    });
    if (deletedConv?.pinnedMessageId === msgId) {
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { pinnedMessageId: null },
      });
      emitToConversation(conversationId, "message_pinned", { conversationId, pinnedMessage: null });
    }

    // Notify both sides so they refresh
    emitToConversation(conversationId, "message_deleted", { conversationId, msgId });

    res.json({ ok: true });
  }
);

// ---------------------------------------------------------------------------
// GET /api/messages/conversations/:id/search?q=...
// Full-text search within a conversation (body only, excludes deleted)
// ---------------------------------------------------------------------------
router.get("/conversations/:id/search", requireAuth, async (req: AuthRequest, res: Response) => {
  const myId = req.userId!;
  const id = String(req.params.id);
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";

  if (q.length < 2) {
    res.json([]);
    return;
  }

  const participant = await requireParticipant(id, myId);
  if (!participant) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const messages = await prisma.message.findMany({
    where: {
      conversationId: id,
      body: { contains: q },
      NOT: { body: "[deleted]" },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: MESSAGE_SELECT,
  });

  res.json(messages);
});

// ---------------------------------------------------------------------------
// GET /api/messages/link-preview?url=...
// Fetch OG/Twitter metadata for a URL (server-side to avoid CORS)
// ---------------------------------------------------------------------------
router.get("/link-preview", requireAuth, async (req: AuthRequest, res: Response) => {
  const rawUrl = typeof req.query.url === "string" ? req.query.url.trim() : "";

  // Validate URL
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    res.status(400).json({ error: "Invalid URL" });
    return;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    res.status(400).json({ error: "Only HTTP/HTTPS URLs supported" });
    return;
  }

  // SSRF protection — block private/loopback addresses
  const h = parsed.hostname.toLowerCase();
  const p = h.split(".").map(Number);
  const isPrivate =
    h === "localhost" || h === "127.0.0.1" || h === "::1" ||
    p[0] === 10 ||
    (p[0] === 172 && p[1] >= 16 && p[1] <= 31) ||
    (p[0] === 192 && p[1] === 168) ||
    (p[0] === 169 && p[1] === 254);
  if (isPrivate) {
    res.status(400).json({ error: "Private URLs not allowed" });
    return;
  }

  try {
    const { data: html } = await axios.get<string>(rawUrl, {
      timeout: 8000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
      },
      responseType: "text",
      maxRedirects: 5,
      maxContentLength: 1024 * 1024, // 1 MB max
      decompress: true,
    });

    // Parse a meta tag value — tries both attribute orders, handles spaces & entities
    function getMeta(...selectors: string[]): string | null {
      const decode = (s: string) =>
        s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
          .replace(/&#x27;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
      for (const sel of selectors) {
        for (const re of [
          // property/name before content
          new RegExp(`<meta[\\s\\S]*?(?:property|name)\\s*=\\s*["']${sel}["'][\\s\\S]*?content\\s*=\\s*["']([^"']*?)["']`, "i"),
          // content before property/name
          new RegExp(`<meta[\\s\\S]*?content\\s*=\\s*["']([^"']*?)["'][\\s\\S]*?(?:property|name)\\s*=\\s*["']${sel}["']`, "i"),
        ]) {
          const m = html.match(re);
          if (m?.[1]) return decode(m[1]);
        }
      }
      return null;
    }

    const titleTagMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const titleTag = titleTagMatch?.[1]?.replace(/&amp;/g, "&").trim() ?? null;

    const title = getMeta("og:title", "twitter:title") ?? titleTag;
    const description = getMeta("og:description", "twitter:description");
    let image = getMeta("og:image", "twitter:image:src", "twitter:image");
    const siteName = getMeta("og:site_name") ?? parsed.hostname.replace(/^www\./, "");

    // Resolve relative image URLs against the page origin
    if (image && !image.startsWith("http")) {
      try { image = new URL(image, rawUrl).href; } catch { image = null; }
    }

    if (!title) {
      res.status(422).json({ error: "No preview available" });
      return;
    }

    res.json({ url: rawUrl, title, description, image, siteName });
  } catch {
    res.status(422).json({ error: "Could not fetch preview" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/messages/games?q=...
// Search games in local DB for the game-share picker (returns DB id)
// ---------------------------------------------------------------------------
router.get("/games", requireAuth, async (req: AuthRequest, res: Response) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (!q) {
    res.json([]);
    return;
  }

  const games = await prisma.game.findMany({
    where: { name: { contains: q } },
    select: GAME_SELECT,
    orderBy: [{ rawgRating: "desc" }, { name: "asc" }],
    take: 10,
  });

  res.json(games);
});

// ---------------------------------------------------------------------------
// POST /api/messages/conversations/:id/forward
// Forward a message into this conversation
// Body: { messageId }
// ---------------------------------------------------------------------------
router.post("/conversations/:id/forward", requireAuth, async (req: AuthRequest, res: Response) => {
  const myId = req.userId!;
  const conversationId = String(req.params.id);
  const { messageId } = req.body;

  if (!messageId || typeof messageId !== "string") {
    res.status(400).json({ error: "messageId is required" });
    return;
  }

  const participant = await requireParticipant(conversationId, myId);
  if (!participant) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  // Fetch the original message with all content types
  const original = await prisma.message.findUnique({
    where: { id: messageId },
    select: {
      body: true,
      imageUrl: true,
      imageUrls: true,
      audioUrl: true,
      audioDuration: true,
      fileUrl: true,
      fileName: true,
      fileSize: true,
      fileType: true,
      gameId: true,
      senderId: true,
      conversationId: true,
      poll: {
        select: {
          question: true,
          allowMultiple: true,
          options: { select: { text: true, order: true }, orderBy: { order: "asc" } },
        },
      },
      gameNight: {
        select: { title: true, scheduledAt: true, platform: true, note: true, gameId: true },
      },
    },
  });
  if (!original) {
    res.status(404).json({ error: "Message not found" });
    return;
  }
  // Verify caller is a participant in the source conversation
  const sourceParticipant = await requireParticipant(original.conversationId, myId);
  if (!sourceParticipant) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  // Cannot forward a deleted message
  if (original.body === "[deleted]") {
    res.status(400).json({ error: "Cannot forward a deleted message" });
    return;
  }

  // Create the forwarded message — deep-copy polls and game nights so each
  // forwarded instance is independent (own votes / own RSVPs)
  const message = await prisma.message.create({
    data: {
      conversationId,
      senderId: myId,
      body: original.body,
      imageUrl: original.imageUrl ?? undefined,
      imageUrls: original.imageUrls ?? undefined,
      audioUrl: original.audioUrl ?? undefined,
      audioDuration: original.audioDuration ?? undefined,
      fileUrl: original.fileUrl ?? undefined,
      fileName: original.fileName ?? undefined,
      fileSize: original.fileSize ?? undefined,
      fileType: original.fileType ?? undefined,
      gameId: original.gameId ?? undefined,
      isForwarded: true,
      ...(original.poll && {
        poll: {
          create: {
            conversationId,
            question: original.poll.question,
            allowMultiple: original.poll.allowMultiple,
            options: { create: original.poll.options.map((o) => ({ text: o.text, order: o.order })) },
          },
        },
      }),
      ...(original.gameNight && {
        gameNight: {
          create: {
            conversationId,
            createdBy: myId,
            title: original.gameNight.title,
            scheduledAt: original.gameNight.scheduledAt,
            platform: original.gameNight.platform ?? undefined,
            note: original.gameNight.note ?? undefined,
            gameId: original.gameNight.gameId ?? undefined,
          },
        },
      }),
    },
    select: MESSAGE_SELECT,
  });

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

  const other = await prisma.conversationParticipant.findFirst({
    where: { conversationId, userId: { not: myId } },
  });

  const payload = { conversationId, message };
  emitToConversation(conversationId, "new_message", payload);
  if (other) emitToUser(other.userId, "new_message", { conversationId });

  res.status(201).json(message);
});

// ---------------------------------------------------------------------------
// POST /api/messages/conversations/:id/polls
// Create a poll message — body: { question, options: string[], allowMultiple? }
// ---------------------------------------------------------------------------
router.post("/conversations/:id/polls", requireAuth, async (req: AuthRequest, res: Response) => {
  const myId = req.userId!;
  const conversationId = String(req.params.id);
  const { question, options, allowMultiple = false } = req.body;

  if (!question || typeof question !== "string" || question.trim().length === 0) {
    res.status(400).json({ error: "Question is required" }); return;
  }
  if (!Array.isArray(options) || options.length < 2 || options.length > 5) {
    res.status(400).json({ error: "Provide 2–5 options" }); return;
  }
  const cleanOptions = (options as unknown[])
    .map((o) => (typeof o === "string" ? o.trim() : ""))
    .filter((o) => o.length > 0);
  if (cleanOptions.length < 2) {
    res.status(400).json({ error: "At least 2 non-empty options required" }); return;
  }

  const participant = await requireParticipant(conversationId, myId);
  if (!participant) { res.status(403).json({ error: "Forbidden" }); return; }

  const message = await prisma.message.create({
    data: {
      conversationId,
      senderId: myId,
      body: "📊 " + question.trim().slice(0, 80),
      poll: {
        create: {
          conversationId,
          question: question.trim().slice(0, 200),
          allowMultiple: !!allowMultiple,
          options: {
            create: cleanOptions.map((text, i) => ({ text: text.slice(0, 100), order: i })),
          },
        },
      },
    },
    select: MESSAGE_SELECT,
  });

  await prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });

  const other = await prisma.conversationParticipant.findFirst({
    where: { conversationId, userId: { not: myId } },
  });
  emitToConversation(conversationId, "new_message", { conversationId, message });
  if (other) emitToUser(other.userId, "new_message", { conversationId });

  res.status(201).json(message);
});

// ---------------------------------------------------------------------------
// POST /api/messages/polls/:pollId/vote
// Toggle a vote on an option — body: { optionId }
// If allowMultiple=false, replaces any existing vote; else toggles this option
// ---------------------------------------------------------------------------
router.post("/polls/:pollId/vote", requireAuth, async (req: AuthRequest, res: Response) => {
  const myId = req.userId!;
  const pollId = String(req.params.pollId);
  const { optionId } = req.body;

  if (!optionId || typeof optionId !== "string") {
    res.status(400).json({ error: "optionId is required" }); return;
  }

  const poll = await prisma.poll.findUnique({
    where: { id: pollId },
    include: { options: { select: { id: true } } },
  });
  if (!poll) { res.status(404).json({ error: "Poll not found" }); return; }

  const participant = await requireParticipant(poll.conversationId, myId);
  if (!participant) { res.status(403).json({ error: "Forbidden" }); return; }

  const validOption = poll.options.some((o) => o.id === optionId);
  if (!validOption) { res.status(400).json({ error: "Invalid optionId" }); return; }

  const existing = await prisma.pollVote.findUnique({
    where: { pollId_optionId_userId: { pollId, optionId, userId: myId } },
  });

  await prisma.$transaction(async (tx) => {
    if (existing) {
      // Toggle off — remove this vote
      await tx.pollVote.delete({ where: { id: existing.id } });
    } else {
      if (!poll.allowMultiple) {
        // Single-choice: remove any existing votes first
        await tx.pollVote.deleteMany({ where: { pollId, userId: myId } });
      }
      await tx.pollVote.create({ data: { pollId, optionId, userId: myId } });
    }
  });

  // Fetch updated poll to broadcast
  const updatedPoll = await prisma.poll.findUnique({
    where: { id: pollId },
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
        orderBy: { order: "asc" },
      },
    },
  });

  emitToConversation(poll.conversationId, "poll_updated", {
    conversationId: poll.conversationId,
    messageId: poll.messageId,
    poll: updatedPoll,
  });

  res.json({ poll: updatedPoll });
});

// ---------------------------------------------------------------------------
// POST /api/messages/conversations/:id/game-nights
// Create a Game Night message card in a group conversation
// Body: { title, rawgId?, scheduledAt (ISO), platform?, note? }
// ---------------------------------------------------------------------------
router.post("/conversations/:id/game-nights", requireAuth, async (req: AuthRequest, res: Response) => {
  const myId = req.userId!;
  const conversationId = String(req.params.id);
  const { title, rawgId, scheduledAt, platform, note } = req.body;

  if (!title || typeof title !== "string" || title.trim().length === 0) {
    res.status(400).json({ error: "Title is required" }); return;
  }
  if (!scheduledAt || isNaN(Date.parse(scheduledAt))) {
    res.status(400).json({ error: "Valid scheduledAt is required" }); return;
  }
  if (new Date(scheduledAt) <= new Date()) {
    res.status(400).json({ error: "scheduledAt must be in the future" }); return;
  }

  const participant = await requireParticipant(conversationId, myId);
  if (!participant) { res.status(403).json({ error: "Forbidden" }); return; }

  const conv = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { isGroup: true },
  });
  if (!conv?.isGroup) {
    res.status(400).json({ error: "Game Night is only available in group conversations" }); return;
  }

  let resolvedGameId: string | null = null;
  if (rawgId && typeof rawgId === "number") {
    const game = await ensureGameByRawgId(rawgId);
    if (!game) { res.status(404).json({ error: "Game not found on RAWG" }); return; }
    resolvedGameId = game.id;
  }

  const message = await prisma.message.create({
    data: {
      conversationId,
      senderId: myId,
      body: "🎮 " + title.trim().slice(0, 80),
      gameNight: {
        create: {
          conversationId,
          createdBy: myId,
          title: title.trim().slice(0, 100),
          gameId: resolvedGameId,
          scheduledAt: new Date(scheduledAt),
          platform: typeof platform === "string" && platform.trim() ? platform.trim() : null,
          note: typeof note === "string" && note.trim() ? note.trim().slice(0, 300) : null,
        },
      },
    },
    select: MESSAGE_SELECT,
  });

  await prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });

  const other = await prisma.conversationParticipant.findFirst({
    where: { conversationId, userId: { not: myId } },
  });
  emitToConversation(conversationId, "new_message", { conversationId, message });
  if (other) emitToUser(other.userId, "new_message", { conversationId });

  res.status(201).json(message);
});

// ---------------------------------------------------------------------------
// GET /api/messages/conversations/:id/game-nights
// Upcoming game nights for the sidebar (next 5, sorted by scheduledAt)
// ---------------------------------------------------------------------------
router.get("/conversations/:id/game-nights", requireAuth, async (req: AuthRequest, res: Response) => {
  const myId = req.userId!;
  const conversationId = String(req.params.id);

  const participant = await requireParticipant(conversationId, myId);
  if (!participant) { res.status(403).json({ error: "Forbidden" }); return; }

  const gameNights = await prisma.gameNight.findMany({
    where: { conversationId, scheduledAt: { gte: new Date() } },
    select: GAME_NIGHT_SELECT,
    orderBy: { scheduledAt: "asc" },
    take: 5,
  });

  res.json(gameNights);
});

// ---------------------------------------------------------------------------
// POST /api/messages/game-nights/:id/rsvp
// Set or change RSVP status — body: { status: "going" | "maybe" | "no" }
// ---------------------------------------------------------------------------
router.post("/game-nights/:id/rsvp", requireAuth, async (req: AuthRequest, res: Response) => {
  const myId = req.userId!;
  const gameNightId = String(req.params.id);
  const { status } = req.body;

  if (!["going", "maybe", "no"].includes(status)) {
    res.status(400).json({ error: "status must be going, maybe, or no" }); return;
  }

  const gameNight = await prisma.gameNight.findUnique({
    where: { id: gameNightId },
    select: { conversationId: true, messageId: true, scheduledAt: true },
  });
  if (!gameNight) { res.status(404).json({ error: "Game Night not found" }); return; }

  const participant = await requireParticipant(gameNight.conversationId, myId);
  if (!participant) { res.status(403).json({ error: "Forbidden" }); return; }

  await prisma.gameNightRsvp.upsert({
    where: { gameNightId_userId: { gameNightId, userId: myId } },
    create: { gameNightId, userId: myId, status },
    update: { status },
  });

  const updatedGameNight = await prisma.gameNight.findUnique({
    where: { id: gameNightId },
    select: GAME_NIGHT_SELECT,
  });

  emitToConversation(gameNight.conversationId, "game_night_updated", {
    conversationId: gameNight.conversationId,
    messageId: gameNight.messageId,
    gameNight: updatedGameNight,
  });

  res.json({ gameNight: updatedGameNight });
});

// ---------------------------------------------------------------------------
// POST /api/messages/reactions/:msgId
// Toggle a reaction (add if not present, remove if already present)
// ---------------------------------------------------------------------------
router.post("/reactions/:msgId", requireAuth, async (req: AuthRequest, res: Response) => {
  const myId = req.userId!;
  const msgId = String(req.params.msgId);

  const emoji = typeof req.body.emoji === "string" ? req.body.emoji.trim() : "";
  if (!emoji) {
    res.status(400).json({ error: "emoji is required" });
    return;
  }

  // Fetch the message to get conversationId and verify participation
  const message = await prisma.message.findUnique({
    where: { id: msgId },
    select: { conversationId: true },
  });
  if (!message) {
    res.status(404).json({ error: "Message not found" });
    return;
  }

  const participant = await requireParticipant(message.conversationId, myId);
  if (!participant) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  // Toggle: delete if exists, otherwise create (guard against unique-constraint race)
  const existing = await prisma.messageReaction.findUnique({
    where: { messageId_userId_emoji: { messageId: msgId, userId: myId, emoji } },
  });

  if (existing) {
    await prisma.messageReaction.delete({ where: { id: existing.id } });
  } else {
    try {
      await prisma.messageReaction.create({
        data: { messageId: msgId, userId: myId, emoji },
      });
    } catch {
      // Unique constraint: concurrent request already created it — treat as no-op
    }
  }

  // Fetch updated reactions to broadcast
  const reactions = await prisma.messageReaction.findMany({
    where: { messageId: msgId },
    select: { id: true, emoji: true, userId: true },
    orderBy: { createdAt: "asc" },
  });

  // Broadcast to all participants in the conversation (including sender)
  emitToConversation(message.conversationId, "reaction_update", {
    conversationId: message.conversationId,
    messageId: msgId,
    reactions,
  });

  res.json({ reactions });
});

export default router;
