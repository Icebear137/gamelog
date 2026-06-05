import { Router, Response } from "express";
import { z } from "zod";
import multer from "multer";
import prisma from "../lib/prisma";
import { requireAuth, optionalAuth, AuthRequest } from "../middleware/auth";
import { uploadToCloudinary, deleteFromCloudinary, extractPublicId } from "../lib/cloudinary";
import { getGameById, extractYear } from "../lib/rawg";

/** Resolve rawgId → internal game.id, fetching from RAWG and upserting if not in DB */
async function resolveGameId(rawgId: number): Promise<string | null> {
  let game = await prisma.game.findUnique({ where: { rawgId }, select: { id: true } });
  if (!game) {
    const rawgGame = await getGameById(rawgId);
    if (!rawgGame) return null;
    game = await prisma.game.upsert({
      where: { rawgId: rawgGame.id },
      create: {
        rawgId:      rawgGame.id,
        name:        rawgGame.name,
        slug:        rawgGame.slug,
        coverImage:  rawgGame.background_image ?? null,
        genres:      JSON.stringify(rawgGame.genres.map((g) => g.name)),
        releaseYear: extractYear(rawgGame.released),
        rawgRating:  rawgGame.rating ?? null,
      },
      update: { name: rawgGame.name, coverImage: rawgGame.background_image ?? null },
      select: { id: true },
    });
  }
  return game.id;
}

const uploadAvatar = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
});

const router = Router();

const CLUB_SELECT = {
  id: true, name: true, description: true, avatar: true,
  genre: true, pinnedPostId: true, createdAt: true, updatedAt: true,
  game: { select: { rawgId: true, name: true, coverImage: true } },
  creator: { select: { id: true, username: true, avatar: true } },
  _count: { select: { members: true, posts: true } },
};

const MEMBER_SELECT = {
  id: true, role: true, isBanned: true, joinedAt: true,
  user: {
    select: {
      id: true, username: true, avatar: true,
      _count: { select: { gameEntries: true } },
    },
  },
};

const POST_SELECT = {
  id: true, body: true, createdAt: true, updatedAt: true,
  user: { select: { id: true, username: true, avatar: true } },
  _count: { select: { comments: true, likes: true, reactions: true } },
  reactions: {
    select: { id: true, emoji: true, userId: true },
    orderBy: { createdAt: "asc" as const },
  },
};

const ClubSchema = z.object({
  name:        z.string().min(2).max(80),
  description: z.string().max(500).optional(),
  gameId:      z.string().nullable().optional(), // internal DB id or null to unlink
  rawgId:      z.number().int().optional(),      // alternative: pass rawgId, backend resolves
  genre:       z.string().max(40).optional(),
});

const PostSchema = z.object({ body: z.string().min(1).max(10000) });

// ── Helper: require admin role ────────────────────────────────────────────────
async function requireAdmin(clubId: string, userId: string) {
  const m = await prisma.gameClubMember.findUnique({
    where: { clubId_userId: { clubId, userId } },
  });
  return m?.role === "admin" ? m : null;
}

// ── Browse / Create ──────────────────────────────────────────────────────────

router.get("/", optionalAuth, async (req: AuthRequest, res: Response) => {
  const q     = (req.query.q as string)?.trim() || undefined;
  const genre = (req.query.genre as string)?.trim() || undefined;

  const clubs = await prisma.gameClub.findMany({
    where: {
      ...(q     ? { name: { contains: q } } : {}),
      ...(genre ? { genre: { contains: genre } } : {}),
    },
    orderBy: { members: { _count: "desc" } },
    take: 30,
    select: CLUB_SELECT,
  });

  const memberSet = new Set<string>();
  if (req.userId && clubs.length > 0) {
    const memberships = await prisma.gameClubMember.findMany({
      where: { userId: req.userId, clubId: { in: clubs.map((c) => c.id) }, isBanned: false },
      select: { clubId: true },
    });
    memberships.forEach((m) => memberSet.add(m.clubId));
  }

  res.json(clubs.map((c) => ({ ...c, isMember: memberSet.has(c.id) })));
});

