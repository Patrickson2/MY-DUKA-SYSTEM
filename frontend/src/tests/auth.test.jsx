import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Login from "../pages/Login.jsx";

const mockNavigate = vi.fn();
const mockLogin = vi.fn();
const mockSaveAuthSession = vi.fn();

vi.mock("../services/api", () => ({
  authApi: {
    login: (...args) => mockLogin(...args),
  },
  getDashboardRoute: (role) => {
    if (role === "superuser" || role === "merchant") return "/merchant";
    if (role === "admin") return "/admin";
    if (role === "clerk") return "/clerk";
    return "/";
  },
  saveAuthSession: (...args) => mockSaveAuthSession(...args),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderLogin() {
  return render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  );
}

describe("Login role-based auth", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockLogin.mockReset();
    mockSaveAuthSession.mockReset();
  });

  it("routes admin credentials to /admin", async () => {
    const user = userEvent.setup();
    renderLogin();
    mockLogin.mockResolvedValue({
      data: {
        access_token: "admin-token",
        user: { role: "admin" },
      },
    });

    await user.type(
      screen.getByPlaceholderText("you@example.com"),
      "admin@myduka.com"
    );
    await user.type(screen.getByPlaceholderText("••••••••"), "admin123");
    await user.click(screen.getByRole("button", { name: "Log In" }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/admin", { replace: true });
    });
  });

  it("routes merchant credentials to /merchant", async () => {
    const user = userEvent.setup();
    renderLogin();
    mockLogin.mockResolvedValue({
      data: {
        access_token: "merchant-token",
        user: { role: "superuser" },
      },
    });

    await user.type(
      screen.getByPlaceholderText("you@example.com"),
      "merchant@myduka.com"
    );
    await user.type(screen.getByPlaceholderText("••••••••"), "merchant123");
    await user.click(screen.getByRole("button", { name: "Log In" }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/merchant", { replace: true });
    });
  });

  it("routes clerk credentials to /clerk", async () => {
    const user = userEvent.setup();
    renderLogin();
    mockLogin.mockResolvedValue({
      data: {
        access_token: "clerk-token",
        user: { role: "clerk" },
      },
    });

    await user.type(
      screen.getByPlaceholderText("you@example.com"),
      "clerk@myduka.com"
    );
    await user.type(screen.getByPlaceholderText("••••••••"), "clerk123");
    await user.click(screen.getByRole("button", { name: "Log In" }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/clerk", { replace: true });
    });
  });

  it("shows backend error for invalid credentials", async () => {
    const user = userEvent.setup();
    renderLogin();
    mockLogin.mockRejectedValue({
      response: { data: { detail: "Invalid email or password" } },
    });

    await user.type(screen.getByPlaceholderText("you@example.com"), "bad@user");
    await user.type(screen.getByPlaceholderText("••••••••"), "wrongpass");
    await user.click(screen.getByRole("button", { name: "Log In" }));

    expect(screen.getByText("Invalid email or password")).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
