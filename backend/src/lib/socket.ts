import { Server as IOServer, Socket } from "socket.io";
import { Server as HttpServer } from "http";
import jwt from "jsonwebtoken";
import prisma from "./prisma";

let io: IOServer;

// userId → number of active sockets (multi-tab support)
const onlineCounts = new Map<string, number>();

/** Returns true if the user has at least one active socket */
export function isUserOnline(userId: string): boolean {
  return (onlineCounts.get(userId) ?? 0) > 0;
}

/** Get unique partner userIds for a given user (all 1-on-1 conversation partners) */
async function getPartnerIds(userId: string): Promise<string[]> {
  const rows = await prisma.conversationParticipant.findMany({
    where: {
      conversation: { participants: { some: { userId } } },
      NOT: { userId },
    },
    select: { userId: true },
    distinct: ["userId"],
  });
  return rows.map((r) => r.userId);
}

/** Broadcast presence_update to all conversation partners AND club co-members */
async function broadcastPresence(
  userId: string,
  isOnline: boolean,
  lastSeen: string | null = null
) {
  const payload = { userId, isOnline, lastSeen };

  // DM conversation partners
  const partnerIds = await getPartnerIds(userId);
  for (const pid of partnerIds) {
    io.to(`user:${pid}`).emit("presence_update", payload);
  }

  // Club co-members (excluding duplicates already covered by DM partners)
  const partnerSet = new Set(partnerIds);
  const memberships = await prisma.gameClubMember.findMany({
    where: { userId, isBanned: false },
    select: { clubId: true },
  });
  if (memberships.length > 0) {
    const clubIds = memberships.map((m) => m.clubId);
    const clubMembers = await prisma.gameClubMember.findMany({
      where: { clubId: { in: clubIds }, userId: { not: userId }, isBanned: false },
      select: { userId: true },
      distinct: ["userId"],
    });
    for (const { userId: memberId } of clubMembers) {
      if (!partnerSet.has(memberId)) {
        io.to(`user:${memberId}`).emit("presence_update", payload);
      }
    }
  }
}

export function initSocket(httpServer: HttpServer) {
  io = new IOServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL,
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  // Auth middleware — runs before "connection" is established
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error("Unauthorized"));
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
      socket.data.userId = payload.userId;
      // Fetch username + avatar so typing events can include them
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { username: true, avatar: true },
      });
      socket.data.username = user?.username ?? "";
      socket.data.avatar = user?.avatar ?? null;
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", async (socket: Socket) => {
    const userId = socket.data.userId as string;

    // Join personal room (multi-tab safe)
    socket.join(`user:${userId}`);
    socket.emit("connected", { userId });

    // Track online count; broadcast on first connection
    const prevCount = onlineCounts.get(userId) ?? 0;
    onlineCounts.set(userId, prevCount + 1);
    if (prevCount === 0) {
      broadcastPresence(userId, true).catch(() => {});
    }

    // ── Chat room management ──────────────────────────────────────────────
    socket.on("join_conversation", async (conversationId: string) => {
      const p = await prisma.conversationParticipant.findUnique({
        where: { conversationId_userId: { conversationId, userId } },
      });
      if (p) socket.join(`conv:${conversationId}`);
    });

    socket.on("leave_conversation", (conversationId: string) => {
      socket.leave(`conv:${conversationId}`);
    });

    // ── Typing indicator — relay with user info for group avatar stacking ───
    socket.on("typing", ({ conversationId }: { conversationId: string }) => {
      socket.to(`conv:${conversationId}`).emit("typing", {
        conversationId,
        userId: socket.data.userId as string,
        username: socket.data.username as string,
        avatar: socket.data.avatar as string | null,
      });
    });

    // ── Presence query — respond only to the requesting socket ────────────
    socket.on("get_presence", async ({ userId: targetId }: { userId: string }) => {
      const online = isUserOnline(targetId);
      let lastSeen: string | null = null;
      if (!online) {
        const u = await prisma.user.findUnique({
          where: { id: targetId },
          select: { lastSeen: true },
        });
        lastSeen = u?.lastSeen?.toISOString() ?? null;
      }
      socket.emit("presence_update", { userId: targetId, isOnline: online, lastSeen });
    });

    // ── Disconnect ────────────────────────────────────────────────────────
    socket.on("disconnect", async () => {
      const count = onlineCounts.get(userId) ?? 1;
      if (count <= 1) {
        onlineCounts.delete(userId);
        // Persist lastSeen and notify partners
        const now = new Date();
        await prisma.user.update({ where: { id: userId }, data: { lastSeen: now } }).catch(() => {});
        broadcastPresence(userId, false, now.toISOString()).catch(() => {});
      } else {
        onlineCounts.set(userId, count - 1);
      }
    });
  });

  return io;
}

/** Emit event to ALL sockets of a specific user (multi-tab safe) */
export function emitToUser(userId: string, event: string, data: unknown) {
  io?.to(`user:${userId}`).emit(event, data);
}

/** Emit event to all sockets in a conversation room */
export function emitToConversation(conversationId: string, event: string, data: unknown) {
  io?.to(`conv:${conversationId}`).emit(event, data);
}