router.post("/", requireAuth, async (req: AuthRequest, res: Response) => {
  const parsed = ClubSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  const { rawgId: rawgIdParam, ...rest } = parsed.data;
  const createData: Record<string, unknown> = { ...rest };

  if (rawgIdParam !== undefined) {
    const gameId = await resolveGameId(rawgIdParam);
    if (gameId) createData.gameId = gameId;
  }

  const club = await prisma.gameClub.create({
    data: {
      ...createData as any,
      createdBy: req.userId!,
      members: { create: { userId: req.userId!, role: "admin" } },
    },
    select: CLUB_SELECT,
  });
  res.status(201).json({ ...club, isMember: true });
});

// ── Single club ──────────────────────────────────────────────────────────────

router.get("/:id", optionalAuth, async (req: AuthRequest, res: Response) => {
  const club = await prisma.gameClub.findUnique({ where: { id: String(req.params.id) }, select: CLUB_SELECT });
  if (!club) { res.status(404).json({ error: "Club not found" }); return; }

  const myMember = req.userId
    ? await prisma.gameClubMember.findUnique({ where: { clubId_userId: { clubId: club.id, userId: req.userId } } })
    : null;

  const isMember = !!myMember && !myMember.isBanned;
  const isBanned = !!myMember?.isBanned;
  const myRole   = myMember?.role ?? null;

  const members = await prisma.gameClubMember.findMany({
    where: { clubId: club.id },
    orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
    select: MEMBER_SELECT,
  });

  // Fetch pinned post if set
  let pinnedPost = null;
  if (club.pinnedPostId) {
    pinnedPost = await prisma.gameClubPost.findUnique({ where: { id: club.pinnedPostId }, select: POST_SELECT });
  }

  // Frontend queries get_presence per member — no need to embed isOnline here
  const membersWithStatus = members;

  res.json({ ...club, isMember, isBanned, myRole, members: membersWithStatus, pinnedPost });
});

router.patch("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  const clubId = String(req.params.id);
  const admin  = await requireAdmin(clubId, req.userId!);
  if (!admin) { res.status(403).json({ error: "Only admins can edit club info" }); return; }

  const parsed = ClubSchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  const { rawgId: rawgIdParam, ...rest } = parsed.data;
  const updateData: Record<string, unknown> = { ...rest };

  // Resolve rawgId → internal gameId (fetch from RAWG and upsert if not in DB)
  if (rawgIdParam !== undefined) {
    updateData.gameId = rawgIdParam ? await resolveGameId(rawgIdParam) : null;
  }

  const updated = await prisma.gameClub.update({ where: { id: clubId }, data: updateData as any, select: CLUB_SELECT });
  res.json(updated);
});

// POST /:id/avatar — upload club avatar (admin only)
router.post("/:id/avatar", requireAuth, (req: AuthRequest, res: Response) => {
  const clubId = String(req.params.id);

  uploadAvatar.single("avatar")(req as any, res as any, async (err) => {
    if (err) { res.status(400).json({ error: err.message }); return; }
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) { res.status(400).json({ error: "No file provided" }); return; }

    const admin = await requireAdmin(clubId, req.userId!);
    if (!admin) { res.status(403).json({ error: "Forbidden" }); return; }

    try {
      const existing = await prisma.gameClub.findUnique({ where: { id: clubId }, select: { avatar: true } });
      if (existing?.avatar) {
        const oldId = extractPublicId(existing.avatar);
        if (oldId) deleteFromCloudinary(oldId).catch(() => {});
      }

      const { url } = await uploadToCloudinary(file.buffer, {
        folder: "gamelog/clubs",
        public_id: `club_${clubId}`,
        transformation: [{ width: 256, height: 256, crop: "fill" }, { fetch_format: "auto", quality: "auto" }],
      });

      const updated = await prisma.gameClub.update({
        where: { id: clubId },
        data: { avatar: url },
        select: CLUB_SELECT,
      });
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ error: e?.message ?? "Upload failed" });
    }
  });
});

router.delete("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  const clubId = String(req.params.id);
  const admin  = await requireAdmin(clubId, req.userId!);
  if (!admin) { res.status(403).json({ error: "Only admins can delete this club" }); return; }
  await prisma.gameClub.delete({ where: { id: clubId } });
  res.json({ deleted: true });
});

// ── Membership ───────────────────────────────────────────────────────────────

