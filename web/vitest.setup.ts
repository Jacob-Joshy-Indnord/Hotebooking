/**
 * File: web/vitest.setup.ts
 *
 * Global setup that runs before every Vitest test file in the RoomBook
 * frontend suite. It does three things. It registers the
 * @testing-library/jest-dom matchers (toBeInTheDocument,
 * toHaveAccessibleName and so on) with Vitest's expect. It replaces
 * next/navigation with a mock whose router functions (push, replace) are
 * shared vi.fn() spies exported as `mockRouter`, and whose search params come
 * from `mockSearchParams`, so tests can assert redirects without a running
 * Next.js app. After each test it unmounts rendered trees, clears
 * sessionStorage and the search params, and resets every mock so tests stay
 * independent.
 *
 * Exports: mockRouter and mockSearchParams. No other functions.
 */
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

export const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  prefetch: vi.fn(),
};

export const mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
  useSearchParams: () => mockSearchParams,
  usePathname: () => "/",
}));

afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
  for (const key of [...mockSearchParams.keys()]) mockSearchParams.delete(key);
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});
