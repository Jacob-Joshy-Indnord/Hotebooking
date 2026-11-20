/**
 * File: web/vitest.config.mts
 *
 * Vitest configuration for the RoomBook frontend test suite. Tests run in a
 * jsdom browser-like environment through the React plugin so .tsx
 * components compile the same way they do in Next.js. Globals (describe, it,
 * expect, vi) are enabled to keep test files short, and css is off because
 * tests check behaviour and accessibility, not styles. The "@" alias points
 * at src/, matching tsconfig.json, so application imports resolve the same
 * way in tests and in the app. vitest.setup.ts runs before every test file.
 * It loads the jest-dom matchers, mocks next/navigation and resets
 * sessionStorage.
 *
 * Exports: the default config built with defineConfig(); no other functions.
 * Run with `npm test`.
 */
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    globals: true,
    css: false,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
