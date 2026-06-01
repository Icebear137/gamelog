import { Router, Response } from "express";
import prisma from "../../lib/prisma";
import { requireAuth, AuthRequest } from "../../middleware/auth";
import { emitToUser, emitToConversation } from "../../lib/socket";
import { requireParticipant } from "./_shared";

const router = Router();

// ---------------------------------------------------------------------------
// PATCH /api/messages/conversations/:id/members/:userId/role
// Promote or demote a member (admin only; sole admin cannot demote themselves)
// ---------------------------------------------------------------------------
router.patch("/conversations/:id/members/:userId/role", requireAuth, async (req: AuthRequest, res: Response) => {
  const myId = req.userId!;
  const conversationId = String(req.params.id);
  const targetId = String(req.params.userId);
  const { role } = req.body;

  if (role !== "admin" && role !== "member") {
    res.status(400).json({ error: "role must be 'admin' or 'member'" });
    return;
  }

  const [myPart, conv] = await Promise.all([
    requireParticipant(conversationId, myId),
    prisma.conversation.findUnique({ where: { id: conversationId }, select: { isGroup: true } }),
  ]);

  if (!myPart) { res.status(403).json({ error: "Forbidden" }); return; }
  if (myPart.role !== "admin") { res.status(403).json({ error: "Only admins can change roles" }); return; }
  if (!conv?.isGroup) { res.status(400).json({ error: "Not a group conversation" }); return; }

  // Prevent sole admin from demoting themselves
  if (targetId === myId && role === "member") {
    const adminCount = await prisma.conversationParticipant.count({
      where: { conversationId, role: "admin" },
    });
    if (adminCount <= 1) {
      res.status(400).json({ error: "Cannot demote: you are the only admin" });
      return;
    }
  }

  await prisma.conversationParticipant.update({
    where: { conversationId_userId: { conversationId, userId: targetId } },
    data: { role },
  });

  emitToConversation(conversationId, "member_role_changed", { conversationId, userId: targetId, role });
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// GET /api/messages/conversations/:id/nicknames
// Returns all set nicknames for this conversation
// ---------------------------------------------------------------------------
router.get("/conversations/:id/nicknames", requireAuth, async (req: AuthRequest, res: Response) => {
  const myId = req.userId!;
  const conversationId = String(req.params.id);

  const participant = await requireParticipant(conversationId, myId);
  if (!participant) { res.status(403).json({ error: "Forbidden" }); return; }

  const nicknames = await prisma.conversationNickname.findMany({
    where: { conversationId },
    select: { userId: true, nickname: true },
  });

  res.json(nicknames);
});

// ---------------------------------------------------------------------------
// PUT /api/messages/conversations/:id/nicknames/:userId
// Set (or clear) a nickname for a member — any participant can do this
// ---------------------------------------------------------------------------
router.put("/conversations/:id/nicknames/:userId", requireAuth, async (req: AuthRequest, res: Response) => {
  const myId = req.userId!;
  const conversationId = String(req.params.id);
  const targetUserId = String(req.params.userId);
  const { nickname } = req.body;

  const participant = await requireParticipant(conversationId, myId);
  if (!participant) { res.status(403).json({ error: "Forbidden" }); return; }

  // Verify target user is a member of this conversation
  const targetParticipant = await requireParticipant(conversationId, targetUserId);
  if (!targetParticipant) { res.status(404).json({ error: "User not in this conversation" }); return; }

  // Empty / missing nickname = clear it
  if (!nickname || typeof nickname !== "string" || nickname.trim().length === 0) {
    await prisma.conversationNickname.deleteMany({
      where: { conversationId, userId: targetUserId },
    });
    emitToConversation(conversationId, "nickname_updated", { conversationId, userId: targetUserId, nickname: null });
    res.json({ ok: true });
    return;
  }

  if (nickname.trim().length > 50) {
    res.status(400).json({ error: "Nickname must be 50 characters or less" });
    return;
  }

  const saved = await prisma.conversationNickname.upsert({
    where: { conversationId_userId: { conversationId, userId: targetUserId } },
    create: { conversationId, userId: targetUserId, nickname: nickname.trim() },
    update: { nickname: nickname.trim() },
  });

  emitToConversation(conversationId, "nickname_updated", { conversationId, userId: targetUserId, nickname: saved.nickname });
  res.json(saved);
});

// ---------------------------------------------------------------------------
// POST /api/messages/conversations/:id/members
// Add a member to a group (admin only)
// ---------------------------------------------------------------------------
router.post("/conversations/:id/members", requireAuth, async (req: AuthRequest, res: Response) => {
  const myId = req.userId!;
  const conversationId = String(req.params.id);
  const { userId } = req.body;

  if (!userId || typeof userId !== "string") { res.status(400).json({ error: "userId is required" }); return; }

  const participant = await requireParticipant(conversationId, myId);
  if (!participant) { res.status(403).json({ error: "Forbidden" }); return; }
  if (participant.role !== "admin") { res.status(403).json({ error: "Only admins can add members" }); return; }

  const conv = await prisma.conversation.findUnique({ where: { id: conversationId }, select: { isGroup: true } });
  if (!conv?.isGroup) { res.status(400).json({ error: "Not a group conversation" }); return; }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, username: true, avatar: true } });
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  await prisma.conversationParticipant.upsert({
    where: { conversationId_userId: { conversationId, userId } },
    create: { conversationId, userId, role: "member" },
    update: {}, // already a member — no-op
  });

  emitToConversation(conversationId, "member_added", { conversationId, user });
  emitToUser(userId, "new_group", { conversationId });
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// DELETE /api/messages/conversations/:id/members/:userId
// Remove a member (admin removes others, any member can remove themselves to leave)
// ---------------------------------------------------------------------------
router.delete("/conversations/:id/members/:userId", requireAuth, async (req: AuthRequest, res: Response) => {
  const myId = req.userId!;
  const conversationId = String(req.params.id);
  const targetId = String(req.params.userId);

  const [myPart, conv] = await Promise.all([
    requireParticipant(conversationId, myId),
    prisma.conversation.findUnique({ where: { id: conversationId }, select: { isGroup: true } }),
  ]);

  if (!myPart) { res.status(403).json({ error: "Forbidden" }); return; }
  if (!conv?.isGroup) { res.status(400).json({ error: "Not a group conversation" }); return; }

  const isSelf = targetId === myId;
  if (!isSelf && myPart.role !== "admin") {
    res.status(403).json({ error: "Only admins can remove other members" });
    return;
  }

  // Prevent removing the last admin from the group
  const targetPart = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId: targetId } },
    select: { role: true },
  });
  if (targetPart?.role === "admin") {
    const adminCount = await prisma.conversationParticipant.count({
      where: { conversationId, role: "admin" },
    });
    if (adminCount <= 1) {
      res.status(400).json({ error: "Cannot remove the only admin" });
      return;
    }
  }

  await prisma.conversationParticipant.deleteMany({
    where: { conversationId, userId: targetId },
  });

  emitToConversation(conversationId, "member_removed", { conversationId, userId: targetId });
  res.json({ ok: true });
});

export default router;
