import { v2 as cloudinary } from "cloudinary";
import { Readable } from "stream";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload a buffer to Cloudinary.
 * Returns the secure URL and public_id of the uploaded asset.
 *
 * Pass `transformation` to override default (no-crop).
 * Avatar preset: [{ width:256, height:256, crop:"fill", gravity:"face" }, { fetch_format:"auto", quality:"auto" }]
 * Chat image: omit transformation (just stores original, Cloudinary applies quality/format on-the-fly at display)
 */
export async function uploadToCloudinary(
  buffer: Buffer,
  options: { folder?: string; public_id?: string; transformation?: object[]; resourceType?: "image" | "video" | "raw" | "auto" } = {}
): Promise<{ url: string; publicId: string }> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder ?? "gamelog",
        public_id: options.public_id,
        overwrite: true,
        resource_type: options.resourceType ?? "image",
        // Only apply transformation if explicitly provided
        ...(options.transformation ? { transformation: options.transformation } : {}),
      },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error("Upload failed"));
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );

    const readable = new Readable();
    readable.push(buffer);
    readable.push(null);
    readable.pipe(uploadStream);
  });
}

/**
 * Delete an asset from Cloudinary by its public_id.
 * Silently ignores errors (e.g. asset already deleted).
 */
export async function deleteFromCloudinary(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch {
    // ignore — asset may already be gone
  }
}

/**
 * Extract Cloudinary public_id from a cloudinary.com URL.
 * Returns null if the URL is not a Cloudinary URL.
 *
 * Example URL:
 *   https://res.cloudinary.com/dgcgcwoyd/image/upload/v1234/gamelog/avatars/abc123.webp
 *   → "gamelog/avatars/abc123"
 */
export function extractPublicId(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes("cloudinary.com")) return null;
    // pathname: /cloud_name/image/upload/v{version}/{public_id}.{ext}
    const parts = parsed.pathname.split("/upload/");
    if (parts.length < 2) return null;
    const afterUpload = parts[1]; // e.g. "v1234/gamelog/avatars/abc123.webp"
    // Strip version prefix if present
    const withoutVersion = afterUpload.replace(/^v\d+\//, "");
    // Strip file extension
    return withoutVersion.replace(/\.[^/.]+$/, "");
  } catch {
    return null;
  }
}
