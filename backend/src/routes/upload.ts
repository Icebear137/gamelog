import { Router, Response } from "express";
import multer from "multer";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { uploadToCloudinary } from "../lib/cloudinary";

const router = Router();

const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
});

// POST /api/upload/image — general-purpose image upload for rich editors
router.post("/image", requireAuth, (req: AuthRequest, res: Response) => {
  uploadImage.single("image")(req as any, res as any, async (err) => {
    if (err) { res.status(400).json({ error: err.message }); return; }

    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) { res.status(400).json({ error: "No file provided" }); return; }

    try {
      const { url } = await uploadToCloudinary(file.buffer, {
        folder: "gamelog/editor",
        resourceType: "image",
      });
      res.json({ url });
    } catch (e: any) {
      res.status(500).json({ error: e?.message ?? "Upload failed" });
    }
  });
});

export default router;
