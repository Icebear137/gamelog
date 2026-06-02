import { Router, Response } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { getGameById, extractYear } from "../lib/rawg";
import { checkAndAwardAchievements } from "../lib/achievements";
import { emitToUser } from "../lib/socket";

const router = Router();

const VALID_STATUSES = ["PLAYING", "COMPLETED", "DROPPED", "WANT_TO_PLAY"] as const;

const VALID_PLATFORMS = ["PC", "PS5", "PS4", "Xbox Series X|S", "Xbox One", "Nintendo Switch", "iOS/Android", "Other"] as const;

const EntrySchema = z.object({
  rawgId: z.number().int().positive(),
  status: z.enum(VALID_STATUSES),
  rating: z.number().int().min(1).max(10).optional().nullable(),
  review: z.string().max(2000).optional().nullable(),
  playtime: z.number().int().min(0).optional().nullable(),
  platform: z.enum(VALID_PLATFORMS).optional().nullable(),
});

async function ensureGame(rawgId: number) {
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
        genres: JSON.stringify(rawgGame.genres.map((g) => g.name)),
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

function activityType(status: string): string {
  if (status === "COMPLETED") return "COMPLETED";
  if (status === "PLAYING") return "STARTED";
  if (status === "DROPPED") return "DROPPED";
  if (status === "WANT_TO_PLAY") return "ADDED_TO_WISHLIST";
  return "RATED";
}

router.post("/", requireAuth, async (req: AuthRequest, res: Response) => {
  const parsed = EntrySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { rawgId, status, rating, review, playtime, platform } = parsed.data;

  const game = await ensureGame(rawgId);
  if (!game) {
    res.status(404).json({ error: "Game not found on RAWG" });
    return;
  }

  const existing = await prisma.gameEntry.findUnique({
    where: { userId_gameId: { userId: req.userId!, gameId: game.id } },
  });

  const entry = await prisma.gameEntry.upsert({
    where: { userId_gameId: { userId: req.userId!, gameId: game.id } },
    create: { userId: req.userId!, gameId: game.id, status, rating, review, playtime, platform },
    update: { status, rating, review, playtime, platform },
    include: { game: true },
  });

  const statusChanged = !existing || existing.status !== status;
  // Also create a RATED activity when the rating changes (even without a status change)
  const ratingChanged = !!existing && existing.rating !== rating && rating != null;
  if (statusChanged || ratingChanged) {
    const type = statusChanged ? activityType(status) : "RATED";
    await prisma.activity.create({
      data: { userId: req.userId!, gameEntryId: entry.id, type },
    });

    // Push feed_update to all followers so their feed refreshes in real-time (fire-and-forget)
    prisma.follow.findMany({
      where: { followingId: req.userId! },
      select: { followerId: true },
    }).then((followers) => {
      followers.forEach((f) => emitToUser(f.followerId, "feed_update", { actorId: req.userId }));
    }).catch(() => {});
  }

  // Check & award achievements (fire-and-forget; include in response)
  const newAchievements = await checkAndAwardAchievements(req.userId!).catch(() => []);

  res.json({
    ...entry,
    game: { ...entry.game, genres: JSON.parse(entry.game.genres) },
    newAchievements,
  });
});

router.delete("/:rawgId", requireAuth, async (req: AuthRequest, res: Response) => {
  const rawgId = parseInt(String(req.params.rawgId));
  if (isNaN(rawgId)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const game = await prisma.game.findUnique({ where: { rawgId } });
  if (!game) {
    res.status(404).json({ error: "Game not found" });
    return;
  }
  await prisma.gameEntry.deleteMany({
    where: { userId: req.userId!, gameId: game.id },
  });
  res.json({ deleted: true });
});

router.get("/me", requireAuth, async (req: AuthRequest, res: Response) => {
  const { status } = req.query;
  if (status && !VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
    res.status(400).json({ error: "Invalid status" });
    return;
  }
  const entries = await prisma.gameEntry.findMany({
    where: {
      userId: req.userId!,
      ...(status ? { status: status as string } : {}),
    },
    include: { game: true },
    orderBy: { updatedAt: "desc" },
  });
  res.json(
    entries.map((e) => ({ ...e, game: { ...e.game, genres: JSON.parse(e.game.genres) } }))
    // platform is included via spread of entry fields
  );
});

// ---------------------------------------------------------------------------
// POST /api/entries/:entryId/helpful — toggle "helpful" on a review
// ---------------------------------------------------------------------------
router.post("/:entryId/helpful", requireAuth, async (req: AuthRequest, res: Response) => {
  const entryId = String(req.params.entryId);
  const userId  = req.userId!;

  const entry = await prisma.gameEntry.findUnique({
    where: { id: entryId },
    select: { review: true, userId: true },
  });
  if (!entry?.review) { res.status(404).json({ error: "Review not found" }); return; }
  if (entry.userId === userId) { res.status(400).json({ error: "Cannot mark your own review as helpful" }); return; }

  const existing = await prisma.reviewLike.findUnique({
    where: { userId_entryId: { userId, entryId } },
  });

  if (existing) {
    await prisma.reviewLike.delete({ where: { id: existing.id } });
  } else {
    await prisma.reviewLike.create({ data: { userId, entryId } });
  }

  const count = await prisma.reviewLike.count({ where: { entryId } });
  res.json({ helpful: !existing, count });
});

export default router;
