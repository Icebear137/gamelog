import { Router, Response } from "express";
import { z } from "zod";
import multer from "multer";
import prisma from "../lib/prisma";
import { requireAuth, optionalAuth, AuthRequest } from "../middleware/auth";
import { ACTIVITY_SELECT } from "../lib/selects";
import { emitToUser } from "../lib/socket";
import { checkAndAwardAchievements, ACHIEVEMENTS } from "../lib/achievements";
import { uploadToCloudinary, deleteFromCloudinary, extractPublicId } from "../lib/cloudinary";

// Multer — memory storage (buffer passed to Cloudinary), max 5 MB, images only
const uploadAvatar = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
});

const VALID_STATUSES = ["PLAYING", "COMPLETED", "DROPPED", "WANT_TO_PLAY"] as const;

const router = Router();

const UpdateProfileSchema = z.object({
  bio: z.string().max(300).optional(),
  avatar: z.string().url().optional(),
  steamId: z.string().optional(),
  discordTag: z.string().optional(),
  isPrivate: z.boolean().optional(),
  emailNotifications: z.boolean().optional(),
});

router.get("/discover", requireAuth, async (req: AuthRequest, res: Response) => {
  const myEntries = await prisma.gameEntry.findMany({
    where: { userId: req.userId },
    select: { gameId: true },
  });
  const myGameIds = myEntries.map((e) => e.gameId);

  if (myGameIds.length === 0) {
    res.json([]);
    return;
  }

  const following = await prisma.follow.findMany({
    where: { followerId: req.userId },
    select: { followingId: true },
  });
  const excludeIds = new Set(following.map((f) => f.followingId));
  excludeIds.add(req.userId!);

  const otherEntries = await prisma.gameEntry.findMany({
    where: {
      gameId: { in: myGameIds },
      userId: { notIn: Array.from(excludeIds) },
      user: { isPrivate: false }, // never expose private users via game overlap
    },
    select: { userId: true },
  });

  const countMap = new Map<string, number>();
  otherEntries.forEach((e) => countMap.set(e.userId, (countMap.get(e.userId) ?? 0) + 1));

  const topIds = Array.from(countMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id]) => id);

  if (topIds.length === 0) {
    res.json([]);
    return;
  }

  const users = await prisma.user.findMany({
    where: { id: { in: topIds }, isPrivate: false },
    select: {
      id: true,
      username: true,
      avatar: true,
      bio: true,
      _count: { select: { followers: true, gameEntries: true } },
    },
  });

  const userMap = new Map(users.map((u) => [u.id, u]));
  res.json(topIds.map((id) => ({ ...userMap.get(id)!, commonGames: countMap.get(id) ?? 0 })));
});

// Defined before /:username to avoid wildcard conflict
router.get("/search", optionalAuth, async (req: AuthRequest, res: Response) => {
  const q = (req.query.q as string)?.trim() || undefined;
  const recentDays = req.query.recentDays ? parseInt(req.query.recentDays as string) : undefined;

  if (!q && !recentDays) {
    res.status(400).json({ error: "Query or filter required" });
    return;
  }

  const where: Record<string, unknown> = { isPrivate: false };
  if (q) where.username = { contains: q };
  if (recentDays && !isNaN(recentDays)) {
    const since = new Date(Date.now() - recentDays * 24 * 60 * 60 * 1000);
    where.activities = { some: { createdAt: { gte: since } } };
  }

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      username: true,
      avatar: true,
      bio: true,
      _count: { select: { followers: true, gameEntries: true } },
    },
    take: 20,
    orderBy: { followers: { _count: "desc" } },
  });
  res.json(users);
});

router.get("/:username", optionalAuth, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { username: String(req.params.username) },
    select: {
      id: true,
      username: true,
      bio: true,
      avatar: true,
      steamId: true,
      discordTag: true,
      isPrivate: true,
      createdAt: true,
      _count: { select: { gameEntries: true, followers: true, following: true } },
    },
  });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  let isFollowing = false;
  if (req.userId) {
    const follow = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: req.userId, followingId: user.id } },
    });
    isFollowing = !!follow;
  }

  res.json({ ...user, isFollowing });
});

