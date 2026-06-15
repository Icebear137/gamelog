import { Router, Response } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { requireAuth, optionalAuth, AuthRequest } from "../middleware/auth";
import { emitToUser } from "../lib/socket";

const router = Router();

const PostCreateSchema = z.object({
  textContent: z.string().max(2000).optional(),
  images: z.array(z.string()).max(4).default([]),
  visibility: z.enum(["public", "followers"]).default("public"),
});

const CommentSchema = z.object({
  body: z.string().min(1).max(1000),
  parentId: z.string().optional(),
});

const POST_SELECT = {
  id: true,
  textContent: true,
  images: true,
  visibility: true,
  createdAt: true,
  updatedAt: true,
  author: { select: { id: true, username: true, avatar: true } },
  _count: { select: { likes: true, comments: true } },
} as const;

const CLUB_POST_FEED_SELECT = {
  id: true,
  body: true,
  clubId: true,
  createdAt: true,
  updatedAt: true,
  club: { select: { id: true, name: true, avatar: true } },
  user: { select: { id: true, username: true, avatar: true } },
  _count: { select: { comments: true, likes: true } },
} as const;

function parseImages(raw: string): string[] {
  try { return JSON.parse(raw); } catch { return []; }
}

// GET /api/posts — paginated feed (global or following), merged with club posts
router.get("/", optionalAuth, async (req: AuthRequest, res: Response) => {
  const page   = Math.max(1, parseInt(String(req.query.page  ?? "1"), 10));
  const filter = String(req.query.filter ?? "global");
  const take   = 20;
  const skip   = (page - 1) * take;

  let authorFilter: { in: string[] } | undefined;
  let joinedClubIds: string[] = [];

  if (filter === "following" && req.userId) {
    const follows = await prisma.follow.findMany({
      where: { followerId: req.userId },
      select: { followingId: true },
    });
    authorFilter = { in: [req.userId, ...follows.map((f) => f.followingId)] };
  }

  if (req.userId) {
    const memberships = await prisma.gameClubMember.findMany({
      where: { userId: req.userId, isBanned: false },
      select: { clubId: true },
    });
    joinedClubIds = memberships.map((m) => m.clubId);
  }

  // Fetch a pool large enough from both sources to paginate the merged result correctly
  const poolSize = skip + take;

  const [rawPosts, rawClubPosts] = await Promise.all([
    prisma.post.findMany({
      where: { deletedAt: null, ...(authorFilter ? { authorId: authorFilter } : {}) },
      select: POST_SELECT,
      orderBy: { createdAt: "desc" },
      take: poolSize,
    }),
    joinedClubIds.length > 0
      ? prisma.gameClubPost.findMany({
          where: { clubId: { in: joinedClubIds } },
          select: CLUB_POST_FEED_SELECT,
          orderBy: { createdAt: "desc" },
          take: poolSize,
        })
      : Promise.resolve([] as any[]),
  ]);

  const [likedPostIds, likedClubPostIds] = await Promise.all([
    req.userId && rawPosts.length > 0
      ? prisma.postLike.findMany({
          where: { userId: req.userId, postId: { in: rawPosts.map((p) => p.id) } },
          select: { postId: true },
        }).then((rows) => new Set(rows.map((r) => r.postId)))
      : Promise.resolve(new Set<string>()),
    req.userId && rawClubPosts.length > 0
      ? prisma.gameClubPostLike.findMany({
          where: { userId: req.userId, postId: { in: rawClubPosts.map((p) => p.id) } },
          select: { postId: true },
        }).then((rows) => new Set(rows.map((r) => r.postId)))
      : Promise.resolve(new Set<string>()),
  ]);

  const socialItems = rawPosts.map((p) => ({
    type: "post" as const,
    ...p,
    images: parseImages(p.images),
    likedByMe: likedPostIds.has(p.id),
  }));

  const clubItems = rawClubPosts.map((p) => ({
    type: "club_post" as const,
    ...p,
    likedByMe: likedClubPostIds.has(p.id),
  }));

  const merged = [...socialItems, ...clubItems]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(skip, skip + take);

  res.json(merged);
});

// POST /api/posts — create
router.post("/", requireAuth, async (req: AuthRequest, res: Response) => {
  const parsed = PostCreateSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  const { textContent, images, visibility } = parsed.data;
  if (!textContent?.trim() && images.length === 0) {
    res.status(400).json({ error: "Post must have text or at least one image" });
    return;
  }

  const post = await prisma.post.create({
    data: { authorId: req.userId!, textContent, images: JSON.stringify(images), visibility },
    select: POST_SELECT,
  });

  const payload = { ...post, images, likedByMe: false };

  // Notify followers
  const followers = await prisma.follow.findMany({
    where: { followingId: req.userId! },
    select: { followerId: true },
  });
  for (const { followerId } of followers) {
    emitToUser(followerId, "new_post", payload);
  }

  res.status(201).json(payload);
});

