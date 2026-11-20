/**
 * File: web/src/components/StatusBadge.tsx
 *
 * Status pill for a booking on the My bookings page (task-WceMuIzqLru). It
 * shows one of the three API statuses: Confirmed, Released (auto-released
 * as a no-show) or Cancelled. The status word is always visible text, so
 * the colour (green, amber or slate) only reinforces the meaning and the
 * badge reads correctly for screen-reader and colour-blind users. Each
 * colour pairing meets WCAG AA contrast for small text. Unknown future
 * statuses fall back to the neutral slate style instead of breaking the
 * row.
 *
 * Exports: StatusBadge({ status }). Internal constant STYLES maps each
 * status to its Tailwind classes. No other functions.
 */
import type { BookingStatus } from "@/lib/api";

const STYLES: Record<BookingStatus, string> = {
  Confirmed: "bg-emerald-100 text-emerald-800 ring-emerald-600/30",
  Released: "bg-amber-100 text-amber-900 ring-amber-600/30",
  Cancelled: "bg-slate-100 text-slate-700 ring-slate-500/30",
};

export function StatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
        STYLES[status] ?? STYLES.Cancelled
      }`}
    >
      {status}
    </span>
  );
}