router.patch("/me", requireAuth, async (req: AuthRequest, res: Response) => {
  const parsed = UpdateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const user = await prisma.user.update({
    where: { id: req.userId },
    data: parsed.data,
    select: { id: true, username: true, bio: true, avatar: true, steamId: true, discordTag: true, isPrivate: true, emailNotifications: true },
  });
  res.json(user);
});

router.get("/:username/games", optionalAuth, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({ where: { username: String(req.params.username) } });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  // Private profile: only owner or followers can see games
  if (user.isPrivate && req.userId !== user.id) {
    const isFollowing = req.userId
      ? await prisma.follow.findUnique({
          where: { followerId_followingId: { followerId: req.userId, followingId: user.id } },
        })
      : null;
    if (!isFollowing) {
      res.status(403).json({ error: "This profile is private", isPrivate: true });
      return;
    }
  }

  const { status } = req.query;
  if (status && !VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
    res.status(400).json({ error: "Invalid status" });
    return;
  }
  const entries = await prisma.gameEntry.findMany({
    where: {
      userId: user.id,
      ...(status ? { status: status as string } : {}),
    },
    include: { game: true },
    orderBy: { updatedAt: "desc" },
  });

  res.json(entries);
});

router.get("/:username/followers", optionalAuth, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({ where: { username: String(req.params.username) } });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  // Private profile: only owner or followers can see the follower list
  if (user.isPrivate && req.userId !== user.id) {
    const isFollowing = req.userId
      ? await prisma.follow.findUnique({
          where: { followerId_followingId: { followerId: req.userId, followingId: user.id } },
        })
      : null;
    if (!isFollowing) {
      res.status(403).json({ error: "This profile is private", isPrivate: true });
      return;
    }
  }
  const followers = await prisma.follow.findMany({
    where: { followingId: user.id },
    include: {
      follower: { select: { id: true, username: true, avatar: true, bio: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(followers.map((f) => f.follower));
});

router.get("/:username/following", optionalAuth, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({ where: { username: String(req.params.username) } });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  // Private profile: only owner or followers can see the following list
  if (user.isPrivate && req.userId !== user.id) {
    const isFollowing = req.userId
      ? await prisma.follow.findUnique({
          where: { followerId_followingId: { followerId: req.userId, followingId: user.id } },
        })
      : null;
    if (!isFollowing) {
      res.status(403).json({ error: "This profile is private", isPrivate: true });
      return;
    }
  }
  const following = await prisma.follow.findMany({
    where: { followerId: user.id },
    include: {
      following: { select: { id: true, username: true, avatar: true, bio: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(following.map((f) => f.following));
});

router.post("/:username/follow", requireAuth, async (req: AuthRequest, res: Response) => {
  const target = await prisma.user.findUnique({ where: { username: String(req.params.username) } });
  if (!target) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  if (target.id === req.userId) {
    res.status(400).json({ error: "Cannot follow yourself" });
    return;
  }
  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId: req.userId!, followingId: target.id } },
  });
  await prisma.follow.upsert({
    where: { followerId_followingId: { followerId: req.userId!, followingId: target.id } },
    create: { followerId: req.userId!, followingId: target.id },
    update: {},
  });
  if (!existing) {
    const notif = await prisma.notification.create({
      data: { userId: target.id, actorId: req.userId!, type: "FOLLOW" },
      select: {
        id: true, type: true, read: true, createdAt: true,
        actor: { select: { id: true, username: true, avatar: true } },
      },
    });
    emitToUser(target.id, "notification", notif);
    // Check achievements for both parties (fire-and-forget)
    checkAndAwardAchievements(req.userId!).catch(() => {});
    checkAndAwardAchievements(target.id).catch(() => {});
  }
  res.json({ following: true });
});

router.delete("/:username/follow", requireAuth, async (req: AuthRequest, res: Response) => {
  const target = await prisma.user.findUnique({ where: { username: String(req.params.username) } });
  if (!target) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  await prisma.follow.deleteMany({
    where: { followerId: req.userId!, followingId: target.id },
  });
  res.json({ following: false });
});

router.get("/:username/lists", optionalAuth, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({ where: { username: String(req.params.username) } });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const isOwner = req.userId === user.id;
  const lists = await prisma.gameList.findMany({
    where: { userId: user.id, ...(isOwner ? {} : { isPublic: true }) },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      description: true,
      isPublic: true,
      createdAt: true,
      _count: { select: { entries: true } },
      entries: {
        take: 4,
        orderBy: { addedAt: "desc" },
        select: { game: { select: { coverImage: true } } },
      },
    },
  });
  res.json(lists);
});

// ──────────────────────────────────────────────
// Yearly Challenge
// ──────────────────────────────────────────────

router.get("/me/challenge", requireAuth, async (req: AuthRequest, res: Response) => {
  const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();
  const challenge = await prisma.yearlyChallenge.findUnique({
    where: { userId_year: { userId: req.userId!, year } },
  });
  const from = new Date(`${year}-01-01T00:00:00.000Z`);
  const to = new Date(`${year + 1}-01-01T00:00:00.000Z`);
  const completed = await prisma.gameEntry.count({
    where: { userId: req.userId!, status: "COMPLETED", updatedAt: { gte: from, lt: to } },
  });
  res.json({ year, goal: challenge?.goal ?? null, completed });
});

router.post("/me/challenge", requireAuth, async (req: AuthRequest, res: Response) => {
  const { year, goal } = req.body;
  if (!year || !goal || typeof goal !== "number" || goal < 1 || goal > 9999) {
    res.status(400).json({ error: "year and goal (1–9999) required" });
    return;
  }
  const challenge = await prisma.yearlyChallenge.upsert({
    where: { userId_year: { userId: req.userId!, year } },
    create: { userId: req.userId!, year, goal },
    update: { goal },
  });
  res.json(challenge);
});

router.get("/:username/challenge", optionalAuth, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({ where: { username: String(req.params.username) } });
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();
  const challenge = await prisma.yearlyChallenge.findUnique({
    where: { userId_year: { userId: user.id, year } },
  });
  if (!challenge) { res.json(null); return; }

  const from = new Date(`${year}-01-01T00:00:00.000Z`);
  const to = new Date(`${year + 1}-01-01T00:00:00.000Z`);
  const completed = await prisma.gameEntry.count({
    where: { userId: user.id, status: "COMPLETED", updatedAt: { gte: from, lt: to } },
  });
  res.json({ year, goal: challenge.goal, completed });
});

router.post("/me/avatar", requireAuth, (req: AuthRequest, res: Response) => {
  uploadAvatar.single("avatar")(req as any, res as any, async (err) => {
    if (err) {
      res.status(400).json({ error: err.message ?? "Upload failed" });
      return;
    }
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) {
      res.status(400).json({ error: "No file provided" });
      return;
    }

    try {
      // Delete old avatar from Cloudinary if it exists
      const existing = await prisma.user.findUnique({ where: { id: req.userId }, select: { avatar: true } });
      if (existing?.avatar) {
        const oldPublicId = extractPublicId(existing.avatar);
        if (oldPublicId) deleteFromCloudinary(oldPublicId); // fire-and-forget
      }

      // Upload new avatar to Cloudinary (crop 256×256 square, face-aware, convert to webp)
      const { url: avatarUrl } = await uploadToCloudinary(file.buffer, {
        folder: "gamelog/avatars",
        public_id: `user_${req.userId}`, // deterministic ID → auto-overwrites previous
        transformation: [
          { width: 256, height: 256, crop: "fill", gravity: "face" },
          { fetch_format: "auto", quality: "auto" },
        ],
      });

      const user = await prisma.user.update({
        where: { id: req.userId },
        data: { avatar: avatarUrl },
        select: { id: true, username: true, bio: true, avatar: true, steamId: true, discordTag: true, isPrivate: true, emailNotifications: true },
      });
      res.json(user);
    } catch (e: any) {
      res.status(500).json({ error: e?.message ?? "Upload to Cloudinary failed" });
    }
  });
});

