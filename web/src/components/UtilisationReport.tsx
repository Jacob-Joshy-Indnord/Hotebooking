/**
 * File: web/src/components/UtilisationReport.tsx
 *
 * Admin-only Utilisation report (task-o7w7zuWCezc) and its access guard
 * (task-xR5tK2uAzH2). Users cached as staff see the access-denied screen
 * with no API call, and an API 403 replaces the page with that screen. For
 * admins, start and end dates are whole UTC days sent as YYYY-MM-DD to GET
 * /reports/utilisation (both inclusive), and the form says so. An end date
 * before the start date is blocked before any request. Results are a table
 * with one row per room: floor, booked hours, released (no-show) hours and
 * booking count. A range with no activity shows an empty state, and
 * failures offer a retry.
 *
 * Exports: UtilisationReport. Internal: ReportTable, formatHours(),
 * isoDaysAgo() and hasActivity().
 */
"use client";

import { useId, useState } from "react";
import { ApiError, utilisationReport, type RoomUtilisation } from "@/lib/api";
import { useAuth } from "./AuthProvider";
import { AccessDenied, EmptyState, ErrorState, LoadingState } from "./StatusMessages";

type ReportState =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | { phase: "forbidden" }
  | { phase: "loaded"; rows: RoomUtilisation[]; start: string; end: string };

const hoursFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });

function formatHours(hours: number): string {
  return hoursFormat.format(hours);
}

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
}

function hasActivity(row: RoomUtilisation): boolean {
  return row.booking_count > 0 || row.booked_hours > 0 || row.released_hours > 0;
}

export function UtilisationReport() {
  const { role } = useAuth();
  const [startDate, setStartDate] = useState(() => isoDaysAgo(6));
  const [endDate, setEndDate] = useState(() => isoDaysAgo(0));
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [state, setState] = useState<ReportState>({ phase: "idle" });
  const startId = useId();
  const endId = useId();
  const hintId = useId();
  const rangeErrorId = useId();

  if (role === "staff" || state.phase === "forbidden") return <AccessDenied />;

  async function run(start: string, end: string) {
    setState({ phase: "loading" });
    try {
      setState({ phase: "loaded", rows: await utilisationReport(start, end), start, end });
    } catch (err) {
      if (err instanceof ApiError && err.kind === "forbidden") setState({ phase: "forbidden" });
      else setState({ phase: "error", message: err instanceof Error ? err.message : "Could not load the report." });
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!startDate || !endDate) {
      setRangeError("Choose both a start and an end date.");
      return;
    }
    if (endDate < startDate) {
      setRangeError("End date must be on or after the start date.");
      return;
    }
    setRangeError(null);
    void run(startDate, endDate);
  }

  const inputClass =
    "mt-1 block rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus-visible:border-indigo-600 focus-visible:outline-2 focus-visible:outline-indigo-600 aria-invalid:border-red-600";

  return (
    <section aria-labelledby="utilisation-heading" className="space-y-6">
      <h1 id="utilisation-heading" className="text-2xl font-semibold">
        Utilisation report
      </h1>
      <form onSubmit={handleSubmit} noValidate className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <p id={hintId} className="text-sm text-slate-600">
          Dates are whole days in UTC; both days are included.
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-4">
          <div>
            <label htmlFor={startId} className="block text-sm font-medium text-slate-800">
              Start date (UTC)
            </label>
            <input
              id={startId}
              type="date"
              required
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              aria-describedby={hintId}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor={endId} className="block text-sm font-medium text-slate-800">
              End date (UTC)
            </label>
            <input
              id={endId}
              type="date"
              required
              value={endDate}
              min={startDate || undefined}
              onChange={(event) => setEndDate(event.target.value)}
              aria-invalid={rangeError ? true : undefined}
              aria-describedby={rangeError ? `${hintId} ${rangeErrorId}` : hintId}
              className={inputClass}
            />
          </div>
          <button
            type="submit"
            disabled={state.phase === "loading"}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-wait disabled:opacity-70"
          >
            Show report
          </button>
        </div>
        {rangeError && (
          <p id={rangeErrorId} role="alert" className="mt-3 text-sm text-red-700">
            {rangeError}
          </p>
        )}
      </form>

      {state.phase === "loading" && <LoadingState label="Loading report…" />}
      {state.phase === "error" && (
        <ErrorState message={state.message} onRetry={() => void run(startDate, endDate)} />
      )}
      {state.phase === "loaded" &&
        (state.rows.some(hasActivity) ? (
          <ReportTable rows={state.rows} start={state.start} end={state.end} />
        ) : (
          <EmptyState>No room bookings in this date range.</EmptyState>
        ))}
    </section>
  );
}

function ReportTable({ rows, start, end }: { rows: RoomUtilisation[]; start: string; end: string }) {
  const numeric = "px-4 py-3 text-right tabular-nums";
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <caption className="px-4 pt-4 text-left text-lg font-semibold text-slate-900">
          Utilisation by room, {start} to {end} (UTC)
        </caption>
        <thead>
          <tr className="text-xs font-semibold uppercase tracking-wide text-slate-600">
            <th scope="col" className="px-4 py-3 text-left">Room</th>
            <th scope="col" className="px-4 py-3 text-right">Floor</th>
            <th scope="col" className="px-4 py-3 text-right">Booked hours</th>
            <th scope="col" className="px-4 py-3 text-right">Released hours</th>
            <th scope="col" className="px-4 py-3 text-right">Bookings</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr key={row.room_id}>
              <th scope="row" className="px-4 py-3 text-left font-medium text-slate-900">
                {row.room_name}
              </th>
              <td className={numeric}>{row.floor}</td>
              <td className={numeric}>{formatHours(row.booked_hours)}</td>
              <td className={numeric}>{formatHours(row.released_hours)}</td>
              <td className={numeric}>{row.booking_count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
