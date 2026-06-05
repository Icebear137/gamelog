import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import prisma from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

const RegisterSchema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  email: z.string().email(),
  password: z.string().min(6),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

function signToken(userId: string) {
  return jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: "7d" });
}

router.post("/register", async (req: Request, res: Response) => {
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { username, email, password } = parsed.data;

  const exists = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });
  if (exists) {
    res.status(409).json({ error: "Email or username already taken" });
    return;
  }

  const hash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { username, email, password: hash },
    select: { id: true, username: true, email: true },
  });

  res.status(201).json({ token: signToken(user.id), user });
});

router.post("/login", async (req: Request, res: Response) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  res.json({
    token: signToken(user.id),
    user: { id: user.id, username: user.username, email: user.email },
  });
});

router.post("/change-password", requireAuth, async (req: AuthRequest, res: Response) => {
  const schema = z.object({
    currentPassword: z.string(),
    newPassword: z.string().min(6),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user || !(await bcrypt.compare(parsed.data.currentPassword, user.password))) {
    res.status(401).json({ error: "Current password is incorrect" });
    return;
  }
  const hash = await bcrypt.hash(parsed.data.newPassword, 10);
  await prisma.user.update({ where: { id: req.userId }, data: { password: hash } });
  res.json({ ok: true });
});

router.delete("/account", requireAuth, async (req: AuthRequest, res: Response) => {
  const schema = z.object({ password: z.string() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Password required" });
    return;
  }
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user || !(await bcrypt.compare(parsed.data.password, user.password))) {
    res.status(401).json({ error: "Incorrect password" });
    return;
  }
  await prisma.user.delete({ where: { id: req.userId } });
  res.json({ deleted: true });
});

router.get("/me", requireAuth, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: {
      id: true,
      username: true,
      email: true,
      bio: true,
      avatar: true,
      steamId: true,
      discordTag: true,
      isPrivate: true,
      isAdmin: true,
      emailNotifications: true,
      createdAt: true,
      _count: { select: { gameEntries: true, followers: true, following: true } },
    },
  });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(user);
});

export default router;