router.get("/:username/stats", optionalAuth, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({ where: { username: String(req.params.username) } });
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  // Private check
  if (user.isPrivate && req.userId !== user.id) {
    const isFollowing = req.userId
      ? await prisma.follow.findUnique({
          where: { followerId_followingId: { followerId: req.userId, followingId: user.id } },
        })
      : null;
    if (!isFollowing) { res.status(403).json({ error: "This profile is private", isPrivate: true }); return; }
  }

  const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();
  const from = new Date(`${year}-01-01T00:00:00.000Z`);
  const to = new Date(`${year + 1}-01-01T00:00:00.000Z`);

  const entries = await prisma.gameEntry.findMany({
    where: { userId: user.id, updatedAt: { gte: from, lt: to } },
    include: { game: true },
  });

  // Status counts
  const statusCounts: Record<string, number> = {};
  for (const e of entries) statusCounts[e.status] = (statusCounts[e.status] ?? 0) + 1;

  // Genre breakdown from completed games
  const genreCounts: Record<string, number> = {};
  for (const e of entries) {
    const genres: string[] = JSON.parse(e.game.genres || "[]");
    genres.forEach((g) => { genreCounts[g] = (genreCounts[g] ?? 0) + 1; });
  }

  // Ratings
  const rated = entries.filter((e) => e.rating != null);
  const avgRating = rated.length > 0
    ? Math.round((rated.reduce((s, e) => s + e.rating!, 0) / rated.length) * 10) / 10
    : null;

  // Playtime
  const totalPlaytime = entries.reduce((s, e) => s + (e.playtime ?? 0), 0);

  // Activity by month (for chart)
  const activities = await prisma.activity.findMany({
    where: { userId: user.id, createdAt: { gte: from, lt: to } },
    select: { createdAt: true, type: true },
  });
  const byMonth: number[] = Array(12).fill(0);
  activities.forEach((a) => { byMonth[new Date(a.createdAt).getMonth()]++; });

  // Top rated games this year
  const topRated = entries
    .filter((e) => e.rating != null)
    .sort((a, b) => b.rating! - a.rating!)
    .slice(0, 5)
    .map((e) => ({ name: e.game.name, rawgId: e.game.rawgId, coverImage: e.game.coverImage, rating: e.rating }));

  res.json({
    year,
    totalGames: entries.length,
    statusCounts,
    genreBreakdown: Object.entries(genreCounts).sort((a, b) => b[1] - a[1]).slice(0, 8),
    avgRating,
    totalPlaytime,
    byMonth,
    topRated,
  });
});

