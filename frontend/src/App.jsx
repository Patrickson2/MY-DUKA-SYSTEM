import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import Login from "./pages/Login.jsx";
import AdminPanel from "./pages/AdminPanel.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import MerchantDashboard from "./pages/MerchantDashboard.jsx";
import {
  authApi,
  clearAuthSession,
  getDashboardRoute,
  getStoredToken,
  getStoredUser,
  normalizeRole,
  saveAuthSession,
} from "./services/api";

function ProtectedRoute({ allowedRoles, children }) {
  const token = getStoredToken();
  const user = getStoredUser();

  if (!token || !user) {
    return <Navigate to="/" replace />;
  }

  const userRole = normalizeRole(user.role);
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <Navigate to={getDashboardRoute(userRole)} replace />;
  }

  return children;
}

export default function App() {
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let isActive = true;
    const token = getStoredToken();

    if (!token) {
      setIsRestoringSession(false);
      return undefined;
    }

    authApi
      .me()
      .then((response) => {
        if (!isActive) {
          return;
        }
        const user = response.data;
        saveAuthSession(token, user);
        if (location.pathname === "/") {
          navigate(getDashboardRoute(user.role), { replace: true });
        }
      })
      .catch(() => {
        if (!isActive) {
          return;
        }
        clearAuthSession();
        if (location.pathname !== "/") {
          navigate("/", { replace: true });
        }
      })
      .finally(() => {
        if (isActive) {
          setIsRestoringSession(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [location.pathname, navigate]);

  if (isRestoringSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0F172A] text-[#E2E8F0]">
        Restoring session...
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminPanel />
          </ProtectedRoute>
        }
      />
      <Route
        path="/clerk"
        element={
          <ProtectedRoute allowedRoles={["clerk"]}>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/merchant"
        element={
          <ProtectedRoute allowedRoles={["merchant"]}>
            <MerchantDashboard />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
