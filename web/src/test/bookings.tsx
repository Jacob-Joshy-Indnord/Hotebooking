/**
 * File: web/src/test/bookings.tsx
 *
 * Shared fixtures and helpers for the My bookings tests (task-WceMuIzqLru,
 * MyBookings.test.tsx) and the Cancel booking tests (task-iEJbv0O1OH3,
 * CancelBooking.test.tsx). Fixture dates are far in the past (2019-2020) or
 * future (2099), so "upcoming" and "past" never depend on the real clock.
 * LIST is the mockFetch() route key for GET /bookings/mine. booking() builds
 * a Booking with overrides. renderPage() stores a staff session and renders
 * MyBookings inside the AuthProvider. rowFor(title) finds a table row by the
 * booking title in its row header.
 *
 * Exports: LIST, booking, upcoming, upcomingLater, past, pastOlder,
 * releasedUpcoming, cancelledUpcoming, renderPage and rowFor. Test-only
 * module.
 */
import { screen } from "@testing-library/react";
import { MyBookings } from "@/components/MyBookings";
import type { Booking } from "@/lib/api";
import { saveSession } from "@/lib/session";
import { renderWithAuth } from "./utils";

export const LIST = "GET /api/bookings/mine";

export function booking(overrides: Partial<Booking>): Booking {
  return {
    id: 1,
    room_id: 3,
    title: "Planning",
    attendees: 4,
    start: "2099-03-10T09:00:00Z",
    end: "2099-03-10T10:00:00Z",
    status: "Confirmed",
    checked_in_at: null,
    ...overrides,
  };
}

export const upcoming = booking({ id: 1, room_id: 3, title: "Quarterly planning" });
export const upcomingLater = booking({ id: 2, room_id: 5, title: "Design review", start: "2099-04-01T13:00:00Z", end: "2099-04-01T14:00:00Z" });
export const past = booking({ id: 3, room_id: 7, title: "Retro", start: "2020-01-15T15:00:00Z", end: "2020-01-15T16:00:00Z" });
export const pastOlder = booking({ id: 6, room_id: 7, title: "Kick-off", start: "2019-06-01T09:00:00Z", end: "2019-06-01T10:00:00Z", status: "Released" });
export const releasedUpcoming = booking({ id: 4, title: "Released slot", status: "Released", start: "2099-05-01T09:00:00Z", end: "2099-05-01T09:30:00Z" });
export const cancelledUpcoming = booking({ id: 5, title: "Cancelled slot", status: "Cancelled", start: "2099-05-02T09:00:00Z", end: "2099-05-02T09:30:00Z" });

export function renderPage() {
  saveSession("staff-key", "staff");
  return renderWithAuth(<MyBookings />);
}

export function rowFor(title: string): HTMLElement {
  return screen.getByRole("row", { name: new RegExp(title) });
}
