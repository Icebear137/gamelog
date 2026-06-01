import { Router, Response } from "express";
import prisma from "../../lib/prisma";
import { requireAuth, AuthRequest } from "../../middleware/auth";
import { emitToUser, emitToConversation } from "../../lib/socket";
import { MESSAGE_SELECT, requireParticipant } from "./_shared";

const router = Router();

// ---------------------------------------------------------------------------
// POST /api/messages/conversations/:id/polls
// Create a poll message — body: { question, options: string[], allowMultiple? }
// ---------------------------------------------------------------------------
router.post("/conversations/:id/polls", requireAuth, async (req: AuthRequest, res: Response) => {
  const myId = req.userId!;
  const conversationId = String(req.params.id);
  const { question, options, allowMultiple = false } = req.body;

  if (!question || typeof question !== "string" || question.trim().length === 0) {
    res.status(400).json({ error: "Question is required" }); return;
  }
  if (!Array.isArray(options) || options.length < 2 || options.length > 5) {
    res.status(400).json({ error: "Provide 2–5 options" }); return;
  }
  const cleanOptions = (options as unknown[])
    .map((o) => (typeof o === "string" ? o.trim() : ""))
    .filter((o) => o.length > 0);
  if (cleanOptions.length < 2) {
    res.status(400).json({ error: "At least 2 non-empty options required" }); return;
  }

  const participant = await requireParticipant(conversationId, myId);
  if (!participant) { res.status(403).json({ error: "Forbidden" }); return; }

  const message = await prisma.message.create({
    data: {
      conversationId,
      senderId: myId,
      body: "📊 " + question.trim().slice(0, 80),
      poll: {
        create: {
          conversationId,
          question: question.trim().slice(0, 200),
          allowMultiple: !!allowMultiple,
          options: {
            create: cleanOptions.map((text, i) => ({ text: text.slice(0, 100), order: i })),
          },
        },
      },
    },
    select: MESSAGE_SELECT,
  });

  await prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });

  const other = await prisma.conversationParticipant.findFirst({
    where: { conversationId, userId: { not: myId } },
  });
  emitToConversation(conversationId, "new_message", { conversationId, message });
  if (other) emitToUser(other.userId, "new_message", { conversationId });

  res.status(201).json(message);
});

// ---------------------------------------------------------------------------
// POST /api/messages/polls/:pollId/vote
// Toggle a vote on an option — body: { optionId }
// If allowMultiple=false, replaces any existing vote; else toggles this option
// ---------------------------------------------------------------------------
router.post("/polls/:pollId/vote", requireAuth, async (req: AuthRequest, res: Response) => {
  const myId = req.userId!;
  const pollId = String(req.params.pollId);
  const { optionId } = req.body;

  if (!optionId || typeof optionId !== "string") {
    res.status(400).json({ error: "optionId is required" }); return;
  }

  const poll = await prisma.poll.findUnique({
    where: { id: pollId },
    include: { options: { select: { id: true } } },
  });
  if (!poll) { res.status(404).json({ error: "Poll not found" }); return; }

  const participant = await requireParticipant(poll.conversationId, myId);
  if (!participant) { res.status(403).json({ error: "Forbidden" }); return; }

  const validOption = poll.options.some((o) => o.id === optionId);
  if (!validOption) { res.status(400).json({ error: "Invalid optionId" }); return; }

  const existing = await prisma.pollVote.findUnique({
    where: { pollId_optionId_userId: { pollId, optionId, userId: myId } },
  });

  await prisma.$transaction(async (tx) => {
    if (existing) {
      // Toggle off — remove this vote
      await tx.pollVote.delete({ where: { id: existing.id } });
    } else {
      if (!poll.allowMultiple) {
        // Single-choice: remove any existing votes first
        await tx.pollVote.deleteMany({ where: { pollId, userId: myId } });
      }
      await tx.pollVote.create({ data: { pollId, optionId, userId: myId } });
    }
  });

  // Fetch updated poll to broadcast
  const updatedPoll = await prisma.poll.findUnique({
    where: { id: pollId },
    select: {
      id: true,
      question: true,
      allowMultiple: true,
      options: {
        select: {
          id: true,
          text: true,
          order: true,
          votes: { select: { userId: true } },
        },
        orderBy: { order: "asc" },
      },
    },
  });

  emitToConversation(poll.conversationId, "poll_updated", {
    conversationId: poll.conversationId,
    messageId: poll.messageId,
    poll: updatedPoll,
  });

  res.json({ poll: updatedPoll });
});

export default router;
