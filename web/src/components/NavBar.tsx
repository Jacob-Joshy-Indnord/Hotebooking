/**
 * File: web/src/components/NavBar.tsx
 *
 * Main navigation for the RoomBook UI, including the admin-only report link
 * (task-xR5tK2uAzH2). Signed-out visitors see only the product name.
 * Signed-in users see a "Main" nav landmark with a My bookings link and a
 * Sign out button that clears the stored key. The Utilisation report link
 * is shown only when the cached role is "admin". Staff never see it, but the
 * report page still guards direct visits and the API enforces the role. The
 * link for the current route gets aria-current="page" and a visible
 * underline, so the active state isn't shown by colour alone.
 *
 * Exports: NavBar (component). Internal helper: NavLink, which renders one
 * link with active-state styling.
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthProvider";

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const active = usePathname() === href;
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-md px-3 py-2 text-sm font-medium hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${
        active ? "text-indigo-700 underline underline-offset-4" : "text-slate-700"
      }`}
    >
      {children}
    </Link>
  );
}

export function NavBar() {
  const { ready, apiKey, role, signOut } = useAuth();
  const signedIn = ready && Boolean(apiKey);

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-3">
        <span className="text-lg font-semibold text-slate-900">RoomBook</span>
        {signedIn && (
          <nav aria-label="Main" className="flex items-center gap-1">
            <NavLink href="/bookings">My bookings</NavLink>
            {role === "admin" && <NavLink href="/reports/utilisation">Utilisation report</NavLink>}
            <button
              type="button"
              onClick={signOut}
              className="ml-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              Sign out
            </button>
          </nav>
        )}
      </div>
    </header>
  );
}
