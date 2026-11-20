/**
 * File: web/src/lib/api.ts
 *
 * Typed client for the RoomBook FastAPI service. Every call goes to the
 * same-origin /api prefix, which next.config.ts rewrites to FastAPI, and
 * carries the stored per-user key in the X-API-Key header. The response types
 * mirror the backend models (BookingOut, RoomUtilisation). Failures become an
 * ApiError whose `kind` drives the UI. On a 401 the client clears the session
 * and calls the registered unauthenticated handler, which sends the user to
 * sign-in. Sign-in can silence this while it validates a key. 403 is
 * "forbidden" (access denied), other HTTP errors are "http" with FastAPI's
 * detail message, and a failed fetch is "network".
 *
 * Exports: ApiError, setUnauthenticatedHandler(), myBookings(),
 * utilisationReport(), cancelBooking(); internally request() and
 * readDetail().
 */
import { clearSession, getApiKey } from "./session";

export const API_BASE = "/api";
export const API_KEY_HEADER = "X-API-Key";

export type BookingStatus = "Confirmed" | "Released" | "Cancelled";

/** GET /bookings/mine row (BookingOut). Times are ISO 8601 UTC strings. */
export interface Booking {
  id: number;
  room_id: number;
  title: string;
  attendees: number;
  start: string;
  end: string;
  status: BookingStatus;
  checked_in_at: string | null;
}

/** GET /reports/utilisation row (RoomUtilisation). */
export interface RoomUtilisation {
  room_id: number;
  room_name: string;
  floor: number;
  booked_hours: number;
  released_hours: number;
  booking_count: number;
}

export type ApiErrorKind = "unauthenticated" | "forbidden" | "http" | "network";

export class ApiError extends Error {
  constructor(
    readonly kind: ApiErrorKind,
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface RequestOptions {
  /** Use this key instead of the stored one (sign-in validation). */
  apiKey?: string;
  /** Do not clear the session or redirect on 401 (sign-in validation). */
  silenceUnauthenticated?: boolean;
}

let onUnauthenticated: (() => void) | null = null;

/** Registers the app-wide reaction to a 401 (the AuthProvider redirects to sign-in). */
export function setUnauthenticatedHandler(handler: (() => void) | null): void {
  onUnauthenticated = handler;
}

async function readDetail(response: Response): Promise<string | null> {
  try {
    const body: unknown = await response.json();
    if (body && typeof body === "object" && "detail" in body) {
      const { detail } = body as { detail: unknown };
      if (typeof detail === "string") return detail;
    }
  } catch {
    // Non-JSON body: fall through to the generic message.
  }
  return null;
}

async function request<T>(
  path: string,
  init: { method?: "GET" | "POST" } = {},
  options: RequestOptions = {},
): Promise<T> {
  const headers = new Headers({ Accept: "application/json" });
  const apiKey = options.apiKey ?? getApiKey();
  if (apiKey) headers.set(API_KEY_HEADER, apiKey);

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, { method: init.method ?? "GET", headers });
  } catch {
    throw new ApiError("network", 0, "Could not reach the RoomBook service. Check your connection.");
  }

  if (response.ok) {
    return (response.status === 204 ? undefined : await response.json()) as T;
  }

  const detail = await readDetail(response);
  if (response.status === 401) {
    if (!options.silenceUnauthenticated) {
      clearSession();
      onUnauthenticated?.();
    }
    throw new ApiError("unauthenticated", 401, "Your API key is missing or invalid.");
  }
  if (response.status === 403) {
    throw new ApiError("forbidden", 403, "You do not have access to this page.");
  }
  throw new ApiError(
    "http",
    response.status,
    detail ?? `The server returned an error (${response.status}).`,
  );
}

export function myBookings(options?: RequestOptions): Promise<Booking[]> {
  return request<Booking[]>("/bookings/mine", {}, options);
}

/** Dates are whole UTC days, YYYY-MM-DD, both inclusive. */
export function utilisationReport(
  startDate: string,
  endDate: string,
  options?: RequestOptions,
): Promise<RoomUtilisation[]> {
  const query = new URLSearchParams({ start_date: startDate, end_date: endDate });
  return request<RoomUtilisation[]>(`/reports/utilisation?${query}`, {}, options);
}

/**
 * Cancels a booking. The endpoint belongs to task-szGIMuZv__4 and was not yet
 * built; POST /bookings/{id}/cancel was agreed with the manager and is kept
 * here only so it is easy to change.
 */
export function cancelBooking(bookingId: number, options?: RequestOptions): Promise<unknown> {
  return request<unknown>(`/bookings/${bookingId}/cancel`, { method: "POST" }, options);
}
