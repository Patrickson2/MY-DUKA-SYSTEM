import axios from "axios";

const ACCESS_TOKEN_KEY = "myduka_access_token";
const REFRESH_TOKEN_KEY = "myduka_refresh_token";
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
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getStoredRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
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

export function saveAuthSession(accessToken, user, refreshToken = null) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuthSession() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function logoutSession() {
  const refreshToken = getStoredRefreshToken();
  if (refreshToken) {
    try {
      await authApi.logout(refreshToken);
    } catch {
      // Ignore logout API errors and clear local session anyway.
    }
  }
  clearAuthSession();
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
  registerAdminFromInvite(payload) {
    return api.post("/api/auth/admin-invite/register", payload);
  },
  me() {
    return api.get("/api/auth/me");
  },
  logout(refreshToken) {
    return api.post("/api/auth/logout", { refresh_token: refreshToken });
  },
};

export const reportApi = {
  adminDashboard() {
    return api.get("/api/reports/admin/dashboard");
  },
  clerkDashboard() {
    return api.get("/api/reports/clerk/dashboard");
  },
  merchantDashboard() {
    return api.get("/api/reports/merchant/dashboard");
  },
};

export const usersApi = {
  list(params = {}) {
    return api.get("/api/users", { params });
  },
  create(payload) {
    return api.post("/api/users/create", payload);
  },
  setActive(userId, isActive) {
    return api.patch(`/api/users/${userId}/deactivate`, { is_active: isActive });
  },
  remove(userId) {
    return api.delete(`/api/users/${userId}`);
  },
  createAdminInvite(payload) {
    return api.post("/api/users/admin-invites", payload);
  },
};

export const storesApi = {
  list(params = {}) {
    return api.get("/api/stores", { params });
  },
};

export const productsApi = {
  list(params = {}) {
    return api.get("/api/products", { params });
  },
  create(payload) {
    return api.post("/api/products", payload);
  },
};

export const inventoryApi = {
  create(payload) {
    return api.post("/api/inventory", payload);
  },
  update(inventoryId, payload) {
    return api.put(`/api/inventory/${inventoryId}`, payload);
  },
  remove(inventoryId) {
    return api.delete(`/api/inventory/${inventoryId}`);
  },
  updatePaymentStatus(inventoryId, paymentStatus) {
    return api.patch(`/api/inventory/${inventoryId}/payment-status`, {
      payment_status: paymentStatus,
    });
  },
};

export const supplyRequestsApi = {
  list(params = {}) {
    return api.get("/api/supply-requests", { params });
  },
  create(payload) {
    return api.post("/api/supply-requests", payload);
  },
  approve(requestId, adminNotes = "") {
    return api.post(`/api/supply-requests/${requestId}/approve`, {
      admin_notes: adminNotes,
    });
  },
  decline(requestId, adminNotes) {
    return api.post(`/api/supply-requests/${requestId}/decline`, {
      admin_notes: adminNotes,
    });
  },
};
