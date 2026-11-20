/**
 * File: web/src/components/AdminAccess.test.tsx
 *
 * Component tests for the admin-only navigation and access guard
 * (task-xR5tK2uAzH2), with fetch mocked through mockFetch(). Navigation:
 * staff see My bookings but no Utilisation report link, and admins see the
 * report link pointing at /reports/utilisation. Direct access: a staff user
 * opening the report page sees an "Access denied" screen, with no form and
 * no request sent. If the cached role is admin but the API answers 403 (for
 * example the role changed after sign-in), the 403 is handled and the page
 * becomes Access denied with no table or form shown.
 * Helper: renderReportAs(role).
 */
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { saveSession, type Role } from "@/lib/session";
import { mockFetch, renderWithAuth } from "@/test/utils";
import { NavBar } from "./NavBar";
import { UtilisationReport } from "./UtilisationReport";

function renderReportAs(role: Role) {
  saveSession(`${role}-key`, role);
  return renderWithAuth(<UtilisationReport />);
}

describe("Staff do not see report link", () => {
  it("hides the Utilisation report link from staff", async () => {
    saveSession("staff-key", "staff");
    renderWithAuth(<NavBar />);

    expect(await screen.findByRole("link", { name: "My bookings" })).toHaveAttribute("href", "/bookings");
    expect(screen.queryByRole("link", { name: "Utilisation report" })).not.toBeInTheDocument();
  });
});

describe("Admin sees report link", () => {
  it("shows the Utilisation report link to admins", async () => {
    saveSession("admin-key", "admin");
    renderWithAuth(<NavBar />);

    expect(await screen.findByRole("link", { name: "Utilisation report" })).toHaveAttribute(
      "href",
      "/reports/utilisation",
    );
  });
});

describe("Direct access blocked", () => {
  it("shows access denied to staff without calling the API", async () => {
    const fetchMock = mockFetch({});
    renderReportAs("staff");

    expect(await screen.findByRole("heading", { name: "Access denied" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Show report" })).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("handles an API 403 with access denied and no data", async () => {
    mockFetch({
      "GET /api/reports/utilisation?start_date=2026-11-01&end_date=2026-11-07": {
        status: 403,
        body: { detail: "admin only" },
      },
    });
    const { user } = renderReportAs("admin");

    const startInput = await screen.findByLabelText("Start date (UTC)");
    await user.clear(startInput);
    await user.type(startInput, "2026-11-01");
    const endInput = screen.getByLabelText("End date (UTC)");
    await user.clear(endInput);
    await user.type(endInput, "2026-11-07");
    await user.click(screen.getByRole("button", { name: "Show report" }));

    expect(await screen.findByRole("heading", { name: "Access denied" })).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Start date (UTC)")).not.toBeInTheDocument();
  });
});
