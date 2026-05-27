import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Keep optimized WebP/AVIF cached on Vercel's CDN (default is 4 hours).
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
};

export default nextConfig;
