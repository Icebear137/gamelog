import { Router, Response } from "express";
import prisma from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

router.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.userId! },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      id: true,
      type: true,
      read: true,
      createdAt: true,
      actor: { select: { id: true, username: true, avatar: true } },
      activity: {
        select: {
          id: true,
          gameEntry: { select: { game: { select: { name: true, rawgId: true } } } },
        },
      },
    },
  });
  res.json(notifications);
});

router.get("/unread-count", requireAuth, async (req: AuthRequest, res: Response) => {
  const count = await prisma.notification.count({
    where: { userId: req.userId!, read: false },
  });
  res.json({ count });
});

router.post("/read-all", requireAuth, async (req: AuthRequest, res: Response) => {
  await prisma.notification.updateMany({
    where: { userId: req.userId!, read: false },
    data: { read: true },
  });
  res.json({ ok: true });
});

export default router;
