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
      // Allow unused variables starting with _
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          "argsIgnorePattern": "^_",
          "varsIgnorePattern": "^_",
          "caughtErrorsIgnorePattern": "^_"
        }
      ],
      // Architecture boundary: Tauri invoke() may only be called from the IPC
      // boundary (frontend/core, frontend/infrastructure). Everything above goes
      // through a repository or a @/core/tauri command-module wrapper.
      // (The override block below re-enables invoke in those directories.)
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@tauri-apps/api/core",
              importNames: ["invoke"],
              message:
                "Do not call Tauri invoke() directly here. Use a repository or a @/core/tauri command-module wrapper. (invoke() is allowed only in frontend/core and frontend/infrastructure.)",
            },
          ],
        },
      ],
    },
  },
  // The Tauri IPC boundary may call invoke() directly.
  {
    files: [
      "frontend/core/**/*.{ts,tsx}",
      "frontend/infrastructure/**/*.{ts,tsx}",
      "**/__tests__/**",
      "**/*.test.{ts,tsx}",
      "frontend/test/**",
    ],
    rules: {
      "no-restricted-imports": "off",
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