router.post("/:id/join", requireAuth, async (req: AuthRequest, res: Response) => {
  const clubId = String(req.params.id);
  const club   = await prisma.gameClub.findUnique({ where: { id: clubId } });
  if (!club) { res.status(404).json({ error: "Club not found" }); return; }

  // Block banned users
  const existing = await prisma.gameClubMember.findUnique({ where: { clubId_userId: { clubId, userId: req.userId! } } });
  if (existing?.isBanned) { res.status(403).json({ error: "You are banned from this club" }); return; }

  await prisma.gameClubMember.upsert({
    where: { clubId_userId: { clubId, userId: req.userId! } },
    create: { clubId, userId: req.userId! },
    update: { isBanned: false },
  });
  res.json({ joined: true });
});

router.delete("/:id/join", requireAuth, async (req: AuthRequest, res: Response) => {
  const clubId = String(req.params.id);
  const club   = await prisma.gameClub.findUnique({ where: { id: clubId } });
  if (!club) { res.status(404).json({ error: "Club not found" }); return; }
  if (club.createdBy === req.userId) { res.status(400).json({ error: "Creator cannot leave their own club" }); return; }

  await prisma.gameClubMember.deleteMany({ where: { clubId, userId: req.userId! } });
  res.json({ joined: false });
});

// ── Member management (admin only) ───────────────────────────────────────────

// PATCH /:id/members/:userId/role  { role: "admin" | "member" }
router.patch("/:id/members/:userId/role", requireAuth, async (req: AuthRequest, res: Response) => {
  const clubId = String(req.params.id);
  const targetId = String(req.params.userId);
  const { role } = req.body as { role?: string };
  if (role !== "admin" && role !== "member") { res.status(400).json({ error: "role must be admin or member" }); return; }

  const club = await prisma.gameClub.findUnique({ where: { id: clubId } });
  if (!club) { res.status(404).json({ error: "Club not found" }); return; }
  if (club.createdBy !== req.userId) { res.status(403).json({ error: "Only the club creator can change roles" }); return; }
  if (targetId === req.userId) { res.status(400).json({ error: "Cannot change your own role" }); return; }

  const updated = await prisma.gameClubMember.update({
    where: { clubId_userId: { clubId, userId: targetId } },
    data: { role },
    select: MEMBER_SELECT,
  });
  res.json(updated);
});

// DELETE /:id/members/:userId  — kick (admin) or self-leave
router.delete("/:id/members/:userId", requireAuth, async (req: AuthRequest, res: Response) => {
  const clubId   = String(req.params.id);
  const targetId = String(req.params.userId);

  const club = await prisma.gameClub.findUnique({ where: { id: clubId } });
  if (!club) { res.status(404).json({ error: "Club not found" }); return; }

  if (targetId !== req.userId) {
    // Kicking someone else — require admin
    const admin = await requireAdmin(clubId, req.userId!);
    if (!admin) { res.status(403).json({ error: "Forbidden" }); return; }
    if (targetId === club.createdBy) { res.status(400).json({ error: "Cannot kick the club creator" }); return; }
  }

  await prisma.gameClubMember.deleteMany({ where: { clubId, userId: targetId } });
  res.json({ kicked: true });
});

// POST /:id/members/:userId/ban  — ban user (admin)
router.post("/:id/members/:userId/ban", requireAuth, async (req: AuthRequest, res: Response) => {
  const clubId   = String(req.params.id);
  const targetId = String(req.params.userId);

  const admin = await requireAdmin(clubId, req.userId!);
  if (!admin) { res.status(403).json({ error: "Forbidden" }); return; }

  const club = await prisma.gameClub.findUnique({ where: { id: clubId } });
  if (targetId === club?.createdBy) { res.status(400).json({ error: "Cannot ban the creator" }); return; }

  await prisma.gameClubMember.upsert({
    where: { clubId_userId: { clubId, userId: targetId } },
    create: { clubId, userId: targetId, isBanned: true },
    update: { isBanned: true },
  });
  res.json({ banned: true });
});

// DELETE /:id/members/:userId/ban  — unban user (admin)
router.delete("/:id/members/:userId/ban", requireAuth, async (req: AuthRequest, res: Response) => {
  const clubId   = String(req.params.id);
  const targetId = String(req.params.userId);

  const admin = await requireAdmin(clubId, req.userId!);
  if (!admin) { res.status(403).json({ error: "Forbidden" }); return; }

  await prisma.gameClubMember.updateMany({
    where: { clubId, userId: targetId },
    data: { isBanned: false },
  });
  res.json({ banned: false });
});

