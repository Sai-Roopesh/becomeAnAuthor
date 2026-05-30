import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export for Tauri
  output: "export",

  // Source directory (where app/ lives)
  // Note: Next.js doesn't have srcDir, so we need to use experimental.appDir
  // or restructure. For now, moving app/ to root is the fix.

  // Required for static export
  images: {
    unoptimized: true,
  },

  // Better for file:// URLs in Tauri
  trailingSlash: true,

  turbopack: {
    root: process.cwd(),
    resolveAlias: {
      // @tauri-apps/plugin-log is a native Tauri plugin — not resolvable by Node/Turbopack.
      // The stub is a no-op; the real module loads at runtime inside the Tauri webview.
      "@tauri-apps/plugin-log": "./frontend/lib/tauri-plugin-log-stub.ts",
    },
  },
};

export default nextConfig;
