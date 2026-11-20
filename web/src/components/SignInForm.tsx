/**
 * File: web/src/components/SignInForm.tsx
 *
 * API key sign-in screen, plus the role detection behind the admin-only
 * navigation (task-xR5tK2uAzH2). The user pastes their per-user key into a
 * masked, labelled field. On submit the key is checked with GET
 * /bookings/mine, with the global 401 redirect silenced. A 401 shows an
 * inline error and stores nothing. If the key is valid, the role is found by
 * calling the admin-only report endpoint for today (UTC): 200 means admin,
 * anything else means staff, because the API has no identity endpoint. The
 * key and role then go to sessionStorage and the user is sent to My
 * bookings. A `reason` query parameter shows a banner after a 401 or sign out.
 *
 * Exports: SignInForm. Internal helpers: detectRole(apiKey) and
 * todayUtc().
 */
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useId, useState } from "react";
import { ApiError, myBookings, utilisationReport } from "@/lib/api";
import type { Role } from "@/lib/session";
import { useAuth } from "./AuthProvider";

const REASON_MESSAGES: Record<string, string> = {
  unauthenticated: "Your API key is missing or invalid. Please sign in again.",
  "signed-out": "You have signed out.",
};

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

async function detectRole(apiKey: string): Promise<Role> {
  try {
    const today = todayUtc();
    await utilisationReport(today, today, { apiKey, silenceUnauthenticated: true });
    return "admin";
  } catch {
    // 403 is the expected answer for staff; any other failure also falls
    // back to the least-privileged view (the API enforces roles anyway).
    return "staff";
  }
}

export function SignInForm() {
  const router = useRouter();
  const reason = useSearchParams().get("reason");
  const { signIn } = useAuth();
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputId = useId();
  const hintId = useId();
  const errorId = useId();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const key = apiKey.trim();
    if (!key) {
      setError("Enter your API key.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await myBookings({ apiKey: key, silenceUnauthenticated: true });
      signIn(key, await detectRole(key));
      router.push("/bookings");
    } catch (err) {
      setError(
        err instanceof ApiError && err.kind === "unauthenticated"
          ? "That API key was not recognised. Check it and try again."
          : err instanceof Error
            ? err.message
            : "Sign-in failed. Please try again.",
      );
      setSubmitting(false);
    }
  }

  const banner = reason ? REASON_MESSAGES[reason] : undefined;

  return (
    <section aria-labelledby="sign-in-heading" className="mx-auto max-w-md">
      <h1 id="sign-in-heading" className="text-2xl font-semibold">
        Sign in to RoomBook
      </h1>
      {banner && (
        <p role="status" className="mt-4 rounded-md bg-slate-100 px-4 py-3 text-sm text-slate-800">
          {banner}
        </p>
      )}
      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
        <div>
          <label htmlFor={inputId} className="block text-sm font-medium text-slate-800">
            API key
          </label>
          <p id={hintId} className="mt-1 text-sm text-slate-600">
            Paste the personal key you were issued. It is kept only for this browser tab.
          </p>
          <input
            id={inputId}
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${hintId} ${errorId}` : hintId}
            className="mt-2 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-sm shadow-sm focus-visible:border-indigo-600 focus-visible:outline-2 focus-visible:outline-indigo-600 aria-invalid:border-red-600"
          />
          {error && (
            <p id={errorId} role="alert" className="mt-2 text-sm text-red-700">
              {error}
            </p>
          )}
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-wait disabled:opacity-70"
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </section>
  );
}
