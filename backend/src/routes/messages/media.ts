import { Router, Response } from "express";
import prisma from "../../lib/prisma";
import { requireAuth, AuthRequest } from "../../middleware/auth";
import { emitToUser, emitToConversation } from "../../lib/socket";
import { uploadToCloudinary } from "../../lib/cloudinary";
import { MESSAGE_SELECT, uploadImage, uploadAudio, uploadFile, requireParticipant } from "./_shared";

const router = Router();

// ---------------------------------------------------------------------------
// POST /api/messages/conversations/:id/image
// Send an image message (upload to Cloudinary, optional text caption)
// ---------------------------------------------------------------------------
router.post("/conversations/:id/image", requireAuth, (req: AuthRequest, res: Response) => {
  const myId = req.userId!;
  const conversationId = String(req.params.id);

  uploadImage.single("image")(req as any, res as any, async (err) => {
    if (err) {
      res.status(400).json({ error: err.message ?? "Upload failed" });
      return;
    }

    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) {
      res.status(400).json({ error: "No image file provided" });
      return;
    }

    const participant = await requireParticipant(conversationId, myId);
    if (!participant) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    // Optional caption (max 500 chars)
    const caption = typeof req.body.caption === "string"
      ? req.body.caption.trim().slice(0, 500)
      : "";

    // Optional replyToId
    const replyToId = typeof req.body.replyToId === "string" ? req.body.replyToId : undefined;
    if (replyToId) {
      const replyMsg = await prisma.message.findUnique({
        where: { id: replyToId },
        select: { conversationId: true },
      });
      if (!replyMsg || replyMsg.conversationId !== conversationId) {
        res.status(400).json({ error: "Invalid replyToId" });
        return;
      }
    }

    try {
      const { url: imageUrl } = await uploadToCloudinary(file.buffer, {
        folder: "gamelog/messages",
      });

      const message = await prisma.message.create({
        data: {
          conversationId,
          senderId: myId,
          body: caption,
          imageUrl,
          ...(replyToId ? { replyToId } : {}),
        },
        select: MESSAGE_SELECT,
      });

      await prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      const other = await prisma.conversationParticipant.findFirst({
        where: { conversationId, userId: { not: myId } },
      });

      const payload = { conversationId, message };
      emitToConversation(conversationId, "new_message", payload);
      if (other) emitToUser(other.userId, "new_message", { conversationId });

      res.status(201).json(message);
    } catch (e: any) {
      res.status(500).json({ error: e?.message ?? "Upload failed" });
    }
  });
});

// ---------------------------------------------------------------------------
// POST /api/messages/conversations/:id/images
// Send 1-10 images in a single message (parallel Cloudinary upload)
// 1 image  → stored in imageUrl  (backward-compat with old single-image format)
// 2+ images → stored in imageUrls (JSON array)
// ---------------------------------------------------------------------------
router.post("/conversations/:id/images", requireAuth, (req: AuthRequest, res: Response) => {
  const myId = req.userId!;
  const conversationId = String(req.params.id);

  uploadImage.array("images", 10)(req as any, res as any, async (err) => {
    if (err) {
      res.status(400).json({ error: err.message ?? "Upload failed" });
      return;
    }

    const files = (req as any).files as Express.Multer.File[] | undefined;
    if (!files || files.length === 0) {
      res.status(400).json({ error: "No images provided" });
      return;
    }

    const participant = await requireParticipant(conversationId, myId);
    if (!participant) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const caption = typeof req.body.caption === "string"
      ? req.body.caption.trim().slice(0, 500)
      : "";

    const replyToId = typeof req.body.replyToId === "string" ? req.body.replyToId : undefined;
    if (replyToId) {
      const replyMsg = await prisma.message.findUnique({
        where: { id: replyToId },
        select: { conversationId: true },
      });
      if (!replyMsg || replyMsg.conversationId !== conversationId) {
        res.status(400).json({ error: "Invalid replyToId" });
        return;
      }
    }

    try {
      // Upload all files to Cloudinary in parallel
      const results = await Promise.all(
        files.map((f) => uploadToCloudinary(f.buffer, { folder: "gamelog/messages" }))
      );
      const urls = results.map((r) => r.url);

      // 1 image → imageUrl (compat); 2+ → imageUrls JSON
      const imageData = urls.length === 1
        ? { imageUrl: urls[0] }
        : { imageUrls: JSON.stringify(urls) };

      const message = await prisma.message.create({
        data: {
          conversationId,
          senderId: myId,
          body: caption,
          ...imageData,
          ...(replyToId ? { replyToId } : {}),
        },
        select: MESSAGE_SELECT,
      });

      await prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      const other = await prisma.conversationParticipant.findFirst({
        where: { conversationId, userId: { not: myId } },
      });

      const payload = { conversationId, message };
      emitToConversation(conversationId, "new_message", payload);
      if (other) emitToUser(other.userId, "new_message", { conversationId });

      res.status(201).json(message);
    } catch (e: any) {
      res.status(500).json({ error: e?.message ?? "Upload failed" });
    }
  });
});

