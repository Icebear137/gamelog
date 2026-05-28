import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";
import { searchGames, getGameById, extractYear } from "../lib/rawg";
import { requireAuth, optionalAuth, AuthRequest } from "../middleware/auth";
import { ACTIVITY_SELECT } from "../lib/selects";

const router = Router();

async function upsertGame(rawgGame: Awaited<ReturnType<typeof getGameById>>) {
  if (!rawgGame) return null;
  return prisma.game.upsert({
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

router.get("/search", async (req: Request, res: Response) => {
  const q = (req.query.q as string)?.trim() || undefined;
  const genre = (req.query.genre as string)?.trim() || undefined;
  const year = req.query.year ? parseInt(req.query.year as string) : undefined;
  const hasFilters = !!(genre || (!isNaN(year!) && year));

  if (hasFilters) {
    // Local DB search when genre/year filter is active
    const where: Record<string, unknown> = {};
    if (q) where.name = { contains: q };
    if (genre) where.genres = { contains: genre };
    if (year && !isNaN(year)) where.releaseYear = year;
    const games = await prisma.game.findMany({
      where,
      take: 30,
      orderBy: [{ rawgRating: "desc" }, { name: "asc" }],
    });
    res.json(games.map((g) => ({
      rawgId: g.rawgId,
      name: g.name,
      slug: g.slug,
      coverImage: g.coverImage,
      releaseYear: g.releaseYear,
      rawgRating: g.rawgRating,
      genres: JSON.parse(g.genres) as string[],
    })));
    return;
  }

  if (!q) {
    res.status(400).json({ error: "Query required" });
    return;
  }
  const results = await searchGames(q);
  res.json(results.map((g) => ({
    rawgId: g.id,
    name: g.name,
    slug: g.slug,
    coverImage: g.background_image,
    releaseYear: extractYear(g.released),
    rawgRating: g.rating,
    genres: g.genres.map((x) => x.name),
  })));
});

/** Distinct genres from all locally-cached games */
router.get("/genres", async (_req: Request, res: Response) => {
  const rows = await prisma.game.findMany({ select: { genres: true } });
  const set = new Set<string>();
  rows.forEach((r) => (JSON.parse(r.genres) as string[]).forEach((g) => set.add(g)));
  res.json([...set].sort());
});

/** Personalised game recommendations based on genre overlap with played/completed games */
router.get("/recommendations", requireAuth, async (req: AuthRequest, res: Response) => {
  const entries = await prisma.gameEntry.findMany({
    where: { userId: req.userId!, status: { in: ["COMPLETED", "PLAYING", "DROPPED"] } },
    select: { game: { select: { id: true, name: true, genres: true } } },
  });

  if (entries.length === 0) { res.json([]); return; }

  const userGameIds = new Set(entries.map((e) => e.game.id));
  const genreCount: Record<string, number> = {};
  const genreSource: Record<string, string> = {}; // genre → first source game name

  for (const entry of entries) {
    const genres = JSON.parse(entry.game.genres) as string[];
    for (const g of genres) {
      genreCount[g] = (genreCount[g] ?? 0) + 1;
      if (!genreSource[g]) genreSource[g] = entry.game.name;
    }
  }

  const candidates = await prisma.game.findMany({
    where: { id: { notIn: [...userGameIds] } },
    select: { id: true, rawgId: true, name: true, coverImage: true, genres: true, releaseYear: true, rawgRating: true },
  });

  const scored = candidates
    .map((game) => {
      const gameGenres = JSON.parse(game.genres) as string[];
      let score = 0;
      let bestGenre = "";
      let bestScore = 0;
      for (const g of gameGenres) {
        const c = genreCount[g] ?? 0;
        score += c;
        if (c > bestScore) { bestScore = c; bestGenre = g; }
      }
      return {
        ...game,
        genres: gameGenres,
        score,
        reason: bestGenre ? `Because you played ${genreSource[bestGenre]}` : null,
      };
    })
    .filter((g) => g.score > 0)
    // Sort primarily by score (genre overlap), tiebreak by RAWG rating
    .sort((a, b) => b.score - a.score || (b.rawgRating ?? 0) - (a.rawgRating ?? 0))
    .slice(0, 10);

  res.json(scored);
});

router.get("/trending", async (_req: Request, res: Response) => {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const entries = await prisma.gameEntry.groupBy({
    by: ["gameId"],
    where: { createdAt: { gte: weekAgo } },
    _count: { gameId: true },
    orderBy: { _count: { gameId: "desc" } },
    take: 10,
  });

  const games = await prisma.game.findMany({
    where: { id: { in: entries.map((e) => e.gameId) } },
  });

  const countMap = Object.fromEntries(entries.map((e) => [e.gameId, e._count.gameId]));
  res.json(
    games
      .map((g) => ({ ...g, genres: JSON.parse(g.genres), addedCount: countMap[g.id] ?? 0 }))
      .sort((a, b) => b.addedCount - a.addedCount)
  );
});

router.get("/:rawgId", async (req: Request, res: Response) => {
  const rawgId = parseInt(String(req.params.rawgId));
  if (isNaN(rawgId)) {
    res.status(400).json({ error: "Invalid game id" });
    return;
  }

  let game = await prisma.game.findUnique({ where: { rawgId } });
  if (!game) {
    const rawgGame = await getGameById(rawgId);
    if (!rawgGame) {
      res.status(404).json({ error: "Game not found" });
      return;
    }
    game = await upsertGame(rawgGame);
  }

  const stats = await prisma.gameEntry.aggregate({
    where: { gameId: game!.id, rating: { not: null } },
    _avg: { rating: true },
    _count: { rating: true },
  });

  const statusCounts = await prisma.gameEntry.groupBy({
    by: ["status"],
    where: { gameId: game!.id },
    _count: { status: true },
  });

  res.json({
    ...game,
    genres: JSON.parse(game!.genres),
    community: {
      avgRating: stats._avg.rating ? Math.round(stats._avg.rating * 10) / 10 : null,
      ratingCount: stats._count.rating,
      statusCounts: Object.fromEntries(statusCounts.map((s) => [s.status, s._count.status])),
    },
  });
});

/** All text reviews for a game — excludes private users */
router.get("/:rawgId/reviews", async (req: Request, res: Response) => {
  const rawgId = parseInt(String(req.params.rawgId));
  if (isNaN(rawgId)) { res.status(400).json({ error: "Invalid game id" }); return; }

  const game = await prisma.game.findUnique({ where: { rawgId } });
  if (!game) { res.json([]); return; }

  const entries = await prisma.gameEntry.findMany({
    where: {
      gameId: game.id,
      review: { not: null },
      user: { isPrivate: false },
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
    select: {
      id: true,
      rating: true,
      review: true,
      status: true,
      platform: true,
      updatedAt: true,
      user: { select: { id: true, username: true, avatar: true } },
    },
  });
  res.json(entries);
});

router.get("/:rawgId/activities", optionalAuth, async (req: AuthRequest, res: Response) => {
  const rawgId = parseInt(String(req.params.rawgId));
  if (isNaN(rawgId)) {
    res.status(400).json({ error: "Invalid game id" });
    return;
  }
  const game = await prisma.game.findUnique({ where: { rawgId } });
  if (!game) {
    res.json([]);
    return;
  }
  const activities = await prisma.activity.findMany({
    where: {
      gameEntry: { gameId: game.id },
      user: { isPrivate: false }, // exclude private profiles from public game activity feed
    },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: ACTIVITY_SELECT,
  });
  const likedSet = req.userId
    ? new Set(
        (
          await prisma.like.findMany({
            where: { userId: req.userId, activityId: { in: activities.map((a) => a.id) } },
            select: { activityId: true },
          })
        ).map((l) => l.activityId)
      )
    : new Set<string>();
  res.json(
    activities
      .filter((a) => a.gameEntry?.game != null)
      .map((a) => ({ ...a, likedByMe: likedSet.has(a.id) }))
  );
});

export default router;