router.get("/:username/activities", optionalAuth, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({ where: { username: String(req.params.username) } });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  // Private profile: only owner or followers can see activities
  if (user.isPrivate && req.userId !== user.id) {
    const isFollowing = req.userId
      ? await prisma.follow.findUnique({
          where: { followerId_followingId: { followerId: req.userId, followingId: user.id } },
        })
      : null;
    if (!isFollowing) {
      res.status(403).json({ error: "This profile is private", isPrivate: true });
      return;
    }
  }

  const activities = await prisma.activity.findMany({
    where: { userId: user.id },
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

// ──────────────────────────────────────────────
// Achievements
// ──────────────────────────────────────────────

/** All achievement definitions (for UI to show locked/unlocked state) */
router.get("/me/achievements", requireAuth, async (req: AuthRequest, res: Response) => {
  const earned = await prisma.userAchievement.findMany({
    where: { userId: req.userId! },
    select: { type: true, earnedAt: true },
  });
  const earnedMap = new Map(earned.map((a) => [a.type, a.earnedAt]));
  res.json(
    ACHIEVEMENTS.map((def) => ({
      ...def,
      earned: earnedMap.has(def.type),
      earnedAt: earnedMap.get(def.type) ?? null,
    }))
  );
});

router.get("/:username/achievements", optionalAuth, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({ where: { username: String(req.params.username) } });
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const earned = await prisma.userAchievement.findMany({
    where: { userId: user.id },
    select: { type: true, earnedAt: true },
  });
  const earnedMap = new Map(earned.map((a) => [a.type, a.earnedAt]));
  res.json(
    ACHIEVEMENTS.map((def) => ({
      ...def,
      earned: earnedMap.has(def.type),
      earnedAt: earnedMap.get(def.type) ?? null,
    }))
  );
});

// ──────────────────────────────────────────────
// Compare with friend
// ──────────────────────────────────────────────

router.get("/:username/compare", requireAuth, async (req: AuthRequest, res: Response) => {
  const target = await prisma.user.findUnique({
    where: { username: String(req.params.username) },
    select: { id: true, username: true, avatar: true, isPrivate: true },
  });
  if (!target) { res.status(404).json({ error: "User not found" }); return; }
  if (target.id === req.userId) { res.status(400).json({ error: "Cannot compare with yourself" }); return; }

  // Privacy: if target is private, only followers or self can compare
  if (target.isPrivate) {
    const isFollowing = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: req.userId!, followingId: target.id } },
    });
    if (!isFollowing) {
      res.status(403).json({ error: "This profile is private" });
      return;
    }
  }

  const entrySelect = {
    gameId: true,
    status: true,
    rating: true,
    game: { select: { id: true, rawgId: true, name: true, coverImage: true, genres: true } },
  } as const;

  const [myEntries, theirEntries] = await Promise.all([
    prisma.gameEntry.findMany({ where: { userId: req.userId! }, select: entrySelect }),
    prisma.gameEntry.findMany({ where: { userId: target.id }, select: entrySelect }),
  ]);

  const myMap = new Map(myEntries.map((e) => [e.gameId, e]));
  const theirMap = new Map(theirEntries.map((e) => [e.gameId, e]));

  const sharedGameIds = [...myMap.keys()].filter((id) => theirMap.has(id));
  const totalUnique = new Set([...myMap.keys(), ...theirMap.keys()]).size;
  const overlapPercent = totalUnique > 0 ? Math.round((sharedGameIds.length / totalUnique) * 100) : 0;

  const ratingDiffs = sharedGameIds
    .map((id) => {
      const myR = myMap.get(id)!.rating;
      const theirR = theirMap.get(id)!.rating;
      return myR != null && theirR != null ? Math.abs(myR - theirR) : null;
    })
    .filter((d): d is number => d !== null);

  const avgRatingDiff =
    ratingDiffs.length > 0
      ? Math.round((ratingDiffs.reduce((a, b) => a + b, 0) / ratingDiffs.length) * 10) / 10
      : null;

  const sharedGames = sharedGameIds.map((id) => {
    const me = myMap.get(id)!;
    const them = theirMap.get(id)!;
    return {
      game: { ...me.game, genres: JSON.parse(me.game.genres) as string[] },
      me: { status: me.status, rating: me.rating },
      them: { status: them.status, rating: them.rating },
    };
  });

  res.json({
    user: { username: target.username, avatar: target.avatar },
    stats: {
      myTotal: myEntries.length,
      theirTotal: theirEntries.length,
      sharedCount: sharedGameIds.length,
      overlapPercent,
      avgRatingDiff,
      ratedSharedCount: ratingDiffs.length,
    },
    sharedGames,
  });
});

// ──────────────────────────────────────────────
// Email preferences
// ──────────────────────────────────────────────

router.get("/me/email-preferences", requireAuth, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId! },
    select: { emailNotifications: true },
  });
  res.json(user);
});

export default router;