/** Returns null (and sends 403) if user is banned from the club */
async function blockIfBanned(clubId: string, userId: string, res: Response): Promise<boolean> {
  const m = await prisma.gameClubMember.findUnique({
    where: { clubId_userId: { clubId, userId } },
    select: { isBanned: true },
  });
  if (m?.isBanned) {
    res.status(403).json({ error: "You are banned from this club" });
    return true;
  }
  return false;
}

// ── Posts ────────────────────────────────────────────────────────────────────

router.get("/:id/posts", optionalAuth, async (req: AuthRequest, res: Response) => {
  const clubId = String(req.params.id);
  const sort   = (req.query.sort as string) || "newest";

  let orderBy: Record<string, unknown> = { createdAt: "desc" };
  if (sort === "popular") orderBy = { likes: { _count: "desc" } };

  const posts = await prisma.gameClubPost.findMany({
    where: { clubId },
    orderBy,
    take: 50,
    select: POST_SELECT,
  });

  let sorted = posts;
  if (sort === "trending") {
    const now = Date.now();
    sorted = [...posts].sort((a, b) => {
      const score = (p: typeof a) => (p._count.likes + p._count.comments * 2) / Math.pow((now - new Date(p.createdAt).getTime()) / 3_600_000 + 2, 1.5);
      return score(b) - score(a);
    });
  }

  const likedSet = new Set<string>();
  if (req.userId && sorted.length > 0) {
    const likes = await prisma.gameClubPostLike.findMany({
      where: { userId: req.userId, postId: { in: sorted.map((p) => p.id) } },
      select: { postId: true },
    });
    likes.forEach((l) => likedSet.add(l.postId));
  }

  res.json(sorted.map((p) => ({ ...p, likedByMe: likedSet.has(p.id) })));
});

router.post("/:id/posts", requireAuth, async (req: AuthRequest, res: Response) => {
  const clubId = String(req.params.id);
  const member = await prisma.gameClubMember.findUnique({ where: { clubId_userId: { clubId, userId: req.userId! } } });
  if (!member || member.isBanned) { res.status(403).json({ error: "Join the club to post" }); return; }

  const parsed = PostSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  const post = await prisma.gameClubPost.create({
    data: { clubId, userId: req.userId!, body: parsed.data.body },
    select: POST_SELECT,
  });
  res.status(201).json({ ...post, likedByMe: false });
});

// PATCH /:id/posts/:postId  — edit post (author only)
router.patch("/:id/posts/:postId", requireAuth, async (req: AuthRequest, res: Response) => {
  const postId = String(req.params.postId);
  const post   = await prisma.gameClubPost.findUnique({ where: { id: postId } });
  if (!post || post.userId !== req.userId) { res.status(403).json({ error: "Forbidden" }); return; }

  const parsed = PostSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  const updated = await prisma.gameClubPost.update({
    where: { id: postId },
    data: { body: parsed.data.body },
    select: POST_SELECT,
  });
  res.json({ ...updated, likedByMe: false });
});

router.delete("/:id/posts/:postId", requireAuth, async (req: AuthRequest, res: Response) => {
  const clubId = String(req.params.id);
  const postId = String(req.params.postId);
  const post   = await prisma.gameClubPost.findUnique({ where: { id: postId } });
  if (!post) { res.status(404).json({ error: "Post not found" }); return; }

  // Allow: post author OR club admin
  const isAdmin = await requireAdmin(clubId, req.userId!);
  if (post.userId !== req.userId && !isAdmin) { res.status(403).json({ error: "Forbidden" }); return; }

  // Unpin if pinned
  await prisma.gameClub.updateMany({ where: { id: clubId, pinnedPostId: postId }, data: { pinnedPostId: null } });
  await prisma.gameClubPost.delete({ where: { id: postId } });
  res.json({ deleted: true });
});

// ── Pin post (admin) ─────────────────────────────────────────────────────────

