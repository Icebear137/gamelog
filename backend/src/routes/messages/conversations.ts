import { Router, Response } from "express";
import prisma from "../../lib/prisma";
import { requireAuth, AuthRequest } from "../../middleware/auth";
import { emitToUser, emitToConversation } from "../../lib/socket";
import { uploadToCloudinary } from "../../lib/cloudinary";
import { SENDER_SELECT, MESSAGE_SELECT, uploadImage, requireParticipant } from "./_shared";

const router = Router();

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
// POST /api/messages/conversations/:id/read
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

export default router;
