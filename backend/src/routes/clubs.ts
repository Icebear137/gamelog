import { Router, Response } from "express";
import { z } from "zod";
import multer from "multer";
import prisma from "../lib/prisma";
import { requireAuth, optionalAuth, AuthRequest } from "../middleware/auth";
import { emitToUser } from "../lib/socket";
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
  genre: true, isPrivate: true, pinnedPostId: true, createdAt: true, updatedAt: true,
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
  gameId:      z.string().nullable().optional(),
  rawgId:      z.number().int().optional(),
  genre:       z.string().max(40).optional(),
  isPrivate:   z.boolean().optional(),
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

  // Get user's joined club IDs for membership check + private-club visibility
  const memberSet = new Set<string>();
  if (req.userId) {
    const memberships = await prisma.gameClubMember.findMany({
      where: { userId: req.userId, isBanned: false },
      select: { clubId: true },
    });
    memberships.forEach((m) => memberSet.add(m.clubId));
  }

  const clubs = await prisma.gameClub.findMany({
    where: {
      ...(q     ? { name: { contains: q } } : {}),
      ...(genre ? { genre: { contains: genre } } : {}),
    },
    orderBy: { members: { _count: "desc" } },
    take: 30,
    select: CLUB_SELECT,
  });

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

// ── Club feed (posts from all joined clubs) ──────────────────────────────────

