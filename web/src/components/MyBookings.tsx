/**
 * File: web/src/components/MyBookings.tsx
 *
 * The My bookings page (task-WceMuIzqLru) and its cancel action
 * (task-iEJbv0O1OH3). It loads GET /bookings/mine and splits the rows into
 * "Upcoming" (start at or after now) and "Past" tables, keeping the API's
 * order. Each row shows "Room #<id>", the title, start and end in local time
 * and a status badge, with loading, empty and error-with-retry states.
 * Upcoming Confirmed rows get a Cancel button. It opens an inline
 * confirmation that moves focus to "Keep booking". Confirming calls the
 * cancel endpoint, refreshes the list and announces the result; a refusal is
 * shown in the row.
 *
 * Exports: MyBookings. Internal: BookingsTable, BookingRow, CancelControl,
 * formatDateTime(), isUpcoming() and isCancellable().
 */
"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { cancelBooking, myBookings, type Booking } from "@/lib/api";
import { StatusBadge } from "./StatusBadge";
import { EmptyState, ErrorState, LoadingState } from "./StatusMessages";

type LoadState =
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | { phase: "loaded"; bookings: Booking[] };

const dateTimeFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

function formatDateTime(iso: string): string {
  return dateTimeFormat.format(new Date(iso));
}

function isUpcoming(booking: Booking, now: number): boolean {
  return Date.parse(booking.start) >= now;
}

function isCancellable(booking: Booking, now: number): boolean {
  return booking.status === "Confirmed" && Date.parse(booking.start) > now;
}

export function MyBookings() {
  const [state, setState] = useState<LoadState>({ phase: "loading" });
  const [announcement, setAnnouncement] = useState("");

  const load = useCallback(async () => {
    try {
      setState({ phase: "loaded", bookings: await myBookings() });
    } catch (err) {
      setState({ phase: "error", message: err instanceof Error ? err.message : "Could not load your bookings." });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCancelled = useCallback(async () => {
    await load();
    setAnnouncement("Booking cancelled.");
  }, [load]);

  const now = Date.now();

  return (
    <section aria-labelledby="my-bookings-heading" className="space-y-6">
      <h1 id="my-bookings-heading" className="text-2xl font-semibold">
        My bookings
      </h1>
      <p role="status" className="sr-only">
        {announcement}
      </p>
      {state.phase === "loading" && <LoadingState label="Loading your bookings…" />}
      {state.phase === "error" && (
        <ErrorState
          message={state.message}
          onRetry={() => {
            setState({ phase: "loading" });
            void load();
          }}
        />
      )}
      {state.phase === "loaded" && state.bookings.length === 0 && (
        <EmptyState>You have no bookings yet.</EmptyState>
      )}
      {state.phase === "loaded" && state.bookings.length > 0 && (
        <>
          <BookingsTable
            caption="Upcoming bookings"
            bookings={state.bookings.filter((b) => isUpcoming(b, now))}
            now={now}
            onCancelled={handleCancelled}
          />
          <BookingsTable
            caption="Past bookings"
            bookings={state.bookings.filter((b) => !isUpcoming(b, now))}
            now={now}
            onCancelled={handleCancelled}
          />
        </>
      )}
    </section>
  );
}

interface RowActions {
  now: number;
  onCancelled: () => Promise<void>;
}

function BookingsTable({
  caption,
  bookings,
  now,
  onCancelled,
}: { caption: string; bookings: Booking[] } & RowActions) {
  if (bookings.length === 0) return null;
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <caption className="px-4 pt-4 text-left text-lg font-semibold text-slate-900">{caption}</caption>
        <thead>
          <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
            <th scope="col" className="px-4 py-3">Room</th>
            <th scope="col" className="px-4 py-3">Title</th>
            <th scope="col" className="px-4 py-3">Start</th>
            <th scope="col" className="px-4 py-3">End</th>
            <th scope="col" className="px-4 py-3">Status</th>
            <th scope="col" className="px-4 py-3"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {bookings.map((booking) => (
            <BookingRow key={booking.id} booking={booking} now={now} onCancelled={onCancelled} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BookingRow({ booking, now, onCancelled }: { booking: Booking } & RowActions) {
  return (
    <tr className="align-top">
      <td className="whitespace-nowrap px-4 py-3">Room #{booking.room_id}</td>
      <th scope="row" className="px-4 py-3 text-left font-medium text-slate-900">
        {booking.title}
      </th>
      <td className="whitespace-nowrap px-4 py-3">
        <time dateTime={booking.start}>{formatDateTime(booking.start)}</time>
      </td>
      <td className="whitespace-nowrap px-4 py-3">
        <time dateTime={booking.end}>{formatDateTime(booking.end)}</time>
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={booking.status} />
      </td>
      <td className="px-4 py-3 text-right">
        {isCancellable(booking, now) && <CancelControl booking={booking} onCancelled={onCancelled} />}
      </td>
    </tr>
  );
}

function CancelControl({ booking, onCancelled }: { booking: Booking; onCancelled: () => Promise<void> }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const keepRef = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef(false);
  const promptId = useId();

  useEffect(() => {
    if (confirming) keepRef.current?.focus();
    else if (returnFocus.current) {
      returnFocus.current = false;
      triggerRef.current?.focus();
    }
  }, [confirming]);

  function close() {
    returnFocus.current = true;
    setConfirming(false);
  }

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await cancelBooking(booking.id);
      await onCancelled();
    } catch (err) {
      setError(err instanceof Error ? err.message : "The booking could not be cancelled.");
      setBusy(false);
      close();
    }
  }

  const buttonBase =
    "rounded-md px-3 py-1.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60";

  return (
    <div className="flex flex-col items-end gap-2">
      {confirming ? (
        <div
          role="group"
          aria-labelledby={promptId}
          onKeyDown={(event) => event.key === "Escape" && !busy && close()}
          className="flex flex-wrap items-center justify-end gap-2"
        >
          <span id={promptId} className="text-slate-800">
            Cancel this booking?
          </span>
          <button
            type="button"
            onClick={confirm}
            disabled={busy}
            className={`${buttonBase} bg-red-600 text-white hover:bg-red-700 focus-visible:outline-red-600`}
          >
            {busy ? "Cancelling…" : "Yes, cancel"}
          </button>
          <button
            ref={keepRef}
            type="button"
            onClick={close}
            disabled={busy}
            className={`${buttonBase} border border-slate-300 text-slate-700 hover:bg-slate-100 focus-visible:outline-indigo-600`}
          >
            Keep booking
          </button>
        </div>
      ) : (
        <button
          ref={triggerRef}
          type="button"
          onClick={() => {
            setError(null);
            setConfirming(true);
          }}
          aria-label={`Cancel ${booking.title}`}
          className={`${buttonBase} border border-red-300 text-red-700 hover:bg-red-50 focus-visible:outline-red-600`}
        >
          Cancel
        </button>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
