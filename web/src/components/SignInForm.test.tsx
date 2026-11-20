/**
 * File: web/src/components/SignInForm.test.tsx
 *
 * Component tests for the API key sign-in screen and the role detection
 * that drives admin navigation (task-xR5tK2uAzH2). fetch is mocked with
 * mockFetch(), so no backend is needed. Covered: a valid key is stored in
 * sessionStorage and the user goes to My bookings, with role "staff" when
 * the report probe returns 403 and "admin" when it returns 200. An invalid
 * key shows an error, stores nothing and causes no redirect. An empty
 * submission is rejected without any request. The reason=unauthenticated
 * banner explains the key problem. Signing out from the NavBar removes the
 * key, returns to sign-in and makes protected pages require sign-in again.
 * Helpers: reportProbeKey() and submitKey(user, key).
 */
import { screen, waitFor } from "@testing-library/react";
import type { UserEvent } from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { mockRouter, mockSearchParams } from "../../vitest.setup";
import { getApiKey, getRole, saveSession } from "@/lib/session";
import { mockFetch, renderWithAuth } from "@/test/utils";
import { NavBar } from "./NavBar";
import { RequireAuth } from "./RequireAuth";
import { SignInForm } from "./SignInForm";

function reportProbeKey(): string {
  const today = new Date().toISOString().slice(0, 10);
  return `GET /api/reports/utilisation?start_date=${today}&end_date=${today}`;
}

async function submitKey(user: UserEvent, key: string) {
  await user.type(screen.getByLabelText("API key"), key);
  await user.click(screen.getByRole("button", { name: "Sign in" }));
}

describe("Valid key accepted", () => {
  it("stores the key as staff when the report probe is forbidden and goes to My bookings", async () => {
    const fetchMock = mockFetch({
      "GET /api/bookings/mine": { status: 200, body: [] },
      [reportProbeKey()]: { status: 403, body: { detail: "admin only" } },
    });
    const { user } = renderWithAuth(<SignInForm />);

    await submitKey(user, "  staff-key  ");

    await waitFor(() => expect(mockRouter.push).toHaveBeenCalledWith("/bookings"));
    expect(getApiKey()).toBe("staff-key");
    expect(getRole()).toBe("staff");
    const headers = fetchMock.mock.calls.map(([, init]) => new Headers(init.headers).get("X-API-Key"));
    expect(headers).toEqual(["staff-key", "staff-key"]);
  });

  it("stores the admin role when the report probe succeeds", async () => {
    mockFetch({
      "GET /api/bookings/mine": { status: 200, body: [] },
      [reportProbeKey()]: { status: 200, body: [] },
    });
    const { user } = renderWithAuth(<SignInForm />);

    await submitKey(user, "admin-key");

    await waitFor(() => expect(mockRouter.push).toHaveBeenCalledWith("/bookings"));
    expect(getRole()).toBe("admin");
  });
});

describe("Invalid key rejected", () => {
  it("shows an error and does not store the key", async () => {
    mockFetch({ "GET /api/bookings/mine": { status: 401, body: { detail: "invalid API key" } } });
    const { user } = renderWithAuth(<SignInForm />);

    await submitKey(user, "wrong");

    expect(await screen.findByRole("alert")).toHaveTextContent("That API key was not recognised");
    expect(screen.getByLabelText("API key")).toHaveAttribute("aria-invalid", "true");
    expect(getApiKey()).toBeNull();
    expect(mockRouter.push).not.toHaveBeenCalled();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it("asks for a key without calling the API when the field is empty", async () => {
    const fetchMock = mockFetch({});
    const { user } = renderWithAuth(<SignInForm />);

    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Enter your API key.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("explains why the user was sent back after a 401", () => {
    mockSearchParams.set("reason", "unauthenticated");
    renderWithAuth(<SignInForm />);

    expect(screen.getByRole("status")).toHaveTextContent("Your API key is missing or invalid");
  });
});

describe("Sign out clears key", () => {
  it("removes the key, returns to sign-in and re-protects pages", async () => {
    saveSession("staff-key", "staff");
    const { user } = renderWithAuth(
      <>
        <NavBar />
        <RequireAuth>
          <p>protected</p>
        </RequireAuth>
      </>,
    );
    expect(await screen.findByText("protected")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Sign out" }));

    expect(getApiKey()).toBeNull();
    expect(getRole()).toBeNull();
    expect(mockRouter.replace).toHaveBeenCalledWith("/sign-in?reason=signed-out");
    expect(screen.queryByText("protected")).not.toBeInTheDocument();
    expect(mockRouter.replace).toHaveBeenCalledWith("/sign-in");
  });
});
