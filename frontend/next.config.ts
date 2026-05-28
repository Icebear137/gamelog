import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // RAWG game covers
      { protocol: "https", hostname: "media.rawg.io" },
      // Cloudinary (avatars, chat images)
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
};

export default nextConfig;
