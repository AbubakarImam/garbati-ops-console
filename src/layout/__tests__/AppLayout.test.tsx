import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AppLayout } from "../AppLayout";
import type { MeResponse } from "../../api/types";

// DESIGN.md Section 5 / task file item 6: "the role-gated nav/route logic actually shows/hides the
// right items per role (test at least two different roles against the matrix, not just one)."
// useAuth is mocked here (not AuthProvider's real network calls) so this test is purely about
// src/layout/AppLayout.tsx's own filtering against src/auth/roles.ts's matrix - a unit test of the UX
// layer, not a claim about server-side enforcement (that's OpsApi's own job, restated throughout this
// app's comments).
const mockUser = vi.fn<() => MeResponse | null>();
vi.mock("../../auth/AuthContext", () => ({
  useAuth: () => ({ user: mockUser(), isInitializing: false, login: vi.fn(), logout: vi.fn() }),
}));

function renderNav() {
  render(
    <MemoryRouter>
      <AppLayout />
    </MemoryRouter>,
  );
}

describe("AppLayout role-gated nav", () => {
  it("shows a Teller only the screens Teller is allowed to see", async () => {
    mockUser.mockReturnValue({ staffId: "STF-1", fullName: "Tolu Teller", role: "Teller" });
    renderNav();

    // antd's Menu mounts its items in an effect (rc-motion) - awaiting one findBy lets that settle
    // before the rest of this test's synchronous assertions, instead of a bare getByText racing it.
    expect(await screen.findByText("Customer & account lookup")).toBeInTheDocument();
    expect(screen.getByText("Request a reversal")).toBeInTheDocument();
    expect(screen.getByText("Transfer/transaction console")).toBeInTheDocument();

    // Not visible to Teller per OpsApi's own Authorization/OpsRoles.cs matrix (DESIGN.md Section 4).
    expect(screen.queryByText("Stage a customer edit")).not.toBeInTheDocument();
    expect(screen.queryByText("Customer edit approvals")).not.toBeInTheDocument();
    expect(screen.queryByText("Reversal approvals")).not.toBeInTheDocument();
    expect(screen.queryByText("Staff & role management")).not.toBeInTheDocument();
    expect(screen.queryByText("Joint-account approval (test console)")).not.toBeInTheDocument();
  });

  it("shows an Administrator only the screens Administrator is allowed to see", async () => {
    mockUser.mockReturnValue({ staffId: "STF-2", fullName: "Ada Admin", role: "Administrator" });
    renderNav();

    expect(await screen.findByText("Customer & account lookup")).toBeInTheDocument();
    expect(screen.getByText("Staff & role management")).toBeInTheDocument();

    // Administrator is deliberately absent from every maker-checker/testing-console/joint-approval row
    // (Authorization/OpsRoles.cs's own comment: "Administrator is deliberately absent").
    expect(screen.queryByText("Request a reversal")).not.toBeInTheDocument();
    expect(screen.queryByText("Reversal approvals")).not.toBeInTheDocument();
    expect(screen.queryByText("Stage a customer edit")).not.toBeInTheDocument();
    expect(screen.queryByText("Customer edit approvals")).not.toBeInTheDocument();
    expect(screen.queryByText("Transfer/transaction console")).not.toBeInTheDocument();
    expect(screen.queryByText("Joint-account approval (test console)")).not.toBeInTheDocument();
  });

  it("shows an Auditor the reversal and joint-approval queues read-only (no Administrator/Teller screens)", async () => {
    mockUser.mockReturnValue({ staffId: "STF-3", fullName: "Amina Auditor", role: "Auditor" });
    renderNav();

    expect(await screen.findByText("Customer & account lookup")).toBeInTheDocument();
    expect(screen.getByText("Reversal approvals")).toBeInTheDocument();
    expect(screen.getByText("Joint-account approval (test console)")).toBeInTheDocument();

    expect(screen.queryByText("Staff & role management")).not.toBeInTheDocument();
    expect(screen.queryByText("Request a reversal")).not.toBeInTheDocument();
    expect(screen.queryByText("Transfer/transaction console")).not.toBeInTheDocument();
  });
});
