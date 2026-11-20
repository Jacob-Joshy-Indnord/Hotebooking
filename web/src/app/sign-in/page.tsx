/**
 * File: web/src/app/sign-in/page.tsx
 *
 * Route for /sign-in. It renders the API key sign-in form. SignInForm reads
 * the `reason` query parameter (for example reason=unauthenticated after a
 * 401, or reason=signed-out after signing out) with useSearchParams. In
 * Next.js 15 that hook must sit inside a Suspense boundary so the page can
 * be prerendered, and this file provides that boundary with a loading
 * fallback. All behaviour (validating the key, probing the role, storing
 * the session and redirecting to My bookings) lives in
 * src/components/SignInForm.tsx, where it is unit tested.
 *
 * Exports: metadata (page title) and the default SignInPage component. No
 * other functions.
 */
import type { Metadata } from "next";
import { Suspense } from "react";
import { SignInForm } from "@/components/SignInForm";
import { LoadingState } from "@/components/StatusMessages";

export const metadata: Metadata = { title: "Sign in · RoomBook" };

export default function SignInPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <SignInForm />
    </Suspense>
  );
}
