import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next.js 16+ uses Turbopack by default
  turbopack: {},
  reactStrictMode: true,

  // SEO optimizations
  compress: true,
  poweredByHeader: false,

  // Image optimization
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60,
  },
};

export default nextConfig;