router.post("/:id/pin/:postId", requireAuth, async (req: AuthRequest, res: Response) => {
  const clubId = String(req.params.id);
  const postId = String(req.params.postId);
  const admin  = await requireAdmin(clubId, req.userId!);
  if (!admin) { res.status(403).json({ error: "Forbidden" }); return; }

  const current = await prisma.gameClub.findUnique({ where: { id: clubId }, select: { pinnedPostId: true } });
  const newPinnedId = current?.pinnedPostId === postId ? null : postId; // toggle
  await prisma.gameClub.update({ where: { id: clubId }, data: { pinnedPostId: newPinnedId } });
  res.json({ pinnedPostId: newPinnedId });
});

// ── Post Likes ───────────────────────────────────────────────────────────────

router.post("/:id/posts/:postId/like", requireAuth, async (req: AuthRequest, res: Response) => {
  const clubId  = String(req.params.id);
  const postId  = String(req.params.postId);
  if (await blockIfBanned(clubId, req.userId!, res)) return;
  await prisma.gameClubPostLike.upsert({
    where: { postId_userId: { postId, userId: req.userId! } },
    create: { postId, userId: req.userId! },
    update: {},
  });
  const count = await prisma.gameClubPostLike.count({ where: { postId } });
  res.json({ liked: true, count });
});

router.delete("/:id/posts/:postId/like", requireAuth, async (req: AuthRequest, res: Response) => {
  const clubId = String(req.params.id);
  const postId = String(req.params.postId);
  if (await blockIfBanned(clubId, req.userId!, res)) return;
  await prisma.gameClubPostLike.deleteMany({ where: { postId, userId: req.userId! } });
  const count = await prisma.gameClubPostLike.count({ where: { postId } });
  res.json({ liked: false, count });
});

// ── Reactions ────────────────────────────────────────────────────────────────

const ALLOWED_EMOJIS = new Set(["👍", "❤️", "😂", "😮", "😢", "🔥", "🎮", "👏"]);

router.post("/:id/posts/:postId/reactions", requireAuth, async (req: AuthRequest, res: Response) => {
  const clubId = String(req.params.id);
  const postId = String(req.params.postId);
  if (await blockIfBanned(clubId, req.userId!, res)) return;
  const { emoji } = req.body as { emoji?: string };
  if (!emoji || !ALLOWED_EMOJIS.has(emoji)) { res.status(400).json({ error: "Invalid emoji" }); return; }

  const existing = await prisma.gameClubPostReaction.findUnique({
    where: { postId_userId_emoji: { postId, userId: req.userId!, emoji } },
  });
  if (existing) {
    await prisma.gameClubPostReaction.delete({ where: { id: existing.id } });
  } else {
    await prisma.gameClubPostReaction.create({ data: { postId, userId: req.userId!, emoji } });
  }

  const reactions = await prisma.gameClubPostReaction.findMany({
    where: { postId },
    select: { id: true, emoji: true, userId: true },
    orderBy: { createdAt: "asc" },
  });
  res.json({ reactions });
});

// ── Comments ─────────────────────────────────────────────────────────────────

router.get("/:id/posts/:postId/comments", async (_req, res: Response) => {
  const comments = await prisma.gameClubComment.findMany({
    where: { postId: String(_req.params.postId) },
    orderBy: { createdAt: "asc" },
    select: {
      id: true, body: true, createdAt: true,
      user: { select: { id: true, username: true, avatar: true } },
    },
  });
  res.json(comments);
});

router.post("/:id/posts/:postId/comments", requireAuth, async (req: AuthRequest, res: Response) => {
  if (await blockIfBanned(String(req.params.id), req.userId!, res)) return;
  const { body } = req.body as { body?: string };
  if (!body?.trim()) { res.status(400).json({ error: "Body required" }); return; }

  const comment = await prisma.gameClubComment.create({
    data: { postId: String(req.params.postId), userId: req.userId!, body: body.trim().slice(0, 500) },
    select: {
      id: true, body: true, createdAt: true,
      user: { select: { id: true, username: true, avatar: true } },
    },
  });
  res.status(201).json(comment);
});

router.delete("/:id/posts/:postId/comments/:commentId", requireAuth, async (req: AuthRequest, res: Response) => {
  const comment = await prisma.gameClubComment.findUnique({ where: { id: String(req.params.commentId) } });
  if (!comment || comment.userId !== req.userId) { res.status(403).json({ error: "Forbidden" }); return; }
  await prisma.gameClubComment.delete({ where: { id: comment.id } });
  res.json({ deleted: true });
});

export default router;
