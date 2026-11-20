/**
 * File: web/src/components/CancelBooking.test.tsx
 *
 * Component tests for the Cancel booking action on the My bookings page
 * (task-iEJbv0O1OH3), with fetch mocked through mockFetch(). Covered
 * scenarios: cancel appears only on upcoming Confirmed bookings, never on
 * past, Released or Cancelled ones. Confirming calls POST
 * /bookings/{id}/cancel, refreshes the list, shows the booking as Cancelled
 * and announces it. Choosing "Keep booking" sends nothing and returns focus
 * to the Cancel button. An API refusal is shown as an alert and the booking
 * stays Confirmed and cancellable. Fixtures and the renderPage()/rowFor()
 * helpers come from src/test/bookings.tsx. No helper functions are defined
 * here.
 */
import { screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  LIST,
  cancelledUpcoming,
  past,
  releasedUpcoming,
  renderPage,
  rowFor,
  upcoming,
} from "@/test/bookings";
import { mockFetch } from "@/test/utils";

describe("Not offered when not allowed", () => {
  it("is offered only on upcoming Confirmed bookings", async () => {
    mockFetch({ [LIST]: { status: 200, body: [upcoming, releasedUpcoming, cancelledUpcoming, past] } });
    renderPage();
    await screen.findByText("Quarterly planning");

    expect(within(rowFor("Quarterly planning")).getByRole("button", { name: "Cancel Quarterly planning" })).toBeInTheDocument();
    for (const title of ["Released slot", "Cancelled slot", "Retro"]) {
      expect(within(rowFor(title)).queryByRole("button")).not.toBeInTheDocument();
    }
  });

  it("is not offered on a Confirmed booking that has already started", async () => {
    const started = { ...upcoming, title: "In progress", start: new Date(Date.now() - 60_000).toISOString(), end: "2099-01-01T00:00:00Z" };
    mockFetch({ [LIST]: { status: 200, body: [started] } });
    renderPage();
    await screen.findByText("In progress");

    expect(within(rowFor("In progress")).queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("Owner cancels upcoming booking", () => {
  it("cancels after confirmation and shows Cancelled once the list refreshes", async () => {
    let cancelled = false;
    const fetchMock = mockFetch({
      [LIST]: () => ({ status: 200, body: [cancelled ? { ...upcoming, status: "Cancelled" } : upcoming] }),
      "POST /api/bookings/1/cancel": () => {
        cancelled = true;
        return { status: 200, body: { ...upcoming, status: "Cancelled" } };
      },
    });
    const { user } = renderPage();
    await screen.findByText("Quarterly planning");

    await user.click(screen.getByRole("button", { name: "Cancel Quarterly planning" }));
    expect(screen.getByRole("group", { name: "Cancel this booking?" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Yes, cancel" }));

    await waitFor(() => expect(within(rowFor("Quarterly planning")).getByText("Cancelled")).toBeInTheDocument());
    expect(within(rowFor("Quarterly planning")).queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Booking cancelled.");
    expect(fetchMock.mock.calls.map(([url, init]) => `${init.method} ${url}`)).toEqual([
      LIST,
      "POST /api/bookings/1/cancel",
      LIST,
    ]);
  });

  it("does nothing when the user keeps the booking", async () => {
    const fetchMock = mockFetch({ [LIST]: { status: 200, body: [upcoming] } });
    const { user } = renderPage();
    await screen.findByText("Quarterly planning");

    await user.click(screen.getByRole("button", { name: "Cancel Quarterly planning" }));
    expect(screen.getByRole("button", { name: "Keep booking" })).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Keep booking" }));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Cancel Quarterly planning" })).toHaveFocus();
  });
});

describe("API refusal shown", () => {
  it("shows the error and leaves the booking unchanged", async () => {
    mockFetch({
      [LIST]: { status: 200, body: [upcoming] },
      "POST /api/bookings/1/cancel": { status: 409, body: { detail: "Booking has already started" } },
    });
    const { user } = renderPage();
    await screen.findByText("Quarterly planning");

    await user.click(screen.getByRole("button", { name: "Cancel Quarterly planning" }));
    await user.click(screen.getByRole("button", { name: "Yes, cancel" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Booking has already started");
    const row = rowFor("Quarterly planning");
    expect(within(row).getByText("Confirmed")).toBeInTheDocument();
    expect(within(row).getByRole("button", { name: "Cancel Quarterly planning" })).toBeInTheDocument();
  });
});
