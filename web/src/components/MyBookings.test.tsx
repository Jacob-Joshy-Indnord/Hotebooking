/**
 * File: web/src/components/MyBookings.test.tsx
 *
 * Component tests for the My bookings page (task-WceMuIzqLru), with fetch
 * mocked through mockFetch(). Fixtures use dates far in the past (2020) and
 * future (2099), so "upcoming" doesn't depend on the clock. Covered: rows
 * show room, title, start, end in local time and a status badge, with
 * upcoming before past and the API's order kept inside each group; the
 * empty state; and the error state with a "Try again" that reloads the list.
 * Cancel action tests live in CancelBooking.test.tsx.
 * Fixtures and the renderPage()/rowFor() helpers come from
 * src/test/bookings.tsx. Local helper: titlesIn(table).
 */
import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LIST, past, pastOlder, renderPage, rowFor, upcoming, upcomingLater } from "@/test/bookings";
import { mockFetch } from "@/test/utils";

function titlesIn(table: HTMLElement): (string | null)[] {
  return within(table).getAllByRole("rowheader").map((cell) => cell.textContent);
}

describe("Bookings listed with status", () => {
  it("shows room, title, start, end and status with upcoming first", async () => {
    mockFetch({ [LIST]: { status: 200, body: [upcoming, upcomingLater, past, pastOlder] } });
    renderPage();

    const upcomingTable = await screen.findByRole("table", { name: "Upcoming bookings" });
    const pastTable = screen.getByRole("table", { name: "Past bookings" });
    expect(upcomingTable.compareDocumentPosition(pastTable) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(titlesIn(upcomingTable)).toEqual(["Quarterly planning", "Design review"]);
    expect(titlesIn(pastTable)).toEqual(["Retro", "Kick-off"]);

    const row = rowFor("Quarterly planning");
    expect(within(row).getByText("Room #3")).toBeInTheDocument();
    expect(within(row).getByText("Confirmed")).toBeInTheDocument();
    const times = row.querySelectorAll("time");
    expect(times[0]).toHaveAttribute("dateTime", "2099-03-10T09:00:00Z");
    expect(times[1]).toHaveAttribute("dateTime", "2099-03-10T10:00:00Z");
    expect(times[0].textContent).toBe(
      new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(upcoming.start)),
    );

    expect(within(rowFor("Kick-off")).getByText("Released")).toBeInTheDocument();
  });

  it("labels the columns for assistive technology", async () => {
    mockFetch({ [LIST]: { status: 200, body: [upcoming] } });
    renderPage();

    const table = await screen.findByRole("table", { name: "Upcoming bookings" });
    expect(within(table).getAllByRole("columnheader").map((h) => h.textContent)).toEqual([
      "Room", "Title", "Start", "End", "Status", "Actions",
    ]);
  });
});

describe("Empty state", () => {
  it("says there are no bookings yet", async () => {
    mockFetch({ [LIST]: { status: 200, body: [] } });
    renderPage();

    expect(await screen.findByText("You have no bookings yet.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});

describe("Error state", () => {
  it("shows an error with a retry that reloads the list", async () => {
    let calls = 0;
    mockFetch({
      [LIST]: () => (++calls === 1 ? { status: 500, body: { detail: "database unavailable" } } : { status: 200, body: [upcoming] }),
    });
    const { user } = renderPage();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("database unavailable");

    await user.click(within(alert).getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("Quarterly planning")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
