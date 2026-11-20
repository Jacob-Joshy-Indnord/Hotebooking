/**
 * File: web/src/app/page.tsx
 *
 * Root route ("/") of the RoomBook UI. It has no content of its own: My
 * bookings is the home screen for every user, so this server component
 * redirects straight to /bookings. If the visitor isn't signed in,
 * RequireAuth on /bookings then sends them to /sign-in. Keeping the redirect
 * here means bookmarks and links to the bare origin always land on a useful
 * screen, and there is one place to change if a dashboard is added later.
 * The redirect happens on the server, so no client JavaScript is needed for
 * this hop.
 *
 * Exports: the default Home component, which calls Next.js redirect(). It
 * has no other functions.
 */
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/bookings");
}
