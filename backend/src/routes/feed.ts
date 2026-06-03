import { Router, Response } from "express";
import prisma from "../lib/prisma";
import { requireAuth, optionalAuth, AuthRequest } from "../middleware/auth";
import { ACTIVITY_SELECT } from "../lib/selects";

const router = Router();

// Privacy note: the personal feed intentionally shows posts from ALL users you follow,
// even if their profile is private. Following someone is an explicit access grant —
// it would be confusing to follow someone and still not see their posts.
// Profile page endpoints (/activities, /games) enforce isPrivate for non-followers.
router.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = 20;

  const following = await prisma.follow.findMany({
    where: { followerId: req.userId! },
    select: { followingId: true },
  });
  const followingIds = following.map((f) => f.followingId);
  followingIds.push(req.userId!);

  const activities = await prisma.activity.findMany({
    where: { userId: { in: followingIds } },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * limit,
    take: limit,
    select: ACTIVITY_SELECT,
  });

  const likedSet = new Set(
    (
      await prisma.like.findMany({
        where: { userId: req.userId!, activityId: { in: activities.map((a) => a.id) } },
        select: { activityId: true },
      })
    ).map((l) => l.activityId)
  );

  res.json(
    activities
      .filter((a) => a.gameEntry?.game != null)
      .map((a) => ({
        ...a,
        gameEntry: {
          ...a.gameEntry,
          game: { ...a.gameEntry!.game },
        },
        likedByMe: likedSet.has(a.id),
      }))
  );
});

router.get("/global", optionalAuth, async (req: AuthRequest, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = 20;

  const activities = await prisma.activity.findMany({
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * limit,
    take: limit,
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

// ---------------------------------------------------------------------------
// GET /api/feed/leaderboard?period=week|month|alltime&category=games|reviews|likes
// ---------------------------------------------------------------------------
router.get("/leaderboard", async (req: AuthRequest, res: Response) => {
  const period   = (req.query.period as string)   || "week";
  const category = (req.query.category as string) || "games";

  const now  = new Date();
  let since: Date | undefined;
  if (period === "week")  since = new Date(now.getTime() - 7  * 24 * 60 * 60 * 1000);
  if (period === "month") since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const dateFilter = since ? { gte: since } : undefined;

  let rows: { userId: string; score: number }[] = [];

  if (category === "games") {
    // Most games COMPLETED in period
    const data = await prisma.activity.groupBy({
      by: ["userId"],
      where: { type: "COMPLETED", ...(dateFilter ? { createdAt: dateFilter } : {}) },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 20,
    });
    rows = data.map((d) => ({ userId: d.userId, score: d._count.id }));
  } else if (category === "reviews") {
    // Most reviews written (entries with non-null review, ordered by updatedAt)
    const data = await prisma.gameEntry.groupBy({
      by: ["userId"],
      where: { review: { not: null }, ...(dateFilter ? { updatedAt: dateFilter } : {}) },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 20,
    });
    rows = data.map((d) => ({ userId: d.userId, score: d._count.id }));
  } else if (category === "likes") {
    // Count likes received per activity owner
    const likes = await prisma.like.findMany({
      where: dateFilter ? { createdAt: dateFilter } : {},
      select: { activity: { select: { userId: true } } },
      take: 5000,
    });
    const countMap = new Map<string, number>();
    for (const l of likes) {
      if (!l.activity) continue;
      const uid = l.activity.userId;
      countMap.set(uid, (countMap.get(uid) ?? 0) + 1);
    }
    rows = Array.from(countMap.entries())
      .map(([userId, score]) => ({ userId, score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);
  }

  if (rows.length === 0) { res.json([]); return; }

  const users = await prisma.user.findMany({
    where: { id: { in: rows.map((r) => r.userId), }, isPrivate: false },
    select: { id: true, username: true, avatar: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  res.json(
    rows
      .filter((r) => userMap.has(r.userId))
      .map((r, i) => ({ rank: i + 1, score: r.score, user: userMap.get(r.userId)! }))
  );
});

export default router;
