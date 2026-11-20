/**
 * File: web/src/test/utils.tsx
 *
 * Shared helpers for the RoomBook frontend test suite. renderWithAuth()
 * renders a component inside the real AuthProvider, the same way the root
 * layout does, and returns Testing Library's queries plus a userEvent
 * instance. Tests can therefore cover the full session behaviour:
 * sessionStorage loading, the 401 redirect and sign out. mockFetch()
 * replaces global fetch with a handler that maps "METHOD /path?query" to a
 * status and JSON body, records every call, and returns 404 for anything
 * unexpected so missing mocks fail loudly. jsonResponse() builds one fetch
 * Response.
 *
 * Exports: renderWithAuth, mockFetch, jsonResponse and the Route type. Only
 * test files import this module; it is never bundled into the app.
 */
import { render, type RenderResult } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { vi, type Mock } from "vitest";
import { AuthProvider } from "@/components/AuthProvider";

export function renderWithAuth(ui: React.ReactElement): RenderResult & { user: UserEvent } {
  const user = userEvent.setup();
  return { user, ...render(<AuthProvider>{ui}</AuthProvider>) };
}

export function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** A route reply, or a function producing one (for replies that change between calls). */
export type Route = { status: number; body?: unknown } | (() => { status: number; body?: unknown });

/** Routes are keyed "GET /api/bookings/mine" (query string included when present). */
export function mockFetch(routes: Record<string, Route>): Mock {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const key = `${init?.method ?? "GET"} ${url}`;
    const route = routes[key];
    if (!route) return jsonResponse(404, { detail: `unmocked ${key}` });
    const { status, body } = typeof route === "function" ? route() : route;
    return jsonResponse(status, body ?? null);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
