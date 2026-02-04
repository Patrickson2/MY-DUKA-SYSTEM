import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Dashboard from "../pages/Dashboard.jsx";

const mockNavigate = vi.fn();
const mockClerkDashboard = vi.fn();
const mockProductsList = vi.fn();
const mockStoresList = vi.fn();
const mockSupplyList = vi.fn();
const mockInventoryCreate = vi.fn();
const mockSupplyCreate = vi.fn();
const mockProductsCreate = vi.fn();

vi.mock("../services/api", () => ({
  getStoredUser: () => ({ first_name: "Mike", last_name: "Clerk", role: "clerk", store_id: 1 }),
  logoutSession: vi.fn(),
  reportApi: {
    clerkDashboard: (...args) => mockClerkDashboard(...args),
  },
  productsApi: {
    list: (...args) => mockProductsList(...args),
    create: (...args) => mockProductsCreate(...args),
  },
  storesApi: {
    list: (...args) => mockStoresList(...args),
  },
  supplyRequestsApi: {
    list: (...args) => mockSupplyList(...args),
    create: (...args) => mockSupplyCreate(...args),
  },
  inventoryApi: {
    create: (...args) => mockInventoryCreate(...args),
    update: vi.fn(),
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

function seedDashboardCalls() {
  mockClerkDashboard.mockResolvedValue({
    data: {
      stats: { total_products: 0, total_stock: 0, spoilt_items: 0 },
      products: [],
    },
  });
  mockProductsList.mockResolvedValue({
    data: [{ id: 1, name: "Rice - 5kg" }],
  });
  mockStoresList.mockResolvedValue({
    data: [{ id: 1, name: "Downtown" }],
  });
  mockSupplyList.mockResolvedValue({ data: [] });
}

describe("Clerk dashboard actions", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockClerkDashboard.mockReset();
    mockProductsList.mockReset();
    mockStoresList.mockReset();
    mockSupplyList.mockReset();
    mockInventoryCreate.mockReset();
    mockSupplyCreate.mockReset();
    mockProductsCreate.mockReset();
    seedDashboardCalls();
  });

  it("submits inventory record", async () => {
    const user = userEvent.setup();
    mockInventoryCreate.mockResolvedValue({ data: {} });

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => expect(mockClerkDashboard).toHaveBeenCalled());

    await user.type(screen.getByPlaceholderText("e.g. Rice - 5kg"), "Rice - 5kg");
    await user.type(screen.getByPlaceholderText("e.g. Grains"), "Grains");
    await user.type(screen.getByPlaceholderText("e.g. 100"), "120");
    await user.type(screen.getByPlaceholderText("e.g. 80"), "100");
    await user.clear(screen.getByPlaceholderText("e.g. 2"));
    await user.type(screen.getByPlaceholderText("e.g. 2"), "1");
    await user.type(screen.getByPlaceholderText("e.g. 450"), "450");
    await user.type(screen.getByPlaceholderText("e.g. 600"), "650");

    await user.click(screen.getByRole("button", { name: "Record Inventory" }));

    await waitFor(() => {
      expect(mockInventoryCreate).toHaveBeenCalled();
    });
    expect(mockProductsCreate).not.toHaveBeenCalled();
  });

  it("submits supply request", async () => {
    const user = userEvent.setup();
    mockSupplyCreate.mockResolvedValue({ data: {} });

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => expect(mockClerkDashboard).toHaveBeenCalled());

    await user.click(screen.getByRole("button", { name: /Request Supply/i }));

    const selects = screen.getAllByRole("combobox");
    await user.selectOptions(selects[0], "1");
    await user.type(screen.getByPlaceholderText("e.g. 50"), "20");
    await user.type(screen.getByPlaceholderText("Why restock is needed"), "Stock is low");
    await user.click(screen.getByRole("button", { name: "Submit Supply Request" }));

    await waitFor(() => {
      expect(mockSupplyCreate).toHaveBeenCalled();
    });
  });
});
