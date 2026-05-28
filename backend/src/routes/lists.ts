import { Router, Response } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { requireAuth, optionalAuth, AuthRequest } from "../middleware/auth";
import { getGameById, extractYear } from "../lib/rawg";

const router = Router();

const ListSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  isPublic: z.boolean().optional(),
});

const GAME_LIST_SELECT = {
  id: true,
  name: true,
  description: true,
  isPublic: true,
  createdAt: true,
  updatedAt: true,
  user: { select: { id: true, username: true, avatar: true } },
  _count: { select: { entries: true } },
};

/** Browse all public lists from all users — paginated, newest first */
router.get("/discover", optionalAuth, async (_req: AuthRequest, res: Response) => {
  const lists = await prisma.gameList.findMany({
    where: { isPublic: true },
    orderBy: { updatedAt: "desc" },
    take: 40,
    select: {
      ...GAME_LIST_SELECT,
      entries: {
        take: 4,
        orderBy: { addedAt: "desc" },
        select: { game: { select: { coverImage: true, name: true } } },
      },
    },
  });
  res.json(lists);
});

router.get("/me", requireAuth, async (req: AuthRequest, res: Response) => {
  const lists = await prisma.gameList.findMany({
    where: { userId: req.userId! },
    orderBy: { updatedAt: "desc" },
    select: {
      ...GAME_LIST_SELECT,
      entries: {
        take: 4,
        orderBy: { addedAt: "desc" },
        select: { game: { select: { coverImage: true, name: true } } },
      },
    },
  });
  res.json(lists);
});

router.post("/", requireAuth, async (req: AuthRequest, res: Response) => {
  const parsed = ListSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const list = await prisma.gameList.create({
    data: { userId: req.userId!, ...parsed.data },
    select: GAME_LIST_SELECT,
  });
  res.status(201).json(list);
});

router.get("/:id", optionalAuth, async (req: AuthRequest, res: Response) => {
  const id = String(req.params.id);
  const list = await prisma.gameList.findUnique({
    where: { id },
    select: {
      ...GAME_LIST_SELECT,
      entries: {
        orderBy: { addedAt: "desc" },
        select: {
          id: true,
          addedAt: true,
          game: {
            select: { id: true, rawgId: true, name: true, coverImage: true, genres: true, releaseYear: true, rawgRating: true },
          },
        },
      },
    },
  });
  if (!list) {
    res.status(404).json({ error: "List not found" });
    return;
  }
  if (!list.isPublic && list.user.id !== req.userId) {
    res.status(403).json({ error: "This list is private" });
    return;
  }
  res.json({ ...list, entries: list.entries.map((e) => ({ ...e, game: { ...e.game, genres: JSON.parse(e.game.genres) } })) });
});

router.patch("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  const id = String(req.params.id);
  const list = await prisma.gameList.findUnique({ where: { id } });
  if (!list || list.userId !== req.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const parsed = ListSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const updated = await prisma.gameList.update({
    where: { id },
    data: parsed.data,
    select: GAME_LIST_SELECT,
  });
  res.json(updated);
});

router.delete("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  const id = String(req.params.id);
  const list = await prisma.gameList.findUnique({ where: { id } });
  if (!list || list.userId !== req.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  await prisma.gameList.delete({ where: { id } });
  res.json({ deleted: true });
});

router.post("/:id/games", requireAuth, async (req: AuthRequest, res: Response) => {
  const id = String(req.params.id);
  const list = await prisma.gameList.findUnique({ where: { id } });
  if (!list || list.userId !== req.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const { rawgId } = req.body;
  if (!rawgId || typeof rawgId !== "number") {
    res.status(400).json({ error: "rawgId required" });
    return;
  }
  let game = await prisma.game.findUnique({ where: { rawgId } });
  if (!game) {
    const rawgGame = await getGameById(rawgId);
    if (!rawgGame) {
      res.status(404).json({ error: "Game not found on RAWG" });
      return;
    }
    game = await prisma.game.upsert({
      where: { rawgId: rawgGame.id },
      create: {
        rawgId: rawgGame.id, name: rawgGame.name, slug: rawgGame.slug,
        coverImage: rawgGame.background_image,
        genres: JSON.stringify(rawgGame.genres.map((g) => g.name)),
        releaseYear: extractYear(rawgGame.released),
        rawgRating: rawgGame.rating,
      },
      update: { name: rawgGame.name, coverImage: rawgGame.background_image, rawgRating: rawgGame.rating },
    });
  }
  await prisma.gameListEntry.upsert({
    where: { listId_gameId: { listId: id, gameId: game.id } },
    create: { listId: id, gameId: game.id },
    update: {},
  });
  await prisma.gameList.update({ where: { id }, data: { updatedAt: new Date() } });
  res.json({ added: true });
});

router.delete("/:id/games/:gameId", requireAuth, async (req: AuthRequest, res: Response) => {
  const id = String(req.params.id);
  const gameId = String(req.params.gameId);
  const list = await prisma.gameList.findUnique({ where: { id } });
  if (!list || list.userId !== req.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  await prisma.gameListEntry.deleteMany({ where: { listId: id, gameId } });
  res.json({ removed: true });
});

export default router;
