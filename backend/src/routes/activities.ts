import { Router, Response } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { requireAuth, optionalAuth, AuthRequest } from "../middleware/auth";
import { emitToUser } from "../lib/socket";

const router = Router();

const CommentSchema = z.object({ body: z.string().min(1).max(500) });

router.get("/:id", optionalAuth, async (req: AuthRequest, res: Response) => {
  const id = String(req.params.id);
  const activity = await prisma.activity.findUnique({
    where: { id },
    select: {
      id: true,
      type: true,
      createdAt: true,
      user: { select: { id: true, username: true, avatar: true } },
      gameEntry: {
        select: {
          id: true,
          status: true,
          rating: true,
          review: true,
          playtime: true,
          game: {
            select: { id: true, rawgId: true, name: true, slug: true, coverImage: true, genres: true },
          },
        },
      },
      _count: { select: { likes: true, comments: true } },
    },
  });
  if (!activity || !activity.gameEntry?.game) {
    res.status(404).json({ error: "Activity not found" });
    return;
  }
  const likedByMe = req.userId
    ? !!(await prisma.like.findUnique({
        where: { userId_activityId: { userId: req.userId, activityId: id } },
      }))
    : false;
  res.json({ ...activity, likedByMe });
});

router.post("/:id/like", requireAuth, async (req: AuthRequest, res: Response) => {
  const id = String(req.params.id);
  const activity = await prisma.activity.findUnique({ where: { id } });
  if (!activity) {
    res.status(404).json({ error: "Activity not found" });
    return;
  }
  const existingLike = await prisma.like.findUnique({
    where: { userId_activityId: { userId: req.userId!, activityId: id } },
  });
  await prisma.like.upsert({
    where: { userId_activityId: { userId: req.userId!, activityId: id } },
    create: { userId: req.userId!, activityId: id },
    update: {},
  });
  if (!existingLike && activity.userId !== req.userId) {
    const notif = await prisma.notification.create({
      data: { userId: activity.userId, actorId: req.userId!, type: "LIKE", activityId: id },
      select: {
        id: true, type: true, read: true, createdAt: true,
        actor: { select: { id: true, username: true, avatar: true } },
        activity: { select: { id: true, gameEntry: { select: { game: { select: { name: true, rawgId: true } } } } } },
      },
    });
    emitToUser(activity.userId, "notification", notif);
  }
  const count = await prisma.like.count({ where: { activityId: id } });
  res.json({ liked: true, count });
});

router.delete("/:id/like", requireAuth, async (req: AuthRequest, res: Response) => {
  const id = String(req.params.id);
  await prisma.like.deleteMany({ where: { userId: req.userId!, activityId: id } });
  const count = await prisma.like.count({ where: { activityId: id } });
  res.json({ liked: false, count });
});

router.get("/:id/comments", async (req: AuthRequest, res: Response) => {
  const id = String(req.params.id);
  const comments = await prisma.comment.findMany({
    where: { activityId: id },
    include: { user: { select: { id: true, username: true, avatar: true } } },
    orderBy: { createdAt: "asc" },
    take: 50, // cap at 50 to prevent unbounded response
  });
  res.json(comments);
});

router.post("/:id/comments", requireAuth, async (req: AuthRequest, res: Response) => {
  const id = String(req.params.id);
  const parsed = CommentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const activity = await prisma.activity.findUnique({ where: { id } });
  if (!activity) {
    res.status(404).json({ error: "Activity not found" });
    return;
  }
  const comment = await prisma.comment.create({
    data: { userId: req.userId!, activityId: id, body: parsed.data.body },
    include: { user: { select: { id: true, username: true, avatar: true } } },
  });

  // Notify the activity owner (COMMENT), skip if they're the commenter
  if (activity.userId !== req.userId) {
    const notif = await prisma.notification.create({
      data: { userId: activity.userId, actorId: req.userId!, type: "COMMENT", activityId: id },
      select: {
        id: true, type: true, read: true, createdAt: true,
        actor: { select: { id: true, username: true, avatar: true } },
        activity: { select: { id: true, gameEntry: { select: { game: { select: { name: true, rawgId: true } } } } } },
      },
    });
    emitToUser(activity.userId, "notification", notif);
  }

  // Notify @mentioned users (MENTION) — skip commenter and activity owner (already notified above)
  const mentionMatches = [...new Set((parsed.data.body.match(/@(\w+)/g) ?? []).map((m) => m.slice(1).toLowerCase()))];
  if (mentionMatches.length > 0) {
    const mentionedUsers = await prisma.user.findMany({
      where: { username: { in: mentionMatches } },
      select: { id: true },
    });
    const notifSelect = {
      id: true, type: true, read: true, createdAt: true,
      actor: { select: { id: true, username: true, avatar: true } },
      activity: { select: { id: true, gameEntry: { select: { game: { select: { name: true, rawgId: true } } } } } },
    };
    for (const mentionedUser of mentionedUsers) {
      if (mentionedUser.id === req.userId || mentionedUser.id === activity.userId) continue;
      const mentionNotif = await prisma.notification.create({
        data: { userId: mentionedUser.id, actorId: req.userId!, type: "MENTION", activityId: id },
        select: notifSelect,
      });
      emitToUser(mentionedUser.id, "notification", mentionNotif);
    }
  }

  res.status(201).json(comment);
});

export default router;
