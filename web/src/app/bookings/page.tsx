/**
 * File: web/src/app/bookings/page.tsx
 *
 * Route for /bookings, the "My bookings" page (tasks task-WceMuIzqLru and
 * task-iEJbv0O1OH3) and the home screen after sign-in. It wraps the
 * MyBookings client component in RequireAuth, so visitors without a stored
 * API key are sent to /sign-in before any request is made. Listing,
 * ordering, local-time formatting, status badges, the loading, empty and
 * error states, and the cancel action live in
 * src/components/MyBookings.tsx, where they are unit tested. This file only
 * wires the route to the component and sets the page title.
 *
 * Exports: metadata (page title) and the default BookingsPage component. No
 * other functions.
 */
import type { Metadata } from "next";
import { MyBookings } from "@/components/MyBookings";
import { RequireAuth } from "@/components/RequireAuth";

export const metadata: Metadata = { title: "My bookings · RoomBook" };

export default function BookingsPage() {
  return (
    <RequireAuth>
      <MyBookings />
    </RequireAuth>
  );
}
