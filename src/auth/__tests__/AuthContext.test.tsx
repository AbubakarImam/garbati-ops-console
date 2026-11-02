import { act, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "../AuthContext";
import { apiFetch } from "../../api/client";

// Renders AuthProvider under a real Router with two routes: "/home" (a consumer that shows the current
// auth state) and "/login" (a marker so a redirect is observable the same way a real browser user would
// see it - the URL/screen actually changing, not just an internal flag).
function Consumer() {
  const { user, isInitializing } = useAuth();
  return <span data-testid="state">{isInitializing ? "loading" : user ? `user:${user.role}` : "anonymous"}</span>;
}

function renderApp(initialPath = "/home") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthProvider>
        <Routes>
          <Route path="/home" element={<Consumer />} />
          <Route path="/login" element={<div data-testid="login-page">Login</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AuthContext: GET /v1/ops/me on initial load", () => {
  it("starts in a loading state, then reaches Login (not a crash) when /v1/ops/me returns 401", async () => {
    // DESIGN.md Section 4 step 3: "A 401 here means 'not logged in' - route to Login, no
    // special-casing needed elsewhere." Simulates a page load with no session cookie at all. Because
    // the initial GET /v1/ops/me goes through the SAME apiFetch every other call uses, its 401 also
    // goes through the one shared handler (step 4) - by design, "no special-casing elsewhere" means
    // this isn't a separate code path, it's the exact same one. The visible result is the same either
    // way: the screen ends up on Login, not stuck loading and not crashed.
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 401 })));

    renderApp();

    expect(screen.getByTestId("state")).toHaveTextContent("loading");

    await waitFor(() => expect(screen.getByTestId("login-page")).toBeInTheDocument());
  });

  it("also settles to unauthenticated, without throwing, on a non-401 failure (e.g. a network error)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    renderApp();

    await waitFor(() => expect(screen.getByTestId("state")).toHaveTextContent("anonymous"));
  });

  it("populates the user from /v1/ops/me when a session already exists (e.g. a refresh)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ staffId: "STF-1", fullName: "Tolu Teller", role: "Teller" })),
    );

    renderApp();

    await waitFor(() => expect(screen.getByTestId("state")).toHaveTextContent("user:Teller"));
  });
});

describe("AuthContext: any 401, anywhere, redirects to Login", () => {
  it("clears the user and navigates to /login when a later, unrelated call comes back 401", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    // Initial GET /v1/ops/me succeeds - a logged-in staff member loading the app.
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ staffId: "STF-1", fullName: "Tolu Teller", role: "Teller" }),
    );
    renderApp();
    await waitFor(() => expect(screen.getByTestId("state")).toHaveTextContent("user:Teller"));

    // Some unrelated later call - e.g. the reversal queue's own GET /v1/ops/reversals - comes back 401
    // (session expired mid-use, or revoked by an Administrator action elsewhere, DESIGN.md Section 4
    // step 4). This is the exact "any call, anywhere" path: nothing about this call is login-specific.
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 401 }));
    await act(async () => {
      await apiFetch("/v1/ops/reversals").catch(() => undefined);
    });

    await waitFor(() => expect(screen.getByTestId("login-page")).toBeInTheDocument());
  });
});
