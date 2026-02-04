import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import AdminPanel from "../pages/AdminPanel.jsx";

const mockNavigate = vi.fn();
const mockAdminDashboard = vi.fn();
const mockApprove = vi.fn();

vi.mock("../services/api", () => ({
  getStoredUser: () => ({ first_name: "Jane", last_name: "Admin", role: "admin" }),
  logoutSession: vi.fn(),
  reportApi: {
    adminDashboard: (...args) => mockAdminDashboard(...args),
  },
  supplyRequestsApi: {
    approve: (...args) => mockApprove(...args),
    decline: vi.fn(),
  },
  inventoryApi: {
    updatePaymentStatus: vi.fn(),
  },
  usersApi: {
    setActive: vi.fn(),
    remove: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("Admin panel actions", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockApprove.mockReset();
    mockAdminDashboard.mockReset();
    mockAdminDashboard.mockResolvedValue({
      data: {
        stats: { active_clerks: 1, pending_requests: 1, unpaid_products: 1, store_value: 1000 },
        supply_requests: [
          {
            id: 5,
            product: "Rice",
            quantity: 20,
            requested_by: "Mike Clerk",
            date: "2026-02-01T00:00:00Z",
            notes: "Low stock",
            status: "Pending",
          },
        ],
        payment_status: [],
        clerks: [],
        clerk_performance: [],
      },
    });
    mockApprove.mockResolvedValue({ data: {} });
  });

  it("approves a pending supply request", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <AdminPanel />
      </MemoryRouter>
    );

    await waitFor(() => expect(mockAdminDashboard).toHaveBeenCalled());
    await user.click(screen.getByRole("button", { name: "Approve" }));

    await waitFor(() => {
      expect(mockApprove).toHaveBeenCalledWith(5);
    });
  });
});
