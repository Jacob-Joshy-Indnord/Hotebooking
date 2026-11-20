/**
 * File: web/next.config.ts
 *
 * Next.js configuration for the RoomBook web UI. The browser only talks to
 * the Next.js origin: every request to /api/<path> is rewritten server-side to
 * the FastAPI service at API_ORIGIN/<path>. That keeps the API same-origin
 * (no CORS setup, no API address in the client bundle), which is the
 * frontend decision recorded in design.md. API_ORIGIN defaults to
 * http://127.0.0.1:8000, uvicorn's default, and can be set per environment
 * through an environment variable or a .env.local file.
 *
 * Exports: the default NextConfig object. Its only hook is the async
 * rewrites() function, which returns the single /api/:path* rule.
 * reactStrictMode is on to surface effect bugs during development.
 */
import type { NextConfig } from "next";

const apiOrigin = process.env.API_ORIGIN ?? "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiOrigin}/:path*` }];
  },
};

export default nextConfig;
