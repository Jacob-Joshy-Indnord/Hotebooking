/**
 * File: web/src/components/UtilisationReport.test.tsx
 *
 * Component tests for the Utilisation report page (task-o7w7zuWCezc), with
 * fetch mocked through mockFetch(). Covered scenarios: an admin picks a date
 * range and submits, and gets a table with one row per room (floor, booked
 * hours, released hours, booking count), with the dates sent as YYYY-MM-DD
 * UTC days and the API key attached. An end date before the start date
 * shows a validation message, marks the field invalid and sends no request.
 * A range where no room has activity shows the empty state. A failed call
 * shows an error with a working retry. The access-guard tests live in
 * AdminAccess.test.tsx.
 * Helpers: renderAsAdmin() and setRange(user, start, end).
 */
import { screen, within } from "@testing-library/react";
import type { UserEvent } from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { RoomUtilisation } from "@/lib/api";
import { saveSession } from "@/lib/session";
import { mockFetch, renderWithAuth } from "@/test/utils";
import { UtilisationReport } from "./UtilisationReport";

const REPORT = "GET /api/reports/utilisation?start_date=2026-11-01&end_date=2026-11-07";

const rows: RoomUtilisation[] = [
  { room_id: 1, room_name: "Aurora", floor: 1, booked_hours: 12.5, released_hours: 0.75, booking_count: 9 },
  { room_id: 2, room_name: "Borealis", floor: 2, booked_hours: 0, released_hours: 0, booking_count: 0 },
];

function renderAsAdmin() {
  saveSession("admin-key", "admin");
  return renderWithAuth(<UtilisationReport />);
}

async function setRange(user: UserEvent, start: string, end: string) {
  const startInput = await screen.findByLabelText("Start date (UTC)");
  const endInput = screen.getByLabelText("End date (UTC)");
  await user.clear(startInput);
  await user.type(startInput, start);
  await user.clear(endInput);
  await user.type(endInput, end);
}

describe("Per-room table", () => {
  it("shows booked hours, released hours and booking count per room", async () => {
    const fetchMock = mockFetch({ [REPORT]: { status: 200, body: rows } });
    const { user } = renderAsAdmin();

    await setRange(user, "2026-11-01", "2026-11-07");
    await user.click(screen.getByRole("button", { name: "Show report" }));

    const table = await screen.findByRole("table", { name: "Utilisation by room, 2026-11-01 to 2026-11-07 (UTC)" });
    const headers = within(table).getAllByRole("columnheader").map((h) => h.textContent);
    expect(headers).toEqual(["Room", "Floor", "Booked hours", "Released hours", "Bookings"]);

    const aurora = within(table).getByRole("row", { name: /Aurora/ });
    expect(within(aurora).getAllByRole("cell").map((c) => c.textContent)).toEqual(["1", "12.5", "0.75", "9"]);
    const borealis = within(table).getByRole("row", { name: /Borealis/ });
    expect(within(borealis).getAllByRole("cell").map((c) => c.textContent)).toEqual(["2", "0", "0", "0"]);

    expect(new Headers(fetchMock.mock.calls[0][1].headers).get("X-API-Key")).toBe("admin-key");
  });

  it("tells the user the dates are UTC days", async () => {
    renderAsAdmin();
    expect(await screen.findByLabelText("Start date (UTC)")).toHaveAccessibleDescription(
      "Dates are whole days in UTC; both days are included.",
    );
  });
});

describe("Invalid range blocked", () => {
  it("shows a validation message and sends no request", async () => {
    const fetchMock = mockFetch({});
    const { user } = renderAsAdmin();

    await setRange(user, "2026-11-07", "2026-11-01");
    await user.click(screen.getByRole("button", { name: "Show report" }));

    expect(screen.getByRole("alert")).toHaveTextContent("End date must be on or after the start date.");
    expect(screen.getByLabelText("End date (UTC)")).toHaveAttribute("aria-invalid", "true");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("Empty range", () => {
  it("shows an empty-state message when no room has activity", async () => {
    mockFetch({ [REPORT]: { status: 200, body: [rows[1]] } });
    const { user } = renderAsAdmin();

    await setRange(user, "2026-11-01", "2026-11-07");
    await user.click(screen.getByRole("button", { name: "Show report" }));

    expect(await screen.findByText("No room bookings in this date range.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});

describe("Error state", () => {
  it("shows the error with a retry action", async () => {
    let calls = 0;
    mockFetch({
      [REPORT]: () => (++calls === 1 ? { status: 500, body: { detail: "report failed" } } : { status: 200, body: rows }),
    });
    const { user } = renderAsAdmin();

    await setRange(user, "2026-11-01", "2026-11-07");
    await user.click(screen.getByRole("button", { name: "Show report" }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("report failed");

    await user.click(within(alert).getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("table")).toBeInTheDocument();
  });
});
