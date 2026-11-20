/**
 * File: web/src/lib/api.test.ts
 *
 * Unit tests for the typed API client. fetch is replaced with a Vitest stub,
 * so no FastAPI server is needed. The suites check that: the stored API key
 * is sent as the X-API-Key header on every request (myBookings,
 * utilisationReport, cancelBooking), or that an explicit key overrides it
 * during sign-in; requests go through the same-origin /api prefix with the
 * right method and query string; a 401 clears the session, notifies the
 * registered unauthenticated handler and throws an ApiError of kind
 * "unauthenticated", unless silenced for sign-in validation; a 403 throws
 * kind "forbidden"; other failures surface the FastAPI `detail` message;
 * and network failures become kind "network".
 * Helper: jsonResponse(), which builds a fetch Response.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  cancelBooking,
  myBookings,
  setUnauthenticatedHandler,
  utilisationReport,
} from "./api";
import { getApiKey, getRole, saveSession } from "./session";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => setUnauthenticatedHandler(null));

describe("API key on every request", () => {
  it.each([
    ["myBookings", () => myBookings(), "/api/bookings/mine", "GET"],
    [
      "utilisationReport",
      () => utilisationReport("2026-11-01", "2026-11-07"),
      "/api/reports/utilisation?start_date=2026-11-01&end_date=2026-11-07",
      "GET",
    ],
    ["cancelBooking", () => cancelBooking(42), "/api/bookings/42/cancel", "POST"],
  ])("%s sends X-API-Key", async (_name, call, url, method) => {
    saveSession("secret-key", "staff");
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, []));
    vi.stubGlobal("fetch", fetchMock);

    await call();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [calledUrl, init] = fetchMock.mock.calls[0];
    expect(calledUrl).toBe(url);
    expect(init.method).toBe(method);
    expect(new Headers(init.headers).get("X-API-Key")).toBe("secret-key");
  });

  it("uses an explicit key over the stored one (sign-in validation)", async () => {
    saveSession("old-key", "staff");
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, []));
    vi.stubGlobal("fetch", fetchMock);

    await myBookings({ apiKey: "candidate", silenceUnauthenticated: true });

    expect(new Headers(fetchMock.mock.calls[0][1].headers).get("X-API-Key")).toBe("candidate");
  });
});

describe("401 handling", () => {
  it("clears the session, notifies the handler and throws unauthenticated", async () => {
    saveSession("expired", "admin");
    const handler = vi.fn();
    setUnauthenticatedHandler(handler);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(401, { detail: "invalid API key" })));

    const error = await myBookings().catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).kind).toBe("unauthenticated");
    expect(getApiKey()).toBeNull();
    expect(getRole()).toBeNull();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("does not notify the handler or touch the session when silenced", async () => {
    saveSession("current", "staff");
    const handler = vi.fn();
    setUnauthenticatedHandler(handler);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(401, { detail: "invalid API key" })));

    await expect(
      myBookings({ apiKey: "bad", silenceUnauthenticated: true }),
    ).rejects.toMatchObject({ kind: "unauthenticated", status: 401 });
    expect(handler).not.toHaveBeenCalled();
    expect(getApiKey()).toBe("current");
  });
});

describe("other failures", () => {
  it("maps 403 to forbidden", async () => {
    saveSession("staff-key", "staff");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(403, { detail: "admin only" })));

    await expect(utilisationReport("2026-11-01", "2026-11-02")).rejects.toMatchObject({
      kind: "forbidden",
      status: 403,
    });
  });

  it("surfaces the FastAPI detail message", async () => {
    saveSession("k", "staff");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(409, { detail: "booking has already started" })));

    await expect(cancelBooking(7)).rejects.toMatchObject({
      kind: "http",
      status: 409,
      message: "booking has already started",
    });
  });

  it("maps a network failure to kind network", async () => {
    saveSession("k", "staff");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    await expect(myBookings()).rejects.toMatchObject({ kind: "network", status: 0 });
  });
});
