import { Router, Response } from "express";
import prisma from "../../lib/prisma";
import { requireAuth, AuthRequest } from "../../middleware/auth";
import { emitToUser, emitToConversation } from "../../lib/socket";
import { getGameById, extractYear } from "../../lib/rawg";
import { MESSAGE_SELECT, GAME_NIGHT_SELECT, requireParticipant } from "./_shared";

const router = Router();

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

export default router;
