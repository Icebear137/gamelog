import { Router, Response } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

const VALID_TYPES   = ["REVIEW", "ACTIVITY_COMMENT", "LIST_COMMENT", "CLUB_POST", "CLUB_COMMENT", "CLUB"] as const;
const VALID_REASONS = ["SPAM", "INAPPROPRIATE", "HARASSMENT", "MISINFORMATION", "OTHER"] as const;

// Web-admin scope: reports not handled by club admins
const WEB_ADMIN_TYPES = ["REVIEW", "ACTIVITY_COMMENT", "LIST_COMMENT", "CLUB"] as const;
// Club-admin scope
const CLUB_SCOPED_TYPES = ["CLUB_POST", "CLUB_COMMENT"] as const;

const ReportSchema = z.object({
  type:        z.enum(VALID_TYPES),
  targetId:    z.string().min(1),
  reason:      z.enum(VALID_REASONS),
  description: z.string().max(500).optional(),
});

// ── Submit report ──────────────────────────────────────────────────────────────

router.post("/", requireAuth, async (req: AuthRequest, res: Response) => {
  const parsed = ReportSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  const { type, targetId, reason, description } = parsed.data;
  try {
    await prisma.report.create({
      data: { reporterId: req.userId!, type, targetId, reason, description: description ?? null },
    });
  } catch (e: any) {
    if (e?.code === "P2002") { res.status(409).json({ error: "You have already reported this content" }); return; }
    throw e;
  }
  res.status(201).json({ ok: true });
});

// ── Helper: fetch content preview per report type ─────────────────────────────

async function getContentPreview(type: string, targetId: string) {
  try {
    if (type === "REVIEW") {
      const e = await prisma.gameEntry.findUnique({
        where: { id: targetId },
        select: { review: true, user: { select: { id: true, username: true, avatar: true } }, game: { select: { name: true, rawgId: true } } },
      });
      return e ? { text: e.review?.slice(0, 200), author: e.user, meta: e.game?.name } : null;
    }
    if (type === "ACTIVITY_COMMENT") {
      const c = await prisma.comment.findUnique({
        where: { id: targetId },
        select: { body: true, user: { select: { id: true, username: true, avatar: true } } },
      });
      return c ? { text: c.body.slice(0, 200), author: c.user } : null;
    }
    if (type === "LIST_COMMENT") {
      const c = await prisma.gameListComment.findUnique({
        where: { id: targetId },
        select: { body: true, user: { select: { id: true, username: true, avatar: true } } },
      });
      return c ? { text: c.body.slice(0, 200), author: c.user } : null;
    }
    if (type === "CLUB") {
      const club = await prisma.gameClub.findUnique({
        where: { id: targetId },
        select: { name: true, description: true, creator: { select: { id: true, username: true, avatar: true } } },
      });
      return club ? { text: club.description?.slice(0, 200) ?? "", author: club.creator, meta: club.name } : null;
    }
    if (type === "CLUB_POST") {
      const p = await prisma.gameClubPost.findUnique({
        where: { id: targetId },
        select: { body: true, clubId: true, user: { select: { id: true, username: true, avatar: true } } },
      });
      // Strip HTML tags for preview
      const text = p?.body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 200);
      return p ? { text, author: p.user, clubId: p.clubId } : null;
    }
    if (type === "CLUB_COMMENT") {
      const c = await prisma.gameClubComment.findUnique({
        where: { id: targetId },
        select: { body: true, postId: true, user: { select: { id: true, username: true, avatar: true } }, post: { select: { clubId: true } } },
      });
      return c ? { text: c.body.slice(0, 200), author: c.user, clubId: c.post?.clubId } : null;
    }
  } catch { /* content may have been deleted */ }
  return null;
}

// ── Web admin: get all non-club reports ───────────────────────────────────────

router.get("/admin", requireAuth, async (req: AuthRequest, res: Response) => {
  const me = await prisma.user.findUnique({ where: { id: req.userId! }, select: { isAdmin: true } });
  if (!me?.isAdmin) { res.status(403).json({ error: "Forbidden" }); return; }

  const status = (req.query.status as string) || "PENDING";
  const type   = req.query.type as string | undefined;

  const reports = await prisma.report.findMany({
    where: {
      status,
      type: type ? { equals: type } : { in: WEB_ADMIN_TYPES as unknown as string[] },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true, type: true, targetId: true, reason: true, description: true, status: true, createdAt: true,
      reporter: { select: { id: true, username: true, avatar: true } },
    },
  });

  // Attach content preview
  const withPreview = await Promise.all(
    reports.map(async (r) => ({ ...r, preview: await getContentPreview(r.type, r.targetId) }))
  );

  res.json(withPreview);
});

