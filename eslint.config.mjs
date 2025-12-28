import nextPlugin from "@next/eslint-plugin-next";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default [
  ...tseslint.configs.recommended,
  {
    plugins: {
      "@next/next": nextPlugin,
      "react-hooks": reactHooks,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      // React hooks rules
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      // Disable no-img-element - Tauri uses file:// URLs where next/image doesn't work
      "@next/next/no-img-element": "off",
      // Prevent console.log pollution in production - use logger instead
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
  // Allow console in logger files (they're the logging implementation)
  {
    files: ["**/logger.ts", "**/logger/**/*.ts"],
    rules: {
      "no-console": "off",
    },
  },
  {
    ignores: [".next/**", "out/**", "build/**", "node_modules/**"],
  },
];
