import axios from "axios";

const TOKEN_KEY = "myduka_access_token";
const USER_KEY = "myduka_user";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000",
  headers: {
    "Content-Type": "application/json",
  },
});

export function normalizeRole(role) {
  if (role === "superuser") {
    return "merchant";
  }
  return role;
}

export function getDashboardRoute(role) {
  const normalizedRole = normalizeRole(role);
  const roleRouteMap = {
    admin: "/admin",
    clerk: "/clerk",
    merchant: "/merchant",
  };
  return roleRouteMap[normalizedRole] || "/";
}

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser() {
  const stored = localStorage.getItem(USER_KEY);
  if (!stored) {
    return null;
  }
  try {
    return JSON.parse(stored);
  } catch {
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

export function saveAuthSession(accessToken, user) {
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuthSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authApi = {
  login(email, password) {
    return api.post("/api/auth/login", { email, password });
  },
  me() {
    return api.get("/api/auth/me");
  },
};