// ── Web admin: stats ──────────────────────────────────────────────────────────

router.get("/admin/stats", requireAuth, async (req: AuthRequest, res: Response) => {
  const me = await prisma.user.findUnique({ where: { id: req.userId! }, select: { isAdmin: true } });
  if (!me?.isAdmin) { res.status(403).json({ error: "Forbidden" }); return; }

  const counts = await prisma.report.groupBy({
    by: ["type", "status"],
    where: { type: { in: WEB_ADMIN_TYPES as unknown as string[] } },
    _count: true,
  });
  res.json(counts);
});

// ── Club admin: get reports for their club ────────────────────────────────────

router.get("/club/:clubId", requireAuth, async (req: AuthRequest, res: Response) => {
  const clubId = String(req.params.clubId);
  const member = await prisma.gameClubMember.findUnique({
    where: { clubId_userId: { clubId, userId: req.userId! } },
    select: { role: true },
  });
  if (member?.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }

  const status = (req.query.status as string) || "PENDING";

  const reports = await prisma.report.findMany({
    where: {
      status,
      type: { in: CLUB_SCOPED_TYPES as unknown as string[] },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true, type: true, targetId: true, reason: true, description: true, status: true, createdAt: true,
      reporter: { select: { id: true, username: true, avatar: true } },
    },
  });

  // Filter to only this club's content
  const withPreview = (
    await Promise.all(reports.map(async (r) => ({ ...r, preview: await getContentPreview(r.type, r.targetId) })))
  ).filter((r) => r.preview && (r.preview as any).clubId === clubId);

  res.json(withPreview);
});

// ── Update report status (resolve) ────────────────────────────────────────────

router.patch("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  const reportId = String(req.params.id);
  const { status, deleteContent } = req.body as { status?: string; deleteContent?: boolean };

  const report = await prisma.report.findUnique({ where: { id: reportId } });
  if (!report) { res.status(404).json({ error: "Not found" }); return; }

  // Check permission: web admin for non-club types, club admin for club types
  const me = await prisma.user.findUnique({ where: { id: req.userId! }, select: { isAdmin: true } });

  if ((CLUB_SCOPED_TYPES as readonly string[]).includes(report.type)) {
    // Club admin permission check
    const preview = await getContentPreview(report.type, report.targetId);
    const clubId = (preview as any)?.clubId;
    if (!clubId) { res.status(404).json({ error: "Content not found" }); return; }
    const member = await prisma.gameClubMember.findUnique({
      where: { clubId_userId: { clubId, userId: req.userId! } },
      select: { role: true },
    });
    if (member?.role !== "admin" && !me?.isAdmin) { res.status(403).json({ error: "Forbidden" }); return; }
  } else {
    if (!me?.isAdmin) { res.status(403).json({ error: "Forbidden" }); return; }
  }

  // Optionally delete the reported content
  if (deleteContent) {
    try {
      if (report.type === "REVIEW") {
        await prisma.gameEntry.update({ where: { id: report.targetId }, data: { review: null, rating: null } });
      } else if (report.type === "ACTIVITY_COMMENT") {
        await prisma.comment.delete({ where: { id: report.targetId } });
      } else if (report.type === "LIST_COMMENT") {
        await prisma.gameListComment.delete({ where: { id: report.targetId } });
      } else if (report.type === "CLUB_POST") {
        await prisma.gameClubPost.delete({ where: { id: report.targetId } });
      } else if (report.type === "CLUB_COMMENT") {
        await prisma.gameClubComment.delete({ where: { id: report.targetId } });
      } else if (report.type === "CLUB") {
        await prisma.gameClub.delete({ where: { id: report.targetId } });
      }
    } catch { /* content may already be deleted */ }
  }

  const updated = await prisma.report.update({
    where: { id: reportId },
    data: { status: status ?? "REVIEWED" },
  });

  res.json(updated);
});

export default router;
