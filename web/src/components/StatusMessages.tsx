/**
 * File: web/src/components/StatusMessages.tsx
 *
 * Shared, accessible state panels used by every RoomBook page so loading,
 * empty, error and access-denied screens look and behave the same way.
 * LoadingState is a polite live region (role="status"), so screen readers
 * announce progress without interrupting. EmptyState is plain text for "no
 * data" results. ErrorState uses role="alert" and, when given onRetry, shows
 * a "Try again" button that re-runs the failed request. AccessDenied is the
 * screen for API 403 responses and staff opening admin pages: a heading and
 * an explanation, with no data shown.
 *
 * Exports: LoadingState({ label }), EmptyState({ children }),
 * ErrorState({ message, onRetry? }) and AccessDenied({ message? }). All are
 * presentational and hold no state of their own.
 */
"use client";

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <p role="status" className="py-8 text-center text-sm text-slate-600">
      {label}
    </p>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center text-slate-600">
      {children}
    </p>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800"
    >
      <span>{message}</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-800 hover:bg-red-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export function AccessDenied({
  message = "This page is only available to Facilities admins.",
}: {
  message?: string;
}) {
  return (
    <section
      aria-labelledby="access-denied-heading"
      className="rounded-lg border border-amber-200 bg-amber-50 px-6 py-8 text-amber-900"
    >
      <h1 id="access-denied-heading" className="text-xl font-semibold">
        Access denied
      </h1>
      <p className="mt-2">{message}</p>
    </section>
  );
}
