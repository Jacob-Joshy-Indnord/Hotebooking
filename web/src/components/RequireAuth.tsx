/**
 * File: web/src/components/RequireAuth.tsx
 *
 * Gate for pages that need a signed-in user (My bookings and the
 * Utilisation report). It waits until the AuthProvider has read
 * sessionStorage, so a reload never flashes a redirect. If there is no
 * stored API key (never signed in, signed out, or cleared after a 401), it
 * replaces the route with /sign-in. While checking or redirecting it shows a
 * polite loading status, not the protected content. With a key present it
 * renders its children. This gate only improves the experience; the API
 * rejects requests without a valid key.
 *
 * Exports: RequireAuth, a component that takes children. It has no other
 * functions; it uses useAuth() and the Next.js router.
 */
"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "./AuthProvider";
import { LoadingState } from "./StatusMessages";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { ready, apiKey } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && !apiKey) router.replace("/sign-in");
  }, [ready, apiKey, router]);

  if (!ready || !apiKey) return <LoadingState label="Checking sign-in…" />;
  return <>{children}</>;
}
