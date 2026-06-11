import { Router, Response } from "express";
import prisma from "../../lib/prisma";
import { requireAuth, AuthRequest } from "../../middleware/auth";
import { emitToConversation, emitToUser } from "../../lib/socket";
import { MESSAGE_SELECT, requireParticipant } from "./_shared";

const router = Router();

const POLL_SELECT = {
  id: true,
  question: true,
  allowMultiple: true,
  anonymous: true,
  endsAt: true,
  closedAt: true,
  createdAt: true,
  messageId: true,
  conversationId: true,
  options: {
    select: {
      id: true,
      text: true,
      order: true,
      votes: {
        select: {
          userId: true,
          user: { select: { id: true, username: true, avatar: true } },
        },
      },
    },
    orderBy: { order: "asc" as const },
  },
};

type PollResult = Awaited<ReturnType<typeof prisma.poll.findUnique>> & {
  options: { id: string; text: string; order: number; votes: { userId: string; user: { id: string; username: string; avatar: string | null } }[] }[];
  anonymous: boolean;
};

/** Strip user details from votes when poll is anonymous */
function sanitize(poll: any) {
  if (!poll) return poll;
  return {
    ...poll,
    options: poll.options.map((o: any) => ({
      ...o,
      votes: poll.anonymous
        ? o.votes.map((v: any) => ({ userId: v.userId }))
        : o.votes,
    })),
  };
}

function isPollClosed(poll: { closedAt: Date | null; endsAt: Date | null }) {
  if (poll.closedAt) return true;
  if (poll.endsAt && new Date(poll.endsAt) <= new Date()) return true;
  return false;
}

// ---------------------------------------------------------------------------
// POST /api/messages/conversations/:id/polls
// Body: { question, options: string[], allowMultiple?, anonymous?, endsAt? }
// ---------------------------------------------------------------------------
router.post("/conversations/:id/polls", requireAuth, async (req: AuthRequest, res: Response) => {
  const myId = req.userId!;
  const conversationId = String(req.params.id);
  const { question, options, allowMultiple = false, anonymous = false, endsAt } = req.body;

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

  let endsAtDate: Date | undefined;
  if (endsAt) {
    endsAtDate = new Date(endsAt);
    if (isNaN(endsAtDate.getTime()) || endsAtDate <= new Date()) {
      res.status(400).json({ error: "endsAt must be a valid future date" }); return;
    }
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
          anonymous: !!anonymous,
          ...(endsAtDate ? { endsAt: endsAtDate } : {}),
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
  if (isPollClosed(poll)) { res.status(400).json({ error: "This poll is closed" }); return; }

  const participant = await requireParticipant(poll.conversationId, myId);
  if (!participant) { res.status(403).json({ error: "Forbidden" }); return; }
  if (!poll.options.some((o) => o.id === optionId)) {
    res.status(400).json({ error: "Invalid optionId" }); return;
  }

  const existing = await prisma.pollVote.findUnique({
    where: { pollId_optionId_userId: { pollId, optionId, userId: myId } },
  });

  await prisma.$transaction(async (tx) => {
    if (existing) {
      await tx.pollVote.delete({ where: { id: existing.id } });
    } else {
      if (!poll.allowMultiple) {
        await tx.pollVote.deleteMany({ where: { pollId, userId: myId } });
      }
      await tx.pollVote.create({ data: { pollId, optionId, userId: myId } });
    }
  });

  const updatedPoll = await prisma.poll.findUnique({ where: { id: pollId }, select: POLL_SELECT });
  const payload = sanitize(updatedPoll);

  emitToConversation(poll.conversationId, "poll_updated", {
    conversationId: poll.conversationId,
    messageId: poll.messageId,
    poll: payload,
  });

  res.json({ poll: payload });
});

// ---------------------------------------------------------------------------
// POST /api/messages/polls/:pollId/close
// ---------------------------------------------------------------------------
router.post("/polls/:pollId/close", requireAuth, async (req: AuthRequest, res: Response) => {
  const myId = req.userId!;
  const pollId = String(req.params.pollId);

  const poll = await prisma.poll.findUnique({
    where: { id: pollId },
    include: { message: { select: { senderId: true } } },
  });
  if (!poll) { res.status(404).json({ error: "Poll not found" }); return; }
  if (poll.message.senderId !== myId) {
    res.status(403).json({ error: "Only the poll creator can close it" }); return;
  }
  if (isPollClosed(poll)) { res.status(400).json({ error: "Poll is already closed" }); return; }

  const updated = await prisma.poll.update({
    where: { id: pollId },
    data: { closedAt: new Date() },
    select: POLL_SELECT,
  });
  const payload = sanitize(updated);

  emitToConversation(poll.conversationId, "poll_updated", {
    conversationId: poll.conversationId,
    messageId: poll.messageId,
    poll: payload,
  });

  res.json({ poll: payload });
});

export default router;
