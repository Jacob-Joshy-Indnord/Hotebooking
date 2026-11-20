/**
 * File: web/src/components/AppShell.test.tsx
 *
 * Component tests for the shared app shell, the foundation the Web UI pages
 * sit on. The RequireAuth suite checks that protected content is hidden and
 * the user is sent to /sign-in when no key is stored, and that content
 * renders when a key is present. The "unauthenticated handled" suite drives
 * a real API call that returns 401 through the AuthProvider. It checks that
 * the session is cleared and the router is sent to
 * /sign-in?reason=unauthenticated. The NavBar suite checks that signed-out
 * visitors see no navigation. The admin-only link behaviour is tested in
 * AdminAccess.test.tsx.
 * Helper: Probe, a tiny component that calls the API on a button press.
 */
import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { mockRouter } from "../../vitest.setup";
import { myBookings } from "@/lib/api";
import { getApiKey, saveSession } from "@/lib/session";
import { mockFetch, renderWithAuth } from "@/test/utils";
import { NavBar } from "./NavBar";
import { RequireAuth } from "./RequireAuth";

describe("RequireAuth", () => {
  it("redirects to sign-in and hides content without a key", async () => {
    renderWithAuth(
      <RequireAuth>
        <p>secret content</p>
      </RequireAuth>,
    );

    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith("/sign-in"));
    expect(screen.queryByText("secret content")).not.toBeInTheDocument();
  });

  it("renders content when a key is stored", async () => {
    saveSession("k", "staff");
    renderWithAuth(
      <RequireAuth>
        <p>secret content</p>
      </RequireAuth>,
    );

    expect(await screen.findByText("secret content")).toBeInTheDocument();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });
});

function Probe() {
  return (
    <button type="button" onClick={() => myBookings().catch(() => undefined)}>
      call api
    </button>
  );
}

describe("unauthenticated handled", () => {
  it("clears the key and sends the user to sign-in on a 401", async () => {
    saveSession("revoked", "staff");
    mockFetch({ "GET /api/bookings/mine": { status: 401, body: { detail: "invalid API key" } } });
    const { user } = renderWithAuth(<Probe />);

    await user.click(screen.getByRole("button", { name: "call api" }));

    await waitFor(() =>
      expect(mockRouter.replace).toHaveBeenCalledWith("/sign-in?reason=unauthenticated"),
    );
    expect(getApiKey()).toBeNull();
  });
});

describe("NavBar", () => {
  it("shows no navigation when signed out", () => {
    renderWithAuth(<NavBar />);
    expect(screen.queryByRole("navigation", { name: "Main" })).not.toBeInTheDocument();
  });
});
