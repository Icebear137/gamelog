import { Router, Response } from "express";
import { z } from "zod";
import axios from "axios";
import prisma from "../../lib/prisma";
import { requireAuth, AuthRequest } from "../../middleware/auth";
import { emitToUser, emitToConversation } from "../../lib/socket";
import { MESSAGE_SELECT, GAME_SELECT, requireParticipant } from "./_shared";

const router = Router();

const MessageSchema = z.object({
  body: z.string().max(2000).trim().default(""),
  replyToId: z.string().optional(),
  gameId: z.string().optional(),
}).refine((d) => d.body.length > 0 || !!d.gameId, {
  message: "body or gameId is required",
});

// ---------------------------------------------------------------------------
// GET /api/messages/conversations/:id
// Load messages (cursor-based: ?before=<msgId>&limit=30)
// NOTE: This route is handled in conversations.ts; placed here for reference
// ---------------------------------------------------------------------------

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

export default router;
