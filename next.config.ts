import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export for Tauri
  output: 'export',

  // Source directory (where app/ lives)
  // Note: Next.js doesn't have srcDir, so we need to use experimental.appDir
  // or restructure. For now, moving app/ to root is the fix.

  // Required for static export
  images: {
    unoptimized: true,
  },

  // Better for file:// URLs in Tauri
  trailingSlash: true,

  turbopack: {}, // Empty config to silence warning
};

export default nextConfig;
