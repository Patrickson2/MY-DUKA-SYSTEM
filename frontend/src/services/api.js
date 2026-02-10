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
  registerMerchant(payload) {
    return api.post("/api/auth/register", payload);
  },
  forgotPassword(email) {
    return api.post("/api/auth/forgot-password", { email });
  },
  resetPassword(token, newPassword) {
    return api.post("/api/auth/reset-password", {
      token,
      new_password: newPassword,
    });
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
  clerkOverview(lite = false) {
    return api.get("/api/reports/clerk/overview", {
      params: { lite },
    });
  },
  merchantDashboard() {
    return api.get("/api/reports/merchant/dashboard");
  },
};

export const notificationsApi = {
  list(params = {}) {
    return api.get("/api/notifications/", { params });
  },
  unreadCount() {
    return api.get("/api/notifications/unread-count");
  },
  markRead(notificationId) {
    return api.patch(`/api/notifications/${notificationId}/read`);
  },
  markAllRead() {
    return api.patch("/api/notifications/read-all");
  },
};

export const messagesApi = {
  recipients() {
    return api.get("/api/messages/recipients");
  },
  send(payload) {
    return api.post("/api/messages", payload);
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
    return api.get("/api/stores/", { params });
  },
  create(payload) {
    return api.post("/api/stores/", payload);
  },
  remove(storeId) {
    return api.delete(`/api/stores/${storeId}`);
  },
};

export const productsApi = {
  list(params = {}) {
    return api.get("/api/products/", { params });
  },
  create(payload) {
    return api.post("/api/products", payload);
  },
};

export const inventoryApi = {
  list(params = {}) {
    return api.get("/api/inventory/", { params });
  },
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
    return api.get("/api/supply-requests/", { params });
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

export const suppliersApi = {
  list(params = {}) {
    return api.get("/api/suppliers/", { params });
  },
  create(payload) {
    return api.post("/api/suppliers", payload);
  },
  update(supplierId, payload) {
    return api.put(`/api/suppliers/${supplierId}`, payload);
  },
  remove(supplierId) {
    return api.delete(`/api/suppliers/${supplierId}`);
  },
};

export const purchaseOrdersApi = {
  list(params = {}) {
    return api.get("/api/purchase-orders/", { params });
  },
  create(payload) {
    return api.post("/api/purchase-orders", payload);
  },
  get(orderId) {
    return api.get(`/api/purchase-orders/${orderId}`);
  },
  updateStatus(orderId, payload) {
    return api.post(`/api/purchase-orders/${orderId}/status`, payload);
  },
};

export const transfersApi = {
  list(params = {}) {
    return api.get("/api/stock-transfers/", { params });
  },
  create(payload) {
    return api.post("/api/stock-transfers", payload);
  },
  updateStatus(transferId, payload) {
    return api.post(`/api/stock-transfers/${transferId}/status`, payload);
  },
};

export const returnsApi = {
  list(params = {}) {
    return api.get("/api/returns/", { params });
  },
  create(payload) {
    return api.post("/api/returns", payload);
  },
  updateStatus(returnId, payload) {
    return api.post(`/api/returns/${returnId}/status`, payload);
  },
};

export const salesApi = {
  list(params = {}) {
    return api.get("/api/sales/", { params });
  },
  create(payload) {
    return api.post("/api/sales", payload);
  },
};

export const expensesApi = {
  list(params = {}) {
    return api.get("/api/expenses/", { params });
  },
  create(payload) {
    return api.post("/api/expenses", payload);
  },
};

export const analyticsApi = {
  storePerformance(params = {}) {
    return api.get("/api/analytics/store-performance", { params });
  },
  topProducts(params = {}) {
    return api.get("/api/analytics/top-products", { params });
  },
  slowMovers(params = {}) {
    return api.get("/api/analytics/slow-movers", { params });
  },
  paymentTrend(params = {}) {
    return api.get("/api/analytics/payment-trend", { params });
  },
  financialSummary() {
    return api.get("/api/analytics/financial-summary");
  },
  expensesByCategory() {
    return api.get("/api/analytics/expenses-by-category");
  },
  salesTrend(params = {}) {
    return api.get("/api/analytics/sales-trend", { params });
  },
};
