/**
 * File: web/src/app/layout.tsx
 *
 * Root layout for the RoomBook Next.js App Router. It is the shared shell
 * around every page. It sets the document language and page metadata, loads
 * the global Tailwind stylesheet, and wraps all content in AuthProvider so
 * every client component can read the session (API key and role) and react
 * to 401s. It also renders a "Skip to content" link for keyboard users, the
 * NavBar header (which shows the admin-only report link only to admins), and
 * a centred <main> landmark with id="main" that the skip link targets.
 *
 * Exports: metadata (title and description for the <head>) and the default
 * RootLayout component, which takes the page as children. No other functions.
 */
import type { Metadata } from "next";
import { AuthProvider } from "@/components/AuthProvider";
import { NavBar } from "@/components/NavBar";
import "./globals.css";

export const metadata: Metadata = {
  title: "RoomBook",
  description: "Book meeting rooms and review utilisation.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:shadow"
          >
            Skip to content
          </a>
          <NavBar />
          <main id="main" className="mx-auto max-w-5xl px-4 py-8">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
