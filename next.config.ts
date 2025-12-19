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

  // Enable WebAssembly for tiktoken and suppress warnings
  webpack: (config, { isServer }) => {
    // Enable WebAssembly support
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };

    // Suppress the WASM async/await warning for tiktoken
    // This warning is harmless because:
    // 1. tiktoken is only used client-side (server-side uses fallback)
    // 2. Modern browsers support async/await with WASM
    // 3. The code has proper error handling and fallbacks
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      {
        module: /node_modules\/@dqbd\/tiktoken/,
        message: /asyncWebAssembly/,
      },
    ];

    // On client-side, configure WASM file handling
    if (!isServer) {
      config.output.webassemblyModuleFilename = 'static/wasm/[modulehash].wasm';
    }

    return config;
  },
};

export default nextConfig;
