import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import MerchantDashboard from "../pages/MerchantDashboard.jsx";

const mockNavigate = vi.fn();
const mockMerchantDashboard = vi.fn();
const mockCreateInvite = vi.fn();

vi.mock("../services/api", () => ({
  getStoredUser: () => ({ first_name: "John", last_name: "Merchant", role: "superuser" }),
  logoutSession: vi.fn(),
  reportApi: {
    merchantDashboard: (...args) => mockMerchantDashboard(...args),
  },
  usersApi: {
    createAdminInvite: (...args) => mockCreateInvite(...args),
    setActive: vi.fn(),
    remove: vi.fn(),
  },
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("Merchant dashboard actions", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockCreateInvite.mockReset();
    mockMerchantDashboard.mockReset();
    mockMerchantDashboard.mockResolvedValue({
      data: {
        stats: { active_stores: 1, active_admins: 1, total_products: 2, estimated_revenue: 2000 },
        performance: [],
        payment_summary: { paid_amount: 1000, unpaid_amount: 500, paid_percentage: 66.7, unpaid_percentage: 33.3 },
        stores: [{ id: 1, name: "Downtown", location: "Nairobi", admin_name: "Jane Admin", status: "Active", sales_total: 2000, paid_total: 1200, unpaid_total: 800 }],
        admins: [{ id: 2, name: "Jane Admin", email: "jane@myduka.com", store: "Downtown", status: "Active" }],
      },
    });
    mockCreateInvite.mockResolvedValue({
      data: { invite_link: "http://localhost:5173/?invite_token=abc" },
    });
  });

  it("creates admin invite link", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <MerchantDashboard />
      </MemoryRouter>
    );

    await waitFor(() => expect(mockMerchantDashboard).toHaveBeenCalled());
    await user.type(screen.getByPlaceholderText("new-admin@myduka.com"), "newadmin@myduka.com");
    await user.click(screen.getByRole("button", { name: "Create Invite" }));

    await waitFor(() => {
      expect(mockCreateInvite).toHaveBeenCalled();
    });
  });
});