// ---------------------------------------------------------------------------
// POST /api/messages/conversations/:id/audio
// Send a voice message (upload webm/ogg to Cloudinary as raw/video resource)
// Body (multipart): audio file + optional duration (seconds)
// ---------------------------------------------------------------------------
router.post("/conversations/:id/audio", requireAuth, (req: AuthRequest, res: Response) => {
  const myId = req.userId!;
  const conversationId = String(req.params.id);

  uploadAudio.single("audio")(req as any, res as any, async (err) => {
    if (err) {
      res.status(400).json({ error: err.message ?? "Upload failed" });
      return;
    }

    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) {
      res.status(400).json({ error: "No audio file provided" });
      return;
    }

    const participant = await requireParticipant(conversationId, myId);
    if (!participant) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const audioDuration = typeof req.body.duration === "string"
      ? Math.max(1, Math.round(parseFloat(req.body.duration)))
      : null;

    try {
      const { url: audioUrl } = await uploadToCloudinary(file.buffer, {
        folder: "gamelog/audio",
        resourceType: "video", // Cloudinary uses "video" resource_type for audio files
      });

      const message = await prisma.message.create({
        data: {
          conversationId,
          senderId: myId,
          body: "",
          audioUrl,
          ...(audioDuration ? { audioDuration } : {}),
        },
        select: MESSAGE_SELECT,
      });

      await prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      const other = await prisma.conversationParticipant.findFirst({
        where: { conversationId, userId: { not: myId } },
      });

      const payload = { conversationId, message };
      emitToConversation(conversationId, "new_message", payload);
      if (other) emitToUser(other.userId, "new_message", { conversationId });

      res.status(201).json(message);
    } catch (e: any) {
      res.status(500).json({ error: e?.message ?? "Upload failed" });
    }
  });
});

// ---------------------------------------------------------------------------
// POST /api/messages/conversations/:id/files
// Send a file attachment (PDF, ZIP, DOCX, etc.) — NOT for images
// ---------------------------------------------------------------------------
router.post("/conversations/:id/files", requireAuth, (req: AuthRequest, res: Response) => {
  const myId = req.userId!;
  const conversationId = String(req.params.id);

  uploadFile.single("file")(req as any, res as any, async (err) => {
    if (err) {
      res.status(400).json({ error: err.message ?? "Upload failed" });
      return;
    }

    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) {
      res.status(400).json({ error: "No file provided" });
      return;
    }

    const participant = await requireParticipant(conversationId, myId);
    if (!participant) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    try {
      const { url: fileUrl } = await uploadToCloudinary(file.buffer, {
        folder: "gamelog/files",
        resourceType: "auto",
      });

      const message = await prisma.message.create({
        data: {
          conversationId,
          senderId: myId,
          body: "",
          fileUrl,
          fileName: Buffer.from(file.originalname, "latin1").toString("utf8"),
          fileSize: file.size,
          fileType: file.mimetype,
        },
        select: MESSAGE_SELECT,
      });

      await prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      const other = await prisma.conversationParticipant.findFirst({
        where: { conversationId, userId: { not: myId } },
      });

      const payload = { conversationId, message };
      emitToConversation(conversationId, "new_message", payload);
      if (other) emitToUser(other.userId, "new_message", { conversationId });

      res.status(201).json(message);
    } catch (e: any) {
      res.status(500).json({ error: e?.message ?? "Upload failed" });
    }
  });
});

// ---------------------------------------------------------------------------
// GET /api/messages/conversations/:id/files
// List all file attachment messages in a conversation
// ---------------------------------------------------------------------------
router.get("/conversations/:id/files", requireAuth, async (req: AuthRequest, res: Response) => {
  const myId = req.userId!;
  const conversationId = String(req.params.id);

  const participant = await requireParticipant(conversationId, myId);
  if (!participant) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const files = await prisma.message.findMany({
    where: { conversationId, fileUrl: { not: null } },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      fileUrl: true,
      fileName: true,
      fileSize: true,
      fileType: true,
      createdAt: true,
      sender: { select: { id: true, username: true, avatar: true } },
    },
  });

  res.json(files);
});

// ---------------------------------------------------------------------------
// GET /api/messages/conversations/:id/images
// List all image messages in a conversation (single + multi-image)
// ---------------------------------------------------------------------------
router.get("/conversations/:id/images", requireAuth, async (req: AuthRequest, res: Response) => {
  const myId = req.userId!;
  const conversationId = String(req.params.id);

  const participant = await requireParticipant(conversationId, myId);
  if (!participant) { res.status(403).json({ error: "Forbidden" }); return; }

  const messages = await prisma.message.findMany({
    where: {
      conversationId,
      OR: [{ imageUrl: { not: null } }, { imageUrls: { not: null } }],
    },
    orderBy: { createdAt: "desc" },
    take: 60,
    select: { id: true, imageUrl: true, imageUrls: true, createdAt: true },
  });

  // Flatten single + multi-image into one list of URLs
  const images: { url: string; messageId: string }[] = [];
  for (const msg of messages) {
    if (msg.imageUrls) {
      try {
        const urls: string[] = JSON.parse(msg.imageUrls);
        urls.forEach((url) => images.push({ url, messageId: msg.id }));
      } catch { /* ignore */ }
    } else if (msg.imageUrl) {
      images.push({ url: msg.imageUrl, messageId: msg.id });
    }
  }

  res.json(images);
});

export default router;
