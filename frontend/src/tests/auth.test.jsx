import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Login from "../pages/Login.jsx";

const mockNavigate = vi.fn();

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
  });

  it("routes admin credentials to /admin", async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.type(
      screen.getByPlaceholderText("you@example.com"),
      "admin@myduka.com"
    );
    await user.type(screen.getByPlaceholderText("••••••••"), "admin123");
    await user.click(screen.getByRole("button", { name: "Log In" }));

    expect(mockNavigate).toHaveBeenCalledWith("/admin");
  });

  it("routes merchant credentials to /merchant", async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.type(
      screen.getByPlaceholderText("you@example.com"),
      "merchant@myduka.com"
    );
    await user.type(screen.getByPlaceholderText("••••••••"), "merchant123");
    await user.click(screen.getByRole("button", { name: "Log In" }));

    expect(mockNavigate).toHaveBeenCalledWith("/merchant");
  });

  it("routes clerk credentials to /clerk", async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.type(
      screen.getByPlaceholderText("you@example.com"),
      "clerk@myduka.com"
    );
    await user.type(screen.getByPlaceholderText("••••••••"), "clerk123");
    await user.click(screen.getByRole("button", { name: "Log In" }));

    expect(mockNavigate).toHaveBeenCalledWith("/clerk");
  });

  it("shows validation error for invalid credentials", async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByPlaceholderText("you@example.com"), "bad@user");
    await user.type(screen.getByPlaceholderText("••••••••"), "wrongpass");
    await user.click(screen.getByRole("button", { name: "Log In" }));

    expect(
      screen.getByText("Invalid email or password. Try the demo credentials.")
    ).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