// GET /api/posts/:id — single post
router.get("/:id", optionalAuth, async (req: AuthRequest, res: Response) => {
  const post = await prisma.post.findUnique({
    where: { id: req.params.id, deletedAt: null },
    select: POST_SELECT,
  });
  if (!post) { res.status(404).json({ error: "Post not found" }); return; }

  const likedByMe = req.userId
    ? !!(await prisma.postLike.findUnique({ where: { postId_userId: { postId: post.id, userId: req.userId } } }))
    : false;

  res.json({ ...post, images: parseImages(post.images), likedByMe });
});

// PUT /api/posts/:id — edit
router.put("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  const parsed = PostCreateSchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  const existing = await prisma.post.findUnique({ where: { id: req.params.id } });
  if (!existing || existing.deletedAt) { res.status(404).json({ error: "Post not found" }); return; }
  if (existing.authorId !== req.userId)  { res.status(403).json({ error: "Forbidden" }); return; }

  const { textContent, images, visibility } = parsed.data;
  const updated = await prisma.post.update({
    where: { id: req.params.id },
    data: {
      ...(textContent !== undefined ? { textContent } : {}),
      ...(images      !== undefined ? { images: JSON.stringify(images) } : {}),
      ...(visibility  !== undefined ? { visibility } : {}),
    },
    select: POST_SELECT,
  });

  res.json({ ...updated, images: parseImages(updated.images) });
});

// DELETE /api/posts/:id — soft delete
router.delete("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  const existing = await prisma.post.findUnique({ where: { id: req.params.id } });
  if (!existing || existing.deletedAt) { res.status(404).json({ error: "Post not found" }); return; }
  if (existing.authorId !== req.userId)  { res.status(403).json({ error: "Forbidden" }); return; }

  await prisma.post.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
  res.json({ success: true });
});

// POST /api/posts/:id/like
router.post("/:id/like", requireAuth, async (req: AuthRequest, res: Response) => {
  const post = await prisma.post.findUnique({ where: { id: req.params.id, deletedAt: null } });
  if (!post) { res.status(404).json({ error: "Post not found" }); return; }

  await prisma.postLike.upsert({
    where: { postId_userId: { postId: req.params.id, userId: req.userId! } },
    create: { postId: req.params.id, userId: req.userId! },
    update: {},
  });

  const count = await prisma.postLike.count({ where: { postId: req.params.id } });

  if (post.authorId !== req.userId) {
    const author = await prisma.user.findUnique({ where: { id: post.authorId }, select: { notifLike: true } });
    if (author?.notifLike) {
      const actor = await prisma.user.findUnique({
        where: { id: req.userId! },
        select: { id: true, username: true, avatar: true },
      });
      emitToUser(post.authorId, "post_like", { postId: req.params.id, actor, count });
    }
  }

  res.json({ liked: true, count });
});

// DELETE /api/posts/:id/like
router.delete("/:id/like", requireAuth, async (req: AuthRequest, res: Response) => {
  await prisma.postLike.deleteMany({ where: { postId: req.params.id, userId: req.userId! } });
  const count = await prisma.postLike.count({ where: { postId: req.params.id } });
  res.json({ liked: false, count });
});

// GET /api/posts/:id/comments
router.get("/:id/comments", optionalAuth, async (req: AuthRequest, res: Response) => {
  const comments = await prisma.postComment.findMany({
    where: { postId: req.params.id, deletedAt: null, parentId: null },
    include: {
      user: { select: { id: true, username: true, avatar: true } },
      replies: {
        where: { deletedAt: null },
        include: { user: { select: { id: true, username: true, avatar: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
    take: 50,
  });
  res.json(comments);
});

// POST /api/posts/:id/comments
router.post("/:id/comments", requireAuth, async (req: AuthRequest, res: Response) => {
  const parsed = CommentSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  const post = await prisma.post.findUnique({ where: { id: req.params.id, deletedAt: null } });
  if (!post) { res.status(404).json({ error: "Post not found" }); return; }

  const comment = await prisma.postComment.create({
    data: { postId: req.params.id, userId: req.userId!, body: parsed.data.body, parentId: parsed.data.parentId ?? null },
    include: {
      user: { select: { id: true, username: true, avatar: true } },
      replies: true,
    },
  });

  if (post.authorId !== req.userId) {
    const author = await prisma.user.findUnique({ where: { id: post.authorId }, select: { notifComment: true } });
    if (author?.notifComment) {
      const actor = await prisma.user.findUnique({
        where: { id: req.userId! },
        select: { id: true, username: true, avatar: true },
      });
      emitToUser(post.authorId, "post_comment", { postId: req.params.id, actor, commentId: comment.id });
    }
  }

  res.status(201).json(comment);
});

export default router;
