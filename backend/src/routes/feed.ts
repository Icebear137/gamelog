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

export default router;