router.get("/feed", requireAuth, async (req: AuthRequest, res: Response) => {
  const sort = (req.query.sort as string) === "popular" ? "popular" : "recent";

  const memberships = await prisma.gameClubMember.findMany({
    where: { userId: req.userId!, isBanned: false },
    select: { clubId: true },
  });

  const clubIds = memberships.map((m) => m.clubId);
  if (clubIds.length === 0) { res.json([]); return; }

  const posts = await prisma.gameClubPost.findMany({
    where: { clubId: { in: clubIds } },
    orderBy: sort === "popular" ? { likes: { _count: "desc" } } : { createdAt: "desc" },
    take: 30,
    select: {
      id: true, body: true, clubId: true, createdAt: true, updatedAt: true,
      club: { select: { id: true, name: true, avatar: true } },
      user: { select: { id: true, username: true, avatar: true } },
      _count: { select: { likes: true, comments: true } },
      likes: { where: { userId: req.userId! }, select: { id: true } },
    },
  });

  res.json(posts.map((p) => ({
    type: "club_post" as const,
    id: p.id,
    body: p.body,
    clubId: p.clubId,
    club: p.club,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    likedByMe: p.likes.length > 0,
    user: p.user,
    _count: { likes: p._count.likes, comments: p._count.comments },
  })));
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

  // Private club: non-members only see basic info (no posts/members)
  if ((club as any).isPrivate && !isMember) {
    const myRequest = req.userId
      ? await prisma.gameClubJoinRequest.findUnique({
          where: { clubId_userId: { clubId: club.id, userId: req.userId } },
          select: { id: true, status: true, createdAt: true },
        })
      : null;
    return res.json({ ...club, isMember: false, isBanned, myRole: null, members: [], pinnedPost: null, myRequest });
  }

  const members = await prisma.gameClubMember.findMany({
    where: { clubId: club.id },
    orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
    select: MEMBER_SELECT,
  });

  let pinnedPost = null;
  if (club.pinnedPostId) {
    pinnedPost = await prisma.gameClubPost.findUnique({ where: { id: club.pinnedPostId }, select: POST_SELECT });
  }

  const myRequest = req.userId
    ? await prisma.gameClubJoinRequest.findUnique({
        where: { clubId_userId: { clubId: club.id, userId: req.userId } },
        select: { id: true, status: true, createdAt: true },
      })
    : null;

  res.json({ ...club, isMember, isBanned, myRole, members, pinnedPost, myRequest });
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

  const existing = await prisma.gameClubMember.findUnique({ where: { clubId_userId: { clubId, userId: req.userId! } } });
  if (existing?.isBanned) { res.status(403).json({ error: "You are banned from this club" }); return; }

  if (club.isPrivate) {
    res.status(403).json({ error: "This club requires admin approval to join", requiresRequest: true });
    return;
  }

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
  // Clear join request so user can re-apply if club is private
  await prisma.gameClubJoinRequest.deleteMany({ where: { clubId, userId: req.userId! } });
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
  await prisma.gameClubJoinRequest.deleteMany({ where: { clubId, userId: targetId } });
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

  // Block non-members from reading private club posts
  const club = await prisma.gameClub.findUnique({ where: { id: clubId }, select: { isPrivate: true } });
  if (club?.isPrivate) {
    const isMember = req.userId
      ? !!(await prisma.gameClubMember.findUnique({ where: { clubId_userId: { clubId, userId: req.userId } }, select: { id: true } }))
      : false;
    if (!isMember) { res.status(403).json({ error: "This club is private" }); return; }
  }

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

  // Notify all other non-banned members (fire-and-forget)
  prisma.gameClub.findUnique({ where: { id: clubId }, select: { name: true } }).then(async (club) => {
    if (!club) return;
    const others = await prisma.gameClubMember.findMany({
      where: { clubId, userId: { not: req.userId! }, isBanned: false },
      select: { userId: true },
    });
    // Check per-member notifFollow preference is not relevant here; use a flat check
    const NOTIF_SELECT = {
      id: true, type: true, read: true, createdAt: true, clubPostId: true, clubId: true, clubName: true,
      actor: { select: { id: true, username: true, avatar: true } },
    };
    for (const { userId } of others) {
      const notif = await prisma.notification.create({
        data: { userId, actorId: req.userId!, type: "CLUB_POST", clubPostId: post.id, clubId, clubName: club.name },
        select: NOTIF_SELECT,
      });
      emitToUser(userId, "notification", notif);
    }
  }).catch(() => {});

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

// ── Join Questions (admin only) ───────────────────────────────────────────────

router.get("/:id/questions", optionalAuth, async (req: AuthRequest, res: Response) => {
  const questions = await prisma.gameClubJoinQuestion.findMany({
    where: { clubId: String(req.params.id) },
    orderBy: { order: "asc" },
    select: { id: true, question: true, required: true, order: true },
  });
  res.json(questions);
});

router.post("/:id/questions", requireAuth, async (req: AuthRequest, res: Response) => {
  const clubId = String(req.params.id);
  const admin  = await requireAdmin(clubId, req.userId!);
  if (!admin) { res.status(403).json({ error: "Admin only" }); return; }

  const { question, required = true } = req.body as { question?: string; required?: boolean };
  if (!question?.trim()) { res.status(400).json({ error: "Question text required" }); return; }

  const count = await prisma.gameClubJoinQuestion.count({ where: { clubId } });
  if (count >= 5) { res.status(400).json({ error: "Maximum 5 questions allowed" }); return; }

  const q = await prisma.gameClubJoinQuestion.create({
    data: { clubId, question: question.trim().slice(0, 300), required: !!required, order: count },
    select: { id: true, question: true, required: true, order: true },
  });
  res.status(201).json(q);
});

router.patch("/:id/questions/:qId", requireAuth, async (req: AuthRequest, res: Response) => {
  const clubId = String(req.params.id);
  const admin  = await requireAdmin(clubId, req.userId!);
  if (!admin) { res.status(403).json({ error: "Admin only" }); return; }

  const { question, required } = req.body as { question?: string; required?: boolean };
  const updated = await prisma.gameClubJoinQuestion.update({
    where: { id: String(req.params.qId) },
    data: {
      ...(question !== undefined ? { question: question.trim().slice(0, 300) } : {}),
      ...(required !== undefined ? { required } : {}),
    },
    select: { id: true, question: true, required: true, order: true },
  });
  res.json(updated);
});

router.delete("/:id/questions/:qId", requireAuth, async (req: AuthRequest, res: Response) => {
  const clubId = String(req.params.id);
  const admin  = await requireAdmin(clubId, req.userId!);
  if (!admin) { res.status(403).json({ error: "Admin only" }); return; }
  await prisma.gameClubJoinQuestion.delete({ where: { id: String(req.params.qId) } });
  res.json({ deleted: true });
});

// ── Join Requests ─────────────────────────────────────────────────────────────

// GET /:id/requests — admin sees all pending requests with answers
router.get("/:id/requests", requireAuth, async (req: AuthRequest, res: Response) => {
  const clubId = String(req.params.id);
  const admin  = await requireAdmin(clubId, req.userId!);
  if (!admin) { res.status(403).json({ error: "Admin only" }); return; }

  const requests = await prisma.gameClubJoinRequest.findMany({
    where: { clubId, status: "PENDING" },
    orderBy: { createdAt: "asc" },
    select: {
      id: true, status: true, rejectionNote: true, createdAt: true,
      user: { select: { id: true, username: true, avatar: true } },
      answers: {
        select: {
          answer: true,
          question: { select: { id: true, question: true, required: true } },
        },
        orderBy: { question: { order: "asc" } },
      },
    },
  });
  res.json(requests);
});

// POST /:id/requests — submit join request (with optional answers)
router.post("/:id/requests", requireAuth, async (req: AuthRequest, res: Response) => {
  const clubId = String(req.params.id);
  const club   = await prisma.gameClub.findUnique({ where: { id: clubId }, select: { isPrivate: true, createdBy: true } });
  if (!club) { res.status(404).json({ error: "Club not found" }); return; }
  if (!club.isPrivate) { res.status(400).json({ error: "This club does not require requests" }); return; }

  const banned = await prisma.gameClubMember.findUnique({ where: { clubId_userId: { clubId, userId: req.userId! } } });
  if (banned?.isBanned) { res.status(403).json({ error: "You are banned from this club" }); return; }
  if (banned && !banned.isBanned) { res.status(400).json({ error: "You are already a member" }); return; }

  // Check for existing pending/approved request
  const existing = await prisma.gameClubJoinRequest.findUnique({ where: { clubId_userId: { clubId, userId: req.userId! } } });
  if (existing?.status === "PENDING") { res.status(400).json({ error: "You already have a pending request" }); return; }
  if (existing?.status === "APPROVED") { res.status(400).json({ error: "Your request was already approved" }); return; }

  const questions = await prisma.gameClubJoinQuestion.findMany({ where: { clubId }, orderBy: { order: "asc" } });
  const answers: { questionId: string; answer: string }[] = req.body.answers ?? [];

  // Validate required questions
  for (const q of questions.filter((q) => q.required)) {
    const ans = answers.find((a) => a.questionId === q.id);
    if (!ans?.answer?.trim()) {
      res.status(400).json({ error: `Answer required for: "${q.question}"` }); return;
    }
  }

  // Upsert (re-apply after rejection)
  const request = await prisma.gameClubJoinRequest.upsert({
    where: { clubId_userId: { clubId, userId: req.userId! } },
    create: {
      clubId, userId: req.userId!, status: "PENDING",
      answers: answers.length > 0 ? {
        create: answers.filter((a) => a.answer?.trim()).map((a) => ({
          questionId: a.questionId, answer: a.answer.trim().slice(0, 1000),
        })),
      } : undefined,
    },
    update: {
      status: "PENDING", rejectionNote: null,
      answers: {
        deleteMany: {},
        create: answers.filter((a) => a.answer?.trim()).map((a) => ({
          questionId: a.questionId, answer: a.answer.trim().slice(0, 1000),
        })),
      },
    },
    select: { id: true, status: true, createdAt: true },
  });

  // Notify club admins of new request
  const admins = await prisma.gameClubMember.findMany({
    where: { clubId, role: "admin" },
    select: { userId: true },
  });
  for (const a of admins) {
    emitToUser(a.userId, "club_join_request", {
      clubId,
      requestId: request.id,
      username: (await prisma.user.findUnique({ where: { id: req.userId! }, select: { username: true } }))?.username,
    });
  }

  res.status(201).json(request);
});

// PATCH /:id/requests/:reqId — approve or reject (admin)
router.patch("/:id/requests/:reqId", requireAuth, async (req: AuthRequest, res: Response) => {
  const clubId = String(req.params.id);
  const admin  = await requireAdmin(clubId, req.userId!);
  if (!admin) { res.status(403).json({ error: "Admin only" }); return; }

  const { action, rejectionNote } = req.body as { action: "approve" | "reject"; rejectionNote?: string };
  if (action !== "approve" && action !== "reject") {
    res.status(400).json({ error: "action must be approve or reject" }); return;
  }

  const request = await prisma.gameClubJoinRequest.findUnique({
    where: { id: String(req.params.reqId) },
    select: { id: true, clubId: true, userId: true, status: true },
  });
  if (!request || request.clubId !== clubId) { res.status(404).json({ error: "Request not found" }); return; }
  if (request.status !== "PENDING") { res.status(400).json({ error: "Request already resolved" }); return; }

  await prisma.gameClubJoinRequest.update({
    where: { id: request.id },
    data: {
      status: action === "approve" ? "APPROVED" : "REJECTED",
      rejectionNote: action === "reject" ? (rejectionNote?.trim() ?? null) : null,
    },
  });

  if (action === "approve") {
    await prisma.gameClubMember.upsert({
      where: { clubId_userId: { clubId, userId: request.userId } },
      create: { clubId, userId: request.userId },
      update: { isBanned: false },
    });
  }

  // Notify applicant of decision
  emitToUser(request.userId, "club_request_resolved", {
    clubId, action,
    rejectionNote: action === "reject" ? (rejectionNote?.trim() ?? null) : null,
  });

  res.json({ ok: true, action });
});

// DELETE /:id/requests/:reqId — cancel own pending request
router.delete("/:id/requests/:reqId", requireAuth, async (req: AuthRequest, res: Response) => {
  const request = await prisma.gameClubJoinRequest.findUnique({
    where: { id: String(req.params.reqId) },
    select: { id: true, userId: true, status: true },
  });
  if (!request || request.userId !== req.userId) { res.status(403).json({ error: "Forbidden" }); return; }
  if (request.status !== "PENDING") { res.status(400).json({ error: "Can only cancel pending requests" }); return; }
  await prisma.gameClubJoinRequest.delete({ where: { id: request.id } });
  res.json({ cancelled: true });
});

export default router;
